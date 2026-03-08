import { NextResponse } from 'next/server';
import axios from 'axios';
import { getTinderHeaders } from '@/libs/tinderHeaders';

export async function GET() {
    try {
        const url = 'https://api.gotinder.com/v2/profile?locale=vi&include=account,available_descriptors,boost,bouncerbypass,contact_cards,email_settings,feature_access,instagram,likes,profile_meter,notifications,misc_merchandising,offerings,onboarding,paywalls,plus_control,purchase,readreceipts,spotify,super_likes,tinder_u,travel,tutorials,user,all_in_gender';
        const response = await axios({
            method: 'get',
            url,
            headers: getTinderHeaders()
        });
        const data = response.data?.data;
        const user = data?.user;
        const purchase = data?.purchase;
        const pos = data?.pos ?? user?.pos;
        const name = user?.name ?? null;
        const photos = user?.photos ?? [];
        const firstPhoto = Array.isArray(photos) && photos[0]?.url ? photos[0].url : null;
        const photoUrls = Array.isArray(photos) ? photos.map((p: { url?: string }) => p?.url).filter(Boolean) : [];

        let plan: string | null = null;
        if (purchase?.purchases && Array.isArray(purchase.purchases) && purchase.purchases.length > 0 && !purchase.subscription_expired) {
            const now = Date.now();
            const active = purchase.purchases.filter((p: { expire_date?: number }) => !p.expire_date || p.expire_date > now);
            if (active.length > 0) {
                const order: Record<string, number> = { platinum: 3, gold: 2, plus: 1 };
                const sorted = [...active].sort((a: { product_type?: string }, b: { product_type?: string }) => (order[b.product_type ?? ''] ?? 0) - (order[a.product_type ?? ''] ?? 0));
                plan = sorted[0]?.product_type ?? null;
            }
        }
        if (!plan) plan = 'free';

        const age = user?.age ?? (user?.birth_date ? new Date().getFullYear() - new Date(user.birth_date).getFullYear() : null);
        const city = typeof user?.city === 'string' ? user.city : user?.city?.name;
        const school = user?.schools?.[0]?.name ?? (user as { school?: { name?: string } })?.school?.name;
        const rawJob = user?.jobs?.[0] ?? (user as { job?: { title?: unknown; company?: unknown } })?.job;
        const jobTitle = rawJob && typeof (rawJob as { title?: unknown }).title === 'string' ? (rawJob as { title: string }).title : (rawJob as { title?: { name?: string } })?.title?.name;
        const jobCompany = rawJob && typeof (rawJob as { company?: unknown }).company === 'string' ? (rawJob as { company: string }).company : (rawJob as { company?: { name?: string } })?.company?.name;
        const job = [jobTitle, jobCompany].filter(Boolean).join(' - ') || null;

        return NextResponse.json({
            success: true,
            data: {
                name,
                pos: pos ? { lat: pos.lat, lon: pos.lon } : null,
                photo: firstPhoto,
                plan,
                photos: photoUrls,
                bio: user?.bio ?? null,
                age,
                city,
                school,
                job
            }
        });
    } catch (error: any) {
        console.error('Lỗi lấy profile:', error?.response?.data || error.message);
        if (error.response?.status === 401) {
            return NextResponse.json({ success: false, message: 'Token hết hạn' }, { status: 401 });
        }
        return NextResponse.json({ success: false, message: error.message || 'Lỗi server' });
    }
}
