import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const { userId, fast_match, s_number } = await request.json();
        if (!userId) return NextResponse.json({ success: false, message: 'Thiếu userId' });

        const headers = {
            ...getTinderHeaders(),
            'cache-control': 'no-cache',
            'pragma': 'no-cache'
        };

        let url = `https://api.gotinder.com/pass/${userId}?locale=vi`;
        if (fast_match && s_number != null) {
            url += `&fast_match=1&s_number=${encodeURIComponent(String(s_number))}`;
        }

        const response = await axios({
            method: 'post',
            url,
            headers
        });
        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi dislike:', error?.response?.data || error.message);
        return NextResponse.json({ success: false, message: 'Lỗi khi dislike', error: error?.response?.data || error.message });
    }
}
