import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        const { matchIds, messages } = await request.json();
        if (!Array.isArray(matchIds) || !Array.isArray(messages) || matchIds.length === 0 || messages.length === 0) {
            return NextResponse.json({ success: false, message: 'Thiếu dữ liệu' });
        }
        const results = [];
        for (const matchId of matchIds) {
            try {
                // Lấy tên người nhận để hiển thị kết quả
                let name = matchId;
                try {
                    const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                    const info = await axios({
                        method: 'get',
                        url: `https://api.gotinder.com/user/matches/${matchId}?locale=vi`,
                        headers: getTinderHeaders()
                    });
                    if (info.data && info.data.results && info.data.results.person && info.data.results.person.name) {
                        name = info.data.results.person.name;
                    }
                } catch {}
                const msg = messages[Math.floor(Math.random() * messages.length)];
                const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                const headers = {
                    ...getTinderHeaders(),
                    'content-type': 'application/json'
                };
                await axios({
                    method: 'post',
                    url: `https://api.gotinder.com/user/matches/${matchId}?locale=vi`,
                    headers,
                    data: { message: msg }
                });
                results.push({ matchId, name, success: true });
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error: any) {
                results.push({ matchId, name, success: false, error: error.message });
            }
        }
        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Lỗi server', error: error.message });
    }
}
