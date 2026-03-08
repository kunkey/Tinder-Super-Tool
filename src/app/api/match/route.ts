import { NextRequest, NextResponse } from 'next/server';
import matchHandler from '@/utils/matchHandler';

export async function POST(request: NextRequest) {
    try {
        const { userId, action } = await request.json();
        const result = await matchHandler.processMatch(userId, action);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Lỗi xử lý match:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
