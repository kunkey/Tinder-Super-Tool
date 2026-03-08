import { readConfig } from '@/config/configManager';

export function getTinderHeaders() {
    const auth = readConfig('auth.json');
    return {
        'accept': 'application/json',
        'accept-language': 'vi,vi-VN,en-US,en,zh-CN',
        'app-session-id': auth['app-session-id'],
        'app-session-time-elapsed': auth['app-session-time-elapsed'],
        'app-version': '1070200',
        'dnt': '1',
        'origin': 'https://tinder.com',
        'persistent-device-id': auth['persistent-device-id'],
        'platform': 'web',
        'priority': 'u=1, i',
        'referer': 'https://tinder.com/',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'support-short-video': '1',
        'tinder-version': '7.2.0',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'user-session-id': auth['user-session-id'],
        'user-session-time-elapsed': auth['user-session-time-elapsed'],
        'x-auth-token': auth['x-auth-token'],
        'x-supported-image-formats': 'webp,jpeg'
    };
}
