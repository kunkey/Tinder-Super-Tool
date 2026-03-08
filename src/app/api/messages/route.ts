import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';
import fs from 'fs';
import path from 'path';

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
            url: `https://api.gotinder.com/v2/matches?locale=vi&count=${limit}&message=1&is_tinder_u=false&include_conversations=true${page_token ? `&page_token=${encodeURIComponent(page_token)}` : ''}`,
            headers
        });
        const data = response.data;

        let meID: string | null = null;
        try {
            const authPath = path.join(process.cwd(), 'config', 'auth.json');
            if (fs.existsSync(authPath)) {
                const raw = fs.readFileSync(authPath, 'utf-8');
                const json = JSON.parse(raw);
                meID = json.meID || null;
            }
        } catch {
            meID = null;
        }

        if (meID && data?.data?.matches) {
            data.data.matches = data.data.matches.map((match: any) => {
                const msgs = Array.isArray(match.messages) ? match.messages : [];
                if (!msgs.length) return match;

                const enhancedMessages = msgs.map((m: any) => ({
                    ...m,
                    isMe: m.from === meID
                }));

                const last = enhancedMessages[enhancedMessages.length - 1];
                const hasMyMsg = enhancedMessages.some((m: any) => m.isMe);
                let lastMessageStatus: 'red' | 'yellow' | 'green' | null = null;

                if (last?.isMe) {
                    lastMessageStatus = 'green'; // mình gửi cuối
                } else if (last?.from) {
                    if (!hasMyMsg) {
                        lastMessageStatus = 'red'; // chỉ họ nhắn, mình chưa nhắn lần nào
                    } else {
                        lastMessageStatus = 'yellow'; // đã từng nhắn nhưng tin cuối là của họ
                    }
                }

                return {
                    ...match,
                    lastMessageStatus,
                    messages: enhancedMessages
                };
            });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Lỗi lấy messages:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
