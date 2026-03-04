import { NextResponse } from 'next/server';

function generateRandomOffset(base: number, maxOffsetMeters: number) {
    // 1 degree latitude is approx 111km.
    const maxOffsetDegrees = (maxOffsetMeters / 111000);
    // Random between -maxOffsetDegrees and +maxOffsetDegrees
    return base + (Math.random() - 0.5) * 2 * maxOffsetDegrees;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All';
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius') || '1000';

    // Default to Hyderabad if not provided
    const lat = latParam ? parseFloat(latParam) : 17.3850;
    const lng = lngParam ? parseFloat(lngParam) : 78.4867;
    const radius = parseInt(radiusParam, 10);

    // Generate dynamic mock shops around the user
    // We spread them within the requested radius so some are close, some are far
    const shopsDb = [
        { id: '1', name: 'Sri Venkateshwara Kirana', category: 'Kirana', rating: 3.8, reviews: 12, hasPhone: false, isClaimed: false, lat: generateRandomOffset(lat, radius), lng: generateRandomOffset(lng, radius) },
        { id: '2', name: 'Apollo Pharmacy', category: 'Medical', rating: 4.5, reviews: 342, hasPhone: true, isClaimed: true, lat: generateRandomOffset(lat, radius * 0.5), lng: generateRandomOffset(lng, radius * 0.5) },
        { id: '3', name: 'Mona Bakery', category: 'Bakery', rating: 0, reviews: 0, hasPhone: false, isClaimed: false, lat: generateRandomOffset(lat, radius * 0.8), lng: generateRandomOffset(lng, radius * 0.8) },
        { id: '4', name: 'Rapid Mobile Repair', category: 'Service', rating: 4.1, reviews: 45, hasPhone: true, isClaimed: false, lat: generateRandomOffset(lat, radius), lng: generateRandomOffset(lng, radius) },
        { id: '5', name: 'Gupta Sweets & Snacks', category: 'Bakery', rating: 3.5, reviews: 8, hasPhone: false, isClaimed: false, lat: generateRandomOffset(lat, radius * 0.3), lng: generateRandomOffset(lng, radius * 0.3) },
        { id: '6', name: 'Fresh Fruits Market', category: 'Kirana', rating: 4.8, reviews: 120, hasPhone: true, isClaimed: true, lat: generateRandomOffset(lat, radius), lng: generateRandomOffset(lng, radius) },
        { id: '7', name: 'Daily Needs Store', category: 'Kirana', rating: 3.2, reviews: 5, hasPhone: false, isClaimed: false, lat: generateRandomOffset(lat, radius * 0.9), lng: generateRandomOffset(lng, radius * 0.9) },
    ];

    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Filter by radius and assign readable distance
    let results = shopsDb.filter(shop => {
        const dist = getDistance(lat, lng, shop.lat, shop.lng);
        return dist <= radius;
    }).map(shop => {
        const dist = getDistance(lat, lng, shop.lat, shop.lng);
        return {
            ...shop,
            distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`
        };
    });

    if (category !== 'All') {
        results = results.filter(s => s.category === category);
    }

    // Apply logic to score/flag under-optimized businesses
    const enrichedResults = results.map(shop => {
        const issues = [];
        if (shop.rating > 0 && shop.rating < 4.0) issues.push('Low Rating');
        if (shop.reviews === 0) issues.push('No Reviews');
        if (shop.reviews > 0 && shop.reviews < 20) issues.push('Few Reviews');

        return { ...shop, issues };
    });

    // Sort: Put under-optimized at the top
    enrichedResults.sort((a, b) => {
        const aScore = (!a.hasPhone ? 1 : 0) + (!a.isClaimed ? 1 : 0) + a.issues.length;
        const bScore = (!b.hasPhone ? 1 : 0) + (!b.isClaimed ? 1 : 0) + b.issues.length;
        return bScore - aScore;
    });

    return NextResponse.json({ shops: enrichedResults });
}
