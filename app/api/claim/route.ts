import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // In a real app, we would validate the input and save to a database.
        console.log('Received claim request:', body);

        return NextResponse.json({
            success: true,
            message: 'Claim request submitted successfully! We will contact you soon.'
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process claim' }, { status: 400 });
    }
}
