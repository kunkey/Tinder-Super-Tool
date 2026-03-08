import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const { matchId, message } = await request.json();
        const headers = {
            ...getTinderHeaders(),
            'content-type': 'application/json'
        };

        const response = await axios({
            method: 'post',
            url: `https://api.gotinder.com/user/matches/${matchId}?locale=vi`,
            headers,
            data: {
                message
            }
        });

        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi gửi tin nhắn:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
