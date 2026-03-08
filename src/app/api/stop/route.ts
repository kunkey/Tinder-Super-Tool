import { NextRequest, NextResponse } from 'next/server';
import { autoState } from '@/libs/autoState';

export async function POST(request: NextRequest) {
    try {
        if (!autoState.isAutoRunning) {
            return NextResponse.json({ success: false, message: 'Chưa chạy tự động' });
        }

        autoState.stopAll();

        console.log('Đã dừng tất cả các quá trình tự động');
        return NextResponse.json({ success: true, message: 'Đã dừng tự động like và gửi tin nhắn' });
    } catch (error: any) {
        console.error('Lỗi khi dừng tự động:', error);
        return NextResponse.json({ success: false, message: 'Lỗi khi dừng tự động: ' + error.message });
    }
}
