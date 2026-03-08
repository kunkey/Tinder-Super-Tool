import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { readConfig, writeConfig } from '@/config/configManager';

export async function POST(request: NextRequest) {
    try {
        const auth = readConfig('auth.json');
        const response = await axios({
            method: 'post',
            url: 'https://api.gotinder.com/v3/auth/login?locale=vi',
            headers: {
                'authority': 'api.gotinder.com',
                'accept': 'application/json',
                'content-type': 'application/x-google-protobuf',
                'x-auth-token': auth['x-auth-token'],
                'persistent-device-id': auth['persistent-device-id'],
                'user-session-id': auth['user-session-id'],
                'app-session-id': auth['app-session-id']
            },
            data: `R_\n]${auth.login_token}`
        });

        const removeBefore = response.data.split("]");
        const removeAfter = removeBefore[1].split(`*\x05`);
        const token = removeAfter[0].split(`\x12$`);
        const ParseData = removeAfter[0].split('\x12$');
        const data = ParseData[1].split('"\x18');

        const updatedAuth = {
            ...auth,
            "login_token": token[0],
            "meID": data[1],
            "x-auth-token": data[0]
        };

        if (writeConfig('auth.json', updatedAuth)) {
            return NextResponse.json({ success: true, message: 'Đăng nhập thành công' });
        } else {
            return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật auth' });
        }
    } catch (error: any) {
        console.error('Lỗi đăng nhập:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
