import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = searchParams.get('limit') || '60';
        const page_token = searchParams.get('page_token');

        const headers = {
            ...getTinderHeaders(),
            'cache-control': 'no-cache',
            'pragma': 'no-cache'
        };

        const response = await axios({
            method: 'get',
            url: `https://api.gotinder.com/v2/matches?locale=vi&count=${limit}&message=0&is_tinder_u=false${page_token ? `&page_token=${page_token}` : ''}`,
            headers
        });
        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi lấy matches:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
