import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function GET(request: NextRequest) {
    try {
        const response = await axios({
            method: 'get',
            url: `https://api.gotinder.com/v2/recs/core?locale=vi&duos=0`,
            headers: getTinderHeaders()
        });

        return NextResponse.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('Lỗi lấy recommendations:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
