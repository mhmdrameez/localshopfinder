import { NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All';
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius') || '1000';

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API key is missing' }, { status: 500 });
    }

    const lat = latParam ? parseFloat(latParam) : 17.3850;
    const lng = lngParam ? parseFloat(lngParam) : 78.4867;
    const radius = parseInt(radiusParam, 10);

    // Map frontend categories to Google Places API keywords
    let keyword = '';
    switch (category) {
        case 'Kirana':
            keyword = 'grocery supermarket kirana store';
            break;
        case 'Medical':
            keyword = 'pharmacy chemist medical store clinic';
            break;
        case 'Bakery':
            keyword = 'bakery sweet shop';
            break;
        case 'Service':
            keyword = 'repair fixing service center plumber electrician';
            break;
        case 'All':
        default:
            keyword = 'store shop business';
            break;
    }

    try {
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
                category: category === 'All' ? 'Local Business' : category, // Assign requested category
                rating: place.rating || 0,
                reviews: place.user_ratings_total || 0,
                hasPhone: false, // Standard nearbysearch response doesn't give phone
                isClaimed: false,
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
                rawDistanceNum: dist, // used for sorting
                issues: [] // required by standard properties
            };
        });

        // Ensure we only return places actually within the requested radius
        formattedShops = formattedShops.filter((shop: any) => shop.rawDistanceNum <= radius);

        // Sort by distance locally just to ensure stable sorting for the UI
        formattedShops.sort((a: any, b: any) => a.rawDistanceNum - b.rawDistanceNum);

        // Clean up the temporary sort field
        formattedShops = formattedShops.map(({ rawDistanceNum, ...shop }: any) => shop);

        return NextResponse.json({ shops: formattedShops });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
