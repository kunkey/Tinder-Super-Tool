import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { readConfig, writeConfig } from '@/config/configManager';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function POST(request: NextRequest) {
    try {
        const settings = readConfig('setting.json');
        const formData = await request.formData();
        const data: any = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Cập nhật các trường settings
        settings.likeRecommendUser = data.likeRecommendUser === 'true' || data.likeRecommendUser === 'on';
        settings.likeCatalogUser = data.likeCatalogUser === 'true' || data.likeCatalogUser === 'on';
        settings.sendMessageToMatchedUser = data.sendMessageToMatchedUser === 'true' || data.sendMessageToMatchedUser === 'on';
        settings.likeDelayMs = Math.max(0, Math.min(60000, parseInt(data.likeDelayMs) ?? 5000));
        settings.messageDelayMs = Math.max(0, Math.min(120000, parseInt(data.messageDelayMs) ?? 10000));
        settings.message = typeof data.message === 'string' ? data.message.split('\n').filter((line: string) => line.trim()) : [];
        try {
            settings.selectedCatalogIds = Array.isArray(data.selectedCatalogIds)
                ? data.selectedCatalogIds
                : typeof data.selectedCatalogIds === 'string'
                    ? (data.selectedCatalogIds ? JSON.parse(data.selectedCatalogIds) : [])
                    : (settings.selectedCatalogIds || []);
        } catch {
            settings.selectedCatalogIds = settings.selectedCatalogIds || [];
        }
        const lat = parseFloat(data.lat);
        const long = parseFloat(data.long);
        settings.location = { lat: isNaN(lat) ? 0 : lat, long: isNaN(long) ? 0 : long };
        const distance = Math.max(0, Math.min(100, parseInt(data.distance) || 0));
        const autoExpandDistance = data.autoExpandDistance === 'true' || data.autoExpandDistance === 'on';
        const autoExpandDistanceMax = Math.max(distance + 1, Math.min(160, parseInt(data.autoExpandDistanceMax) || 50));
        const ageFilterMin = Math.max(18, Math.min(100, parseInt(data.ageFilterMin) || 18));
        const ageFilterMax = Math.max(18, Math.min(100, parseInt(data.ageFilterMax) || 26));
        const ageMin = Math.min(ageFilterMin, ageFilterMax);
        const ageMax = Math.max(ageFilterMin, ageFilterMax);

        settings.unMatch = {
            distance,
            gender: data.gender
        };
        settings.autoExpandDistance = autoExpandDistance;
        settings.autoExpandDistanceMax = autoExpandDistanceMax;
        settings.ageFilterMin = ageMin;
        settings.ageFilterMax = ageMax;
        settings.autoExpansionAgeToggle = data.autoExpansionAgeToggle !== 'false' && data.autoExpansionAgeToggle !== '';
        settings.autoExpansionDistanceToggle = data.autoExpansionDistanceToggle !== 'false' && data.autoExpansionDistanceToggle !== '';
        settings._genderVersion = 1;

        if (autoExpandDistance && autoExpandDistanceMax < distance) {
            return NextResponse.json({ success: false, message: 'Khoảng cách tối đa tự tăng phải lớn hơn bán kính' });
        }
        if (ageMin > ageMax) {
            return NextResponse.json({ success: false, message: 'Tuổi tối thiểu không được lớn hơn tuổi tối đa' });
        }

        const interestedInGenders = data.gender === 'all' ? [0, 1, 2] : [parseInt(data.gender)];
        try {
            const headers = { ...getTinderHeaders(), 'content-type': 'application/json' };
            const profileData: Record<string, unknown> = {
                interested_in_genders: interestedInGenders,
                age_filter_min: ageMin,
                age_filter_max: ageMax,
                distance_filter: distance,
                auto_expansion: {
                    age_toggle: settings.autoExpansionAgeToggle,
                    distance_toggle: settings.autoExpansionDistanceToggle
                }
            };
            await axios({
                method: 'post',
                url: 'https://api.gotinder.com/v2/profile?locale=vi',
                headers,
                data: { user: profileData }
            });
        } catch (err: any) {
            console.error('Lỗi cập nhật profile:', err?.response?.data || err.message);
        }

        const hasValidLocation = settings.location.lat !== 0 || settings.location.long !== 0;
        if (hasValidLocation) {
            try {
                await axios({
                    method: 'post',
                    url: 'https://api.gotinder.com/v2/meta?locale=vi',
                    headers: { ...getTinderHeaders(), 'content-type': 'application/json' },
                    data: {
                        lat: settings.location.lat,
                        long: settings.location.long,
                        force_fetch_resources: true
                    }
                });
            } catch (err: any) {
                console.error('Lỗi cập nhật vị trí:', err?.message);
            }
        }

        if (writeConfig('setting.json', settings)) {
            return NextResponse.json({ success: true, message: 'Cập nhật cài đặt thành công' });
        } else {
            return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật cài đặt' });
        }
    } catch (error) {
        console.error('Lỗi cập nhật settings:', error);
        return NextResponse.json({ success: false, message: 'Lỗi server' });
    }
}
