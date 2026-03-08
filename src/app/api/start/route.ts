import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { readConfig } from '@/config/configManager';
import { autoState } from '@/libs/autoState';

function isRateLimitedLikeResponse(data: any): { blocked: boolean; reason?: string } {
    if (!data) return { blocked: false };
    try {
        // Kiểu response chuẩn của Tinder cho like
        if (typeof data.likes_remaining === 'number' && data.likes_remaining <= 0) {
            return { blocked: true, reason: 'likes_remaining=0' };
        }
        if (typeof data.rate_limited_until === 'number') {
            const now = Date.now();
            if (data.rate_limited_until > now) {
                return { blocked: true, reason: 'rate_limited_until in future' };
            }
        }
        // Một số trường hợp được wrap trong meta/data
        const inner = (data.data && data.data.meta) ? data.data.meta : data.meta;
        if (inner && typeof inner.status === 'number' && inner.status === 429) {
            return { blocked: true, reason: 'meta.status=429' };
        }
    } catch {
        // ignore parsing errors
    }
    return { blocked: false };
}

function parseMessageLine(lines: string[], name: string): string | null {
    const line = lines[Math.floor(Math.random() * lines.length)]?.replace(/\r/g, '').trim();
    if (!line) return null;
    const hasSlash = /\/[01]?\s*$/.test(line);
    let content = line;
    let randomAmong = false;
    if (hasSlash) {
        const slashIdx = content.lastIndexOf('/');
        const afterSlash = content.slice(slashIdx + 1).trim();
        content = content.slice(0, slashIdx).trim();
        if (afterSlash === '1') randomAmong = true;
    }
    let parts = content.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const msg = randomAmong ? parts[Math.floor(Math.random() * parts.length)]! : parts[0]!;
    return msg.replace(/\{\{name\}\}/g, name);
}

