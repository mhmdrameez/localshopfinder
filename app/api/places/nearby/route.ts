import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { sendBilledHitChargeEmail } from '@/lib/mailer';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const HIT_CHARGE_RS = Number(process.env.BILLED_HIT_CHARGE_RS || 2);
const UPI_ID_RAW = process.env.BILLING_UPI_ID || 'localshopfinder@oksbi';
const UPI_PAYEE_NAME = process.env.BILLING_UPI_NAME || 'Local Shop Finder';
const APP_BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

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
// L1 per-place details cache (phone/website) — survives across requests within same process
const detailsCache = new Map<string, { phone: string | null; website: string | null }>();

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

type ActorInfo = {
    subjectType: 'user' | 'admin';
    subjectKey: string;
    appUserId: string | null;
    email: string | null;
};

function getValidUpiId(input: string) {
    const value = String(input || '').trim();
    const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;
    if (upiRegex.test(value)) return value;
    return 'localshopfinder@oksbi';
}

function buildPayBridgeUrl(mode: 'gpay' | 'upi', params: Record<string, string>) {
    if (!APP_BASE_URL) return '';
    const url = new URL('/api/pay/upi', APP_BASE_URL);
    url.searchParams.set('mode', mode);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
}

async function getActorFromRequest(): Promise<ActorInfo | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const { payload } = await jose.jwtVerify(token, secret);

        if (payload.role === 'admin') {
            const adminEmail = String(payload.email || process.env.ADMIN_EMAIL || 'admin@localshopfinder.com');
            return {
                subjectType: 'admin',
                subjectKey: `admin:${adminEmail}`,
                appUserId: null,
                email: adminEmail,
            };
        }

        if (payload.role === 'user' && payload.id) {
            return {
                subjectType: 'user',
                subjectKey: `user:${String(payload.id)}`,
                appUserId: String(payload.id),
                email: payload.email ? String(payload.email) : null,
            };
        }

        return null;
    } catch {
        return null;
    }
}

async function recordL3CacheHit(cacheKey: string) {
    if (!supabaseAdmin) return;

    try {
        const actor = await getActorFromRequest();
        if (!actor) return;

        const { data: existing } = await withTimeout(
            supabaseAdmin
                .from('cache_l3_hits')
                .select('l3_hit_count')
                .eq('subject_key', actor.subjectKey)
                .maybeSingle(),
            2500
        );

        const nextHitCount = Number(existing?.l3_hit_count || 0) + 1;

        await withTimeout(
            supabaseAdmin
                .from('cache_l3_hits')
                .upsert({
                    subject_type: actor.subjectType,
                    subject_key: actor.subjectKey,
                    app_user_id: actor.appUserId,
                    subject_email: actor.email,
                    l3_hit_count: nextHitCount,
                    last_cache_key: cacheKey,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'subject_key' }),
            3000
        );
    } catch (error: any) {
        console.log(`[L3 Hit Tracking] skipped: ${error?.message || 'unknown error'}`);
    }
}

