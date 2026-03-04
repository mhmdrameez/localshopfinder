import { NextResponse } from 'next/server';
import { startSocketServer, getSocketUrl } from '@/lib/socketServer';

export async function GET() {
    try {
        startSocketServer();
        return NextResponse.json({ success: true, socketUrl: getSocketUrl() }, { status: 200 });
    } catch (error) {
        console.error('Socket init error:', error);
        return NextResponse.json({ error: 'Failed to initialize socket server' }, { status: 500 });
    }
}

