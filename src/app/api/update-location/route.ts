import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const { lat, long } = await request.json();
        const headers = {
            ...getTinderHeaders(),
            'content-type': 'application/json'
        };

        const response = await axios({
            method: 'post',
            url: 'https://api.gotinder.com/v2/meta?locale=vi',
            headers,
            data: {
                lat,
                long,
                force_fetch_resources: true
            }
        });

        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi cập nhật vị trí:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
