import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { readConfig, writeConfig } from '@/config/configManager';

function headersFromAuth(auth: Record<string, string>) {
    return {
        'accept': 'application/json',
        'accept-language': 'vi,vi-VN,en-US,en,zh-CN',
        'app-session-id': auth['app-session-id'] || '',
        'app-session-time-elapsed': auth['app-session-time-elapsed'] || '',
        'app-version': '1070600',
        'dnt': '1',
        'origin': 'https://tinder.com',
        'persistent-device-id': auth['persistent-device-id'] || '',
        'platform': 'web',
        'referer': 'https://tinder.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'user-session-id': auth['user-session-id'] || '',
        'user-session-time-elapsed': auth['user-session-time-elapsed'] || '',
        'x-auth-token': auth['x-auth-token'] || '',
        'x-supported-image-formats': 'webp,jpeg'
    };
}

export async function POST(request: NextRequest) {
    try {
        const auth = readConfig('auth.json');
        const body = await request.json();
        const updatedAuth = { ...auth, ...body };
        try {
            const res = await axios({
                method: 'get',
                url: 'https://api.gotinder.com/v2/profile?locale=vi',
                headers: headersFromAuth(updatedAuth)
            });
            const name = res.data?.data?.user?.name ?? res.data?.data?.user?.first_name ?? null;
            if (writeConfig('auth.json', updatedAuth)) {
                return NextResponse.json({
                    success: true,
                    message: name ? `Welcome back! ${name.toUpperCase()}!` : 'Cập nhật auth thành công',
                    name: name || undefined
                });
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                return NextResponse.json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' });
            }
            throw err;
        }
        return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật auth' });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error?.response?.data?.message || error?.message || 'Lỗi server' });
    }
}
