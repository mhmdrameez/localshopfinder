import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Initialize Supabase Client safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Redis Client safely
const redisUrl = process.env.REDIS_CLOUD_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;
if (redis) {
    redis.on('error', (err) => {
        console.error('[Redis Client Error]', err.message);
    });
}

// Initialize L1 Memory Cache (resets on server restart/redeploy)
const memoryCache = new Map<string, any>();

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Timeout helper to prevent Supabase or Redis from hanging
const withTimeout = (promise: any, ms: number): Promise<any> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Error')), ms))
    ]);
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All';
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius') || '1000';
    const forceFetch = searchParams.get('forceFetch') === 'true';

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API key is missing' }, { status: 500 });
    }

    const lat = latParam ? parseFloat(latParam) : 17.3850;
    const lng = lngParam ? parseFloat(lngParam) : 78.4867;
    const radius = parseInt(radiusParam, 10);

    // Round lat/lng to ~100m precision (3 decimal places) to cache effectively globally
    const latRounded = lat.toFixed(3);
    const lngRounded = lng.toFixed(3);
    const cacheKey = `shops-${latRounded}-${lngRounded}-${radius}-${category}`;

    try {
        // Only check caches if we are not forcefully fetching
        if (!forceFetch) {
            // Level 1: Memory Cache (Instant local lookup)
            if (memoryCache.has(cacheKey)) {
                console.log(`[Cache Hit] L1 Memory Cache for ${cacheKey}`);
                return NextResponse.json({ shops: memoryCache.get(cacheKey), source: 'memory_cache' });
            }

            // Level 2: Redis Cache (Edge/Serverless fast lookup)
            if (redis) {
                try {
                    const cachedRedis = await withTimeout(redis.get(cacheKey), 2500);
                    if (cachedRedis) {
                        console.log(`[Cache Hit] L2 Redis Cache for ${cacheKey}`);
                        memoryCache.set(cacheKey, cachedRedis); // Populate L1
                        return NextResponse.json({ shops: cachedRedis, source: 'redis_cache' });
                    }
                } catch (e: any) {
                    console.log(`[Cache Miss/Error] Redis lookup failed: ${e.message}`);
                }
            }

            // Level 3: Supabase DB (Long-term persistent storage)
            if (supabase) {
                try {
                    const supQuery = supabase
                        .from('platform_searches')
                        .select('shops_data')
                        .eq('cache_key', cacheKey)
                        .single();

                    const { data: cachedData, error: cacheError } = await withTimeout(supQuery, 4000);

                    if (cachedData && cachedData.shops_data && !cacheError) {
                        console.log(`[Cache Hit] L3 Supabase DB for ${cacheKey}`);
                        // Populate upper caches for next time
                        memoryCache.set(cacheKey, cachedData.shops_data);
                        if (redis) {
                            try { await withTimeout(redis.setex(cacheKey, 86400, JSON.stringify(cachedData.shops_data)), 2000); } catch (e) { }
                        }
                        return NextResponse.json({ shops: cachedData.shops_data, source: 'supabase_cache' });
                    }
                } catch (e: any) {
                    console.log(`[Cache Miss/Error] Supabase fetch failed or timed out: ${e.message}`);
                }
            }
        }

        console.log(`[Cache Miss] Fetching LIVE from Google API for ${cacheKey}`);

        // Map frontend categories to Google Places API keywords
        let keyword = '';
        switch (category) {
            case 'Kirana': keyword = 'grocery supermarket kirana store'; break;
            case 'Medical': keyword = 'pharmacy chemist medical store clinic'; break;
            case 'Bakery': keyword = 'bakery sweet shop'; break;
            case 'Service': keyword = 'repair fixing service center plumber electrician'; break;
            case 'All':
            default: keyword = 'store shop business'; break;
        }

        const googleApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_API_KEY}`;

        const response = await fetch(googleApiUrl);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google API Error:', data);
            return NextResponse.json({ error: 'Failed to fetch places from Google' }, { status: 500 });
        }

        const apiResults = data.results || [];

        let formattedShops = apiResults.map((place: any) => {
            const dist = getDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);

            return {
                id: place.place_id || Math.random().toString(),
                name: place.name || 'Unknown Shop',
                category: category === 'All' ? 'Local Business' : category,
                rating: place.rating || 0,
                reviews: place.user_ratings_total || 0,
                hasPhone: false,
                hasWebsite: false, // The basic search gives limits
                isClaimed: false,
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
                rawDistanceNum: dist,
                issues: [] as string[]
            };
        });

        // Add issues based on basic metrics to power the map UI
        formattedShops = formattedShops.map((shop: any) => {
            const issues = [];
            if (shop.rating > 0 && shop.rating < 4.0) issues.push('Low Rating');
            if (shop.reviews === 0) issues.push('No Reviews');
            if (Math.random() > 0.5) { shop.hasWebsite = true; shop.hasPhone = true; } // Simulated details for basic tier
            if (!shop.hasPhone) issues.push('No Phone');
            if (!shop.hasWebsite) issues.push('No Website');
            return { ...shop, issues };
        });

        formattedShops = formattedShops.filter((shop: any) => shop.rawDistanceNum <= radius);
        formattedShops.sort((a: any, b: any) => a.rawDistanceNum - b.rawDistanceNum);
        formattedShops = formattedShops.map(({ rawDistanceNum, ...shop }: any) => shop);

        // Save back into Caches
        memoryCache.set(cacheKey, formattedShops);

        if (redis) {
            try {
                await withTimeout(redis.setex(cacheKey, 86400, JSON.stringify(formattedShops)), 2000);
            } catch (e) { console.log('Redis save failed', e); }
        }

        if (supabase) {
            try {
                await withTimeout(supabase.from('platform_searches').upsert({
                    cache_key: cacheKey,
                    shops_data: formattedShops,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'cache_key' }), 4000);
            } catch (e) { console.error("Supabase Save Error:", e); }
        }

        return NextResponse.json({ shops: formattedShops, source: 'live_google' });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
