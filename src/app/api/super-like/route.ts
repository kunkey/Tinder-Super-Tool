import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const { userId, sNumber } = await request.json();
        if (!userId) return NextResponse.json({ success: false, message: 'Thiếu userId' });
        const response = await axios({
            method: 'get',
            url: `https://api.gotinder.com/like/${userId}?locale=vi&s_number=${sNumber}`,
            headers: getTinderHeaders()
        });
        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi super like:', error?.response?.data || error.message);
        return NextResponse.json({ success: false, message: error?.response?.data?.message || 'Lỗi server' });
    }
}
