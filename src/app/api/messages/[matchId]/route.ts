import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const { matchId } = params;
    if (!matchId) {
      return NextResponse.json({ success: false, message: 'Missing matchId' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '100';
    const pageToken = searchParams.get('page_token');

    const headers = {
      ...getTinderHeaders(),
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    };

    const url = `https://api.gotinder.com/v2/matches/${matchId}/messages?locale=vi&count=${limit}${
      pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''
    }`;

    const response = await axios({
      method: 'get',
      url,
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

    if (meID && data?.data?.messages) {
      data.data.messages = data.data.messages.map((m: any) => ({
        ...m,
        isMe: m.from === meID
      }));
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Lỗi lấy đoạn hội thoại:', error?.response?.data || error.message);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}

