import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

/** Chuẩn hóa item từ my-likes về dạng giống Recommendation (user, s_number, distance_km). */
function normalizeItem(item: any): any {
  const user = item?.user ?? item;
  const s_number = item?.s_number ?? user?.s_number ?? String(Date.now());
  const distance_km = item?.distance_km ?? (item?.distance_mi != null ? item.distance_mi * 1.60934 : undefined);
  return { user, s_number, distance_km, distance_mi: item?.distance_mi };
}

export async function GET(request: NextRequest) {
  try {
    const pageToken = request.nextUrl.searchParams.get('page_token') ?? '';
    const headers = {
      ...getTinderHeaders(),
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    };
    const url = `https://api.gotinder.com/v2/my-likes?locale=vi${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`;
    const response = await axios({ method: 'get', url, headers });
    const data = response.data?.data ?? response.data;
    const rawResults = data?.results ?? data?.data?.results ?? [];
    const results = Array.isArray(rawResults) ? rawResults.map(normalizeItem) : [];
    const next_page_token = data?.next_page_token ?? null;
    return NextResponse.json({
      success: true,
      data: { data: { results, next_page_token } }
    });
  } catch (error: any) {
    console.error('Lỗi my-likes:', error?.response?.data || error.message);
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.response?.data?.error || error.message;
    return NextResponse.json(
      { success: false, message: msg || 'Cần gói Gold để xem Ai đã thích tôi' },
      { status: status === 402 ? 402 : status === 401 ? 401 : 500 }
    );
  }
}