async function recordBilledHit(cacheKey: string): Promise<number | null> {
    if (!supabaseAdmin) return null;

    try {
        const actor = await getActorFromRequest();
        if (!actor) return null;

        const { data: existing } = await withTimeout(
            supabaseAdmin
                .from('cache_l3_hits')
                .select('l3_hit_count, billed_hit_count')
                .eq('subject_key', actor.subjectKey)
                .maybeSingle(),
            2500
        );

        const currentL3 = Number(existing?.l3_hit_count || 0);
        const nextBilled = Number(existing?.billed_hit_count || 0) + 1;

        await withTimeout(
            supabaseAdmin
                .from('cache_l3_hits')
                .upsert({
                    subject_type: actor.subjectType,
                    subject_key: actor.subjectKey,
                    app_user_id: actor.appUserId,
                    subject_email: actor.email,
                    l3_hit_count: currentL3,
                    billed_hit_count: nextBilled,
                    last_cache_key: cacheKey,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'subject_key' }),
            3000
        );

        if (actor.email) {
            const upiId = getValidUpiId(UPI_ID_RAW);
            const totalAmount = Number((nextBilled * HIT_CHARGE_RS).toFixed(2));
            const txnNote = `Local Shop Finder billed hit #${nextBilled}`;
            const payParams = {
                pa: upiId,
                pn: UPI_PAYEE_NAME,
                am: totalAmount.toFixed(2),
                cu: 'INR',
                tn: txnNote,
            };
            const upiQuery = new URLSearchParams(payParams).toString();
            const upiLink = `upi://pay?${upiQuery}`;
            const gpayIntentLink = `intent://upi/pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
            const gpayBridgeLink = buildPayBridgeUrl('gpay', payParams) || gpayIntentLink;
            const upiBridgeLink = buildPayBridgeUrl('upi', payParams) || upiLink;

            try {
                await sendBilledHitChargeEmail(actor.email, nextBilled, HIT_CHARGE_RS, gpayBridgeLink, upiBridgeLink, upiLink);
            } catch (mailError) {
                console.log('[Billed Hit Email] failed', mailError);
            }
        }

        return nextBilled;
    } catch (error: any) {
        console.log(`[Billed Hit Tracking] skipped: ${error?.message || 'unknown error'}`);
        return null;
    }
}

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
                    const cachedRedisStr = await withTimeout(redis.get(cacheKey), 2500);
                    if (cachedRedisStr) {
                        const cachedRedis = typeof cachedRedisStr === 'string' ? JSON.parse(cachedRedisStr) : cachedRedisStr;
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
                            try { await withTimeout(redis.setex(cacheKey, 2592000, JSON.stringify(cachedData.shops_data)), 2000); } catch (e) { }
                        }
                        await recordL3CacheHit(cacheKey);
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

        // Helper: detect category from Google place types
        function detectCategory(types: string[]): string {
            if (!types || types.length === 0) return 'Local Business';
            const t = types.map((s: string) => s.toLowerCase());
            if (t.some((x: string) => ['pharmacy', 'drugstore', 'hospital', 'doctor', 'dentist', 'health'].includes(x))) return 'Medical';
            if (t.some((x: string) => ['bakery'].includes(x))) return 'Bakery';
            if (t.some((x: string) => ['grocery_or_supermarket', 'supermarket', 'convenience_store'].includes(x))) return 'Kirana';
            if (t.some((x: string) => ['car_repair', 'electrician', 'plumber', 'locksmith', 'painter', 'roofing_contractor', 'moving_company'].includes(x))) return 'Service';
            return 'Local Business';
        }

        // Fetch details for each place — uses 3-tier cache per place_id to minimize Google billing
        // L1: detailsCache (in-memory per place_id)
        // L2: Redis (detail:{placeId} key, TTL 90 days)
        // L3: Google Place Details API (only if L1+L2 miss)
        const detailsMap = new Map<string, { phone: string | null; website: string | null }>();
        const placeIds = apiResults.map((p: any) => p.place_id).filter(Boolean);
        const uncachedIds: string[] = [];

        // Step 1: Check L1 RAM cache for each place
        for (const pid of placeIds) {
            if (detailsCache.has(pid)) {
                detailsMap.set(pid, detailsCache.get(pid)!);
            } else {
                uncachedIds.push(pid);
            }
        }

        // Step 2: Check L2 Redis for remaining uncached places
        const stillUncached: string[] = [];
        if (redis && uncachedIds.length > 0) {
            try {
                const redisKeys = uncachedIds.map(pid => `detail:${pid}`);
                const redisValues = await withTimeout(redis.mget(...redisKeys), 3000);
                for (let i = 0; i < uncachedIds.length; i++) {
                    const val = redisValues[i];
                    if (val) {
                        const parsed = JSON.parse(val);
                        detailsMap.set(uncachedIds[i], parsed);
                        detailsCache.set(uncachedIds[i], parsed); // Populate L1
                    } else {
                        stillUncached.push(uncachedIds[i]);
                    }
                }
            } catch (e) {
                console.log('[Details Cache] Redis mget failed, falling back to API');
                stillUncached.push(...uncachedIds);
            }
        } else {
            stillUncached.push(...uncachedIds);
        }

        // Step 3: Only call Google Place Details API for truly uncached places
        console.log(`[Details] L1/L2 hits: ${placeIds.length - stillUncached.length}, API calls needed: ${stillUncached.length}`);
        const batchSize = 5;
        for (let i = 0; i < stillUncached.length; i += batchSize) {
            const batch = stillUncached.slice(i, i + batchSize);
            const detailsResults = await Promise.allSettled(
                batch.map(async (placeId: string) => {
                    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website&key=${GOOGLE_API_KEY}`;
                    const res = await fetch(detailUrl);
                    const json = await res.json();
                    return { placeId, result: json.result || {} };
                })
            );
            for (const r of detailsResults) {
                if (r.status === 'fulfilled') {
                    const detail = {
                        phone: r.value.result.formatted_phone_number || null,
                        website: r.value.result.website || null,
                    };
                    detailsMap.set(r.value.placeId, detail);
                    // Save to L1 RAM
                    detailsCache.set(r.value.placeId, detail);
                    // Save to L2 Redis (90 days TTL — shop details rarely change)
                    if (redis) {
                        try { redis.setex(`detail:${r.value.placeId}`, 7776000, JSON.stringify(detail)); } catch (e) { }
                    }
                }
            }
        }

        let formattedShops = apiResults.map((place: any) => {
            const dist = getDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
            const details = detailsMap.get(place.place_id);
            const hasPhone = !!(details?.phone);
            const hasWebsite = !!(details?.website);
            const shopCategory = category !== 'All' ? category : detectCategory(place.types || []);

            const issues: string[] = [];
            if (place.rating > 0 && place.rating < 4.0) issues.push('Low Rating');
            if (!place.user_ratings_total || place.user_ratings_total === 0) issues.push('No Reviews');
            if (!hasPhone) issues.push('No Phone');
            if (!hasWebsite) issues.push('No Website');

            return {
                id: place.place_id || Math.random().toString(),
                name: place.name || 'Unknown Shop',
                category: shopCategory,
                rating: place.rating || 0,
                reviews: place.user_ratings_total || 0,
                hasPhone,
                hasWebsite,
                isClaimed: false,
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
                rawDistanceNum: dist,
                issues,
            };
        });

        formattedShops = formattedShops.filter((shop: any) => shop.rawDistanceNum <= radius);
        formattedShops.sort((a: any, b: any) => a.rawDistanceNum - b.rawDistanceNum);
        formattedShops = formattedShops.map(({ rawDistanceNum, ...shop }: any) => shop);

        // Save back into Caches
        memoryCache.set(cacheKey, formattedShops);

        if (redis) {
            try {
                await withTimeout(redis.setex(cacheKey, 2592000, JSON.stringify(formattedShops)), 2000);
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

        const billedCount = await recordBilledHit(cacheKey);
        return NextResponse.json({ shops: formattedShops, source: 'live_google', billedCount });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
