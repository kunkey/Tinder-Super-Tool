import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function GET(request: NextRequest) {
    try {
        const response = await axios({
            method: 'get',
            url: 'https://api.gotinder.com/v2/explore?locale=vi',
            headers: getTinderHeaders()
        });

        const catalogItems: { catalog_id: string; title: string; title_non_localized: string }[] = [];
        const data = response.data?.data;
        if (data?.catalog_groups) {
            for (const group of data.catalog_groups) {
                for (const section of group.sections || []) {
                    for (const item of section.items || []) {
                        if (item.catalog_id && item.catalog_item_type === 'card_stack') {
                            catalogItems.push({
                                catalog_id: item.catalog_id,
                                title: item.title || item.title_non_localized || item.catalog_id,
                                title_non_localized: item.title_non_localized || item.title || ''
                            });
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, data: catalogItems });
    } catch (error: any) {
        console.error('Lỗi lấy catalog:', error);
        if (error.response?.status === 401) {
            return NextResponse.json({ success: false, message: 'Token hết hạn, vui lòng đăng nhập lại!' });
        }
        return NextResponse.json({ success: false, message: error.message || 'Lỗi server' });
    }
}
