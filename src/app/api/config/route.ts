import { NextResponse } from 'next/server';
import { readConfig } from '@/config/configManager';

export async function GET() {
    try {
        const auth = readConfig('auth.json');
        const settings = readConfig('setting.json');
        return NextResponse.json({ auth, settings });
    } catch (error) {
        return NextResponse.json({ auth: {}, settings: {} });
    }
}