export async function POST(request: NextRequest) {
    try {
        if (autoState.isAutoRunning) {
            return NextResponse.json({ success: false, message: 'Đã chạy tự động' });
        }

        const settings = readConfig('setting.json');
        const auth = readConfig('auth.json');

        if (!auth['x-auth-token']) {
            return NextResponse.json({ success: false, message: 'Vui lòng cập nhật thông tin xác thực' });
        }

        const hasValidLocation = (settings.location?.lat !== 0 || settings.location?.long !== 0) && Number.isFinite(settings.location?.lat) && Number.isFinite(settings.location?.long);
        if (hasValidLocation) {
            try {
                const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                const headers = { ...getTinderHeaders(), 'content-type': 'application/json' };
                await axios({
                    method: 'post',
                    url: 'https://api.gotinder.com/v2/meta?locale=vi',
                    headers,
                    data: {
                        lat: settings.location.lat,
                        long: settings.location.long,
                        force_fetch_resources: true
                    }
                });
            } catch (err: any) {
                return NextResponse.json({ success: false, message: 'Lỗi cập nhật vị trí: ' + (err?.response?.data?.message || err.message) });
            }
        }

        // Cập nhật profile: khoảng cách, độ tuổi, giới tính, auto_expansion
        const distanceFilter = settings.unMatch?.distance ?? 10;
        const ageFilterMin = settings.ageFilterMin ?? 18;
        const ageFilterMax = settings.ageFilterMax ?? 26;
        const gender = settings.unMatch?.gender ?? 'all';
        const interestedInGenders = gender === 'all' ? [0, 1, 2] : [parseInt(gender)];
        const autoExpansionAge = settings.autoExpansionAgeToggle !== false;
        const autoExpansionDistance = settings.autoExpansionDistanceToggle !== false;
        autoState.currentDistanceFilter = distanceFilter;
        try {
            const { getTinderHeaders } = await import('@/libs/tinderHeaders');
            const headers = { ...getTinderHeaders(), 'content-type': 'application/json' };
            await axios({
                method: 'post',
                url: 'https://api.gotinder.com/v2/profile?locale=vi',
                headers,
                data: {
                    user: {
                        interested_in_genders: interestedInGenders,
                        age_filter_min: ageFilterMin,
                        age_filter_max: ageFilterMax,
                        distance_filter: distanceFilter,
                        auto_expansion: { age_toggle: autoExpansionAge, distance_toggle: autoExpansionDistance }
                    }
                }
            });
        } catch (err: any) {
            console.error('Lỗi cập nhật profile:', err?.message);
        }

        // Kiểm tra token và rate limit trước khi bắt đầu auto
        try {
            const { getTinderHeaders } = await import('@/libs/tinderHeaders');
            await axios({
                method: 'get',
                url: `https://api.gotinder.com/v2/recs/core?locale=vi&duos=0`,
                headers: getTinderHeaders()
            });
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                return NextResponse.json({ success: false, message: 'Token hết hạn, vui lòng đăng nhập lại!' });
            } else if (error.response && error.response.status === 429) {
                return NextResponse.json({ success: false, message: 'Bạn đã quẹt/quét quá nhanh, hãy thử lại sau vài phút!' });
            } else if (error.response?.data?.error?.message === 'RATE_LIMITED') {
                return NextResponse.json({ success: false, message: 'Bạn đã quẹt/quét quá nhanh, hãy thử lại sau vài phút!' });
            } else {
                return NextResponse.json({ success: false, message: 'Lỗi API: ' + error.message });
            }
        }

        // Kiểm tra xem có setting nào được bật không
        const hasCatalogLike = settings.likeCatalogUser && Array.isArray(settings.selectedCatalogIds) && settings.selectedCatalogIds.length > 0;
        if (!settings.likeRecommendUser && !settings.sendMessageToMatchedUser && !hasCatalogLike) {
            return NextResponse.json({ success: false, message: 'Vui lòng bật "Like người dùng được đề xuất", "Like người dùng chung chủ đề" hoặc "Gửi tin nhắn cho người dùng đã match" trong cài đặt' });
        }

        autoState.isAutoRunning = true;

        // Bắt đầu tự động like
        if (settings.likeRecommendUser) {
            const autoExpandDistance = settings.autoExpandDistance === true;
            const autoExpandDistanceMax = settings.autoExpandDistanceMax ?? 50;
            autoState.autoLikeInterval = setInterval(async () => {
                if (!autoState.isAutoRunning) {
                    if (autoState.autoLikeInterval) clearInterval(autoState.autoLikeInterval);
                    return;
                }
                try {
                    const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                    let response = await axios({
                        method: 'get',
                        url: `https://api.gotinder.com/v2/recs/core?locale=vi&duos=0`,
                        headers: getTinderHeaders()
                    });
                    let results = response.data?.data?.results ?? [];

                    while (results.length === 0 && autoExpandDistance && autoState.isAutoRunning) {
                        const currentDist = autoState.currentDistanceFilter;
                        if (currentDist >= autoExpandDistanceMax) {
                            console.log('Đã đạt khoảng cách tối đa tự tăng, dừng mở rộng');
                            break;
                        }
                        const newDist = currentDist + 1;
                        autoState.currentDistanceFilter = newDist;
                        console.log(`Hết người dùng, tăng khoảng cách lên ${newDist} km`);
                        try {
                            const headers = { ...getTinderHeaders(), 'content-type': 'application/json' };
                            await axios({
                                method: 'post',
                                url: 'https://api.gotinder.com/v2/profile?locale=vi',
                                headers,
                                data: { user: { distance_filter: newDist } }
                            });
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            response = await axios({
                                method: 'get',
                                url: `https://api.gotinder.com/v2/recs/core?locale=vi&duos=0`,
                                headers: getTinderHeaders()
                            });
                            results = response.data?.data?.results ?? [];
                        } catch (err: any) {
                            console.error('Lỗi khi tăng khoảng cách:', err.message);
                            break;
                        }
                    }

                    if (results && results.length > 0) {
                        for (const user of results) {
                            if (!autoState.isAutoRunning) break;
                            try {
                                const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                                const likeRes = await axios({
                                    method: 'get',
                                    url: `https://api.gotinder.com/like/${user.user._id}?locale=vi&s_number=${user.s_number}`,
                                    headers: getTinderHeaders()
                                });
                                const check = isRateLimitedLikeResponse(likeRes.data);
                                if (check.blocked) {
                                    console.warn('Tinder đã chặn like tự động (recs). Dừng auto.', check.reason);
                                    autoState.stopAll();
                                    break;
                                }
                                console.log(`Đã quẹt like: ${user.user.name} (${user.user._id})`);
                                const likeDelay = Math.max(0, Math.min(60000, settings.likeDelayMs ?? 5000));
                                await new Promise(resolve => setTimeout(resolve, likeDelay));
                            } catch (error: any) {
                                console.error(`Lỗi khi like ${user.user.name}:`, error.message);
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('Lỗi khi lấy recommendations:', error.message);
                }
            }, 15000);
        }

        // Bắt đầu tự động like theo chủ đề (catalog)
        if (hasCatalogLike) {
            const catalogIds = settings.selectedCatalogIds || [];
            let catalogIndex = 0;
            autoState.autoLikeCatalogInterval = setInterval(async () => {
                if (!autoState.isAutoRunning) {
                    if (autoState.autoLikeCatalogInterval) clearInterval(autoState.autoLikeCatalogInterval);
                    return;
                }
                if (catalogIds.length === 0) return;
                const catalogId = catalogIds[catalogIndex % catalogIds.length];
                catalogIndex++;
                try {
                    const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                    const headers = {
                        ...getTinderHeaders(),
                        'content-type': 'application/json'
                    };
                    const recsUrl = `https://api.gotinder.com/v2/recs/core?locale=vi&duos=0&catalog_id=${catalogId}`;
                    const response = await axios({
                        method: 'get',
                        url: recsUrl,
                        headers: getTinderHeaders()
                    });
                    const results = response.data?.data?.results;
                    if (results && Array.isArray(results)) {
                        for (const user of results) {
                            if (!autoState.isAutoRunning) break;
                            try {
                                const userId = user.user?._id || user._id;
                                const sNumber = user.s_number;
                                if (!userId || sNumber == null) continue;
                                const likeHeaders = { ...getTinderHeaders(), 'content-type': 'application/json' };
                                const likedContentId = user.liked_content_id ?? user.user?.photos?.[0]?.id;
                                const likedContent = likedContentId
                                    ? { liked_content_id: likedContentId, liked_content_type: user.liked_content_type || 'photo' }
                                    : null;
                                if (likedContent) {
                                    const likeRes = await axios({
                                        method: 'post',
                                        url: `https://api.gotinder.com/like/${userId}?locale=vi`,
                                        headers: likeHeaders,
                                        data: { s_number: sNumber, ...likedContent }
                                    });
                                } else {
                                    const likeRes = await axios({
                                        method: 'get',
                                        url: `https://api.gotinder.com/like/${userId}?locale=vi&s_number=${sNumber}`,
                                        headers: getTinderHeaders()
                                    });
                                    const check = isRateLimitedLikeResponse(likeRes.data);
                                    if (check.blocked) {
                                        console.warn('Tinder đã chặn like tự động (catalog). Dừng auto.', check.reason);
                                        autoState.stopAll();
                                        break;
                                    }
                                }
                                console.log(`Đã quẹt like (chủ đề): ${user.user?.name || userId} (${userId})`);
                                const likeDelay = Math.max(0, Math.min(60000, settings.likeDelayMs ?? 5000));
                                await new Promise(resolve => setTimeout(resolve, likeDelay));
                            } catch (error: any) {
                                console.error(`Lỗi khi like ${user.user?.name}:`, error.message);
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('Lỗi khi lấy recs chủ đề:', error.message);
                }
            }, 20000);
        }

        // Bắt đầu tự động gửi tin nhắn
        if (settings.sendMessageToMatchedUser) {
            autoState.autoMessageInterval = setInterval(async () => {
                if (!autoState.isAutoRunning) {
                    if (autoState.autoMessageInterval) clearInterval(autoState.autoMessageInterval);
                    return;
                }
                try {
                    const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                    // Lấy matches chưa có tin nhắn (message=0) hoặc chưa có tin nhắn từ mình
                    const response = await axios({
                        method: 'get',
                        url: `https://api.gotinder.com/v2/matches?locale=vi&count=60&message=0&is_tinder_u=false`,
                        headers: getTinderHeaders()
                    });
                    if (response.data && response.data.data && response.data.data.matches) {
                        for (const match of response.data.data.matches) {
                            if (!autoState.isAutoRunning) break;
                            
                            // Kiểm tra xem đã gửi tin nhắn cho match này chưa
                            if (autoState.hasSentMessage(match._id)) {
                                console.log(`Đã bỏ qua ${match.person.name} - đã gửi tin nhắn trước đó`);
                                continue;
                            }
                            
                            // Kiểm tra xem match đã có tin nhắn chưa (nếu có thì có thể đã gửi rồi)
                            if (match.messages && match.messages.length > 0) {
                                // Kiểm tra tin nhắn cuối cùng có phải từ mình không
                                const lastMessage = match.messages[match.messages.length - 1];
                                if (lastMessage.from && lastMessage.from !== match.person._id) {
                                    // Tin nhắn cuối từ mình, đánh dấu đã gửi
                                    autoState.markMessageSent(match._id);
                                    continue;
                                }
                            }
                            
                            try {
                                if (!settings.message || settings.message.length === 0) {
                                    console.log('Không có tin nhắn nào trong danh sách');
                                    continue;
                                }
                                const parsed = parseMessageLine(settings.message, match.person.name);
                                if (!parsed) continue;
                                const message = parsed;
                                const { getTinderHeaders } = await import('@/libs/tinderHeaders');
                                const headers = {
                                    ...getTinderHeaders(),
                                    'content-type': 'application/json'
                                };
                                await axios({
                                    method: 'post',
                                    url: `https://api.gotinder.com/user/matches/${match._id}?locale=vi`,
                                    headers,
                                    data: { message }
                                });
                                
                                // Đánh dấu đã gửi tin nhắn cho match này
                                autoState.markMessageSent(match._id);
                                
                                console.log(`Đã gửi tin nhắn cho: ${match.person.name} (${match.person._id}) - Nội dung: ${message}`);
                                const msgDelay = Math.max(0, Math.min(120000, settings.messageDelayMs ?? 10000));
                                await new Promise(resolve => setTimeout(resolve, msgDelay));
                            } catch (error: any) {
                                console.error(`Lỗi khi gửi tin nhắn cho ${match.person.name}:`, error.message);
                                // Nếu lỗi, vẫn đánh dấu để tránh retry liên tục
                                if (error.response?.status === 400 || error.response?.status === 403) {
                                    autoState.markMessageSent(match._id);
                                }
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('Lỗi khi lấy matches:', error.message);
                }
            }, 30000); // Tăng interval lên 30 giây
        }

        let message = 'Đã bắt đầu tự động';
        const parts = [];
        if (settings.likeRecommendUser) parts.push('like');
        if (hasCatalogLike) parts.push('like chủ đề');
        if (settings.sendMessageToMatchedUser) parts.push('gửi tin nhắn');
        if (parts.length > 0) {
            message = `Đã bắt đầu tự động ${parts.join(' và ')}`;
        }
        
        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        console.error('Lỗi khi bắt đầu tự động:', error);
        return NextResponse.json({ success: false, message: 'Lỗi khi bắt đầu tự động: ' + error.message });
    }
}

export async function GET() {
    return NextResponse.json({ isAutoRunning: autoState.isAutoRunning });
}
