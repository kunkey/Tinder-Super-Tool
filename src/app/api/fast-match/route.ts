import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

/** Chuẩn hóa item từ fast-match về dạng giống Recommendation (user, s_number, liked_content_*). */
function normalizeItem(item: any): any {
  const user = item?.user ?? item;
  const s_number = item?.s_number ?? user?.s_number ?? String(Date.now());
  const distance_km = item?.distance_km ?? (item?.distance_mi != null ? item.distance_mi * 1.60934 : undefined);
  return {
    user,
    s_number,
    distance_km,
    distance_mi: item?.distance_mi,
    liked_content_id: item?.liked_content_id ?? item?.content_id,
    liked_content_type: item?.liked_content_type ?? item?.content_type ?? 'photo'
  };
}

export async function GET(request: NextRequest) {
  try {
    const pageToken = request.nextUrl.searchParams.get('page_token') ?? '';
    const headers = {
      ...getTinderHeaders(),
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    };
    const url = `https://api.gotinder.com/v2/fast-match?locale=vi${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`;
    const response = await axios({ method: 'get', url, headers });
    const data = response.data?.data ?? response.data;
    const rawResults = data?.results ?? data?.data?.results ?? data?.users ?? [];
    const results = Array.isArray(rawResults) ? rawResults.map(normalizeItem) : [];
    const next_page_token = data?.next_page_token ?? null;
    return NextResponse.json({
      success: true,
      data: { data: { results, next_page_token } }
    });
  } catch (error: any) {
    console.error('Lỗi fast-match:', error?.response?.data || error.message);
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.response?.data?.error || error.message;
    return NextResponse.json(
      { success: false, message: msg || 'Lỗi tải Fast Match' },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
