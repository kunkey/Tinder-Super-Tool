import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, sNumber, fast_match, liked_content_id, liked_content_type } = body || {};
        if (!userId) return NextResponse.json({ success: false, message: 'Thiếu userId' });

        const headers = { ...getTinderHeaders(), 'content-type': 'application/json' };
        const baseUrl = `https://api.gotinder.com/like/${userId}?locale=vi`;

        if (fast_match && liked_content_id != null && liked_content_type != null) {
            const response = await axios({
                method: 'post',
                url: baseUrl,
                headers,
                data: { fast_match: 1, s_number: sNumber, liked_content_id, liked_content_type }
            });
            return NextResponse.json({ success: true, data: response.data });
        }

        const response = await axios({
            method: 'get',
            url: `${baseUrl}&s_number=${sNumber || ''}`,
            headers: getTinderHeaders()
        });
        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi like:', error?.response?.data || error.message);
        return NextResponse.json({ success: false, message: error?.response?.data?.message || 'Lỗi server' });
    }
}
