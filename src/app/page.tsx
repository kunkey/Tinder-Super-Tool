'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import ConfigModal from '@/components/ConfigModal';
import ChatModal from '@/components/ChatModal';
import MyProfileModal from '@/components/MyProfileModal';
import GuideModal from '@/components/GuideModal';
import LogModal from '@/components/LogModal';
import { installConsoleCapture } from '@/libs/consoleCapture';
import { installServerLogStream } from '@/libs/serverLogStream';

type FeedMode = 'recommend' | 'my_likes' | 'fast_match';

interface Recommendation {
  user: {
    _id: string;
    name: string;
    photos: Array<{ url: string }>;
    bio?: string;
    age?: number;
    birth_date?: string;
    city?: { name?: string };
    schools?: Array<{ name?: string }>;
    jobs?: Array<{ title?: string; company?: string }>;
  };
  s_number: string;
  distance_km?: number;
  distance_mi?: number;
  liked_content_id?: string;
  liked_content_type?: string;
}

const MAX_LAZY_LOADS = 7;

/** Lấy chuỗi từ giá trị có thể là string hoặc object có .name (API Tinder trả về cả hai). */
function toStringOrName(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'name' in v && typeof (v as { name?: unknown }).name === 'string') return (v as { name: string }).name;
  return '';
}

function getUserDetail(rec: Recommendation) {
  const u = rec.user;
  const age = u.age ?? (u.birth_date ? new Date().getFullYear() - new Date(u.birth_date).getFullYear() : null);
  const city = typeof u.city === 'string' ? u.city : u.city?.name;
  const school = u.schools?.[0]?.name ?? (u as { school?: { name?: string } }).school?.name;
  type JobLike = { title?: unknown; company?: unknown };
  const rawJob: JobLike | undefined = u.jobs?.[0] ?? (u as { job?: JobLike }).job;
  const jobParts = rawJob
    ? [toStringOrName(rawJob.title), toStringOrName(rawJob.company)].filter(Boolean)
    : [];
  const job = jobParts.length ? jobParts.join(' - ') : null;
  const distance = rec.distance_km ?? (rec.distance_mi != null ? rec.distance_mi * 1.60934 : null);
  return { age, city, school, job, distance };
}

export default function Home() {
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadCount, setLoadCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<Recommendation | null>(null);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [myProfile, setMyProfile] = useState<{ name: string; photo: string | null; plan?: string | null } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>('recommend');
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const feedApiUrl = feedMode === 'my_likes' ? '/api/my-likes' : feedMode === 'fast_match' ? '/api/fast-match' : '/api/recommendations';

  useEffect(() => {
    installConsoleCapture();
    installServerLogStream();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchFeed = useCallback(async (append: boolean = false) => {
    if (append && feedMode !== 'recommend') return;
    if (append) {
      if (loadCount >= MAX_LAZY_LOADS) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(feedApiUrl);
      const data = await res.json();
      const results = (data.data?.data?.results ?? data.data?.results ?? []) as Recommendation[];
      if (data.success && Array.isArray(results) && results.length > 0) {
        if (append) {
          setRecommendations(prev => {
            const ids = new Set(prev.map(r => r.user._id));
            const newOnes = results.filter(r => !ids.has(r.user._id));
            return newOnes.length ? [...prev, ...newOnes] : prev;
          });
          setLoadCount(c => c + 1);
          toast.success(`Đã tải thêm ${results.length} người`);
        } else {
          setRecommendations(results);
          setLoadCount(0);
          setHasFetchedOnce(true);
          const label = feedMode === 'my_likes' ? 'Ai đã thích tôi' : feedMode === 'fast_match' ? 'Fast Match' : 'đề xuất';
          toast.success(`Đã tải ${results.length} người (${label})`);
        }
        if (!append && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!append) {
        toast.error(data.message || 'Không thể tải danh sách');
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadCount, feedMode, feedApiUrl]);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success && data.data) {
        setMyProfile({
          name: data.data.name || 'Tôi',
          photo: data.data.photo || null,
          plan: data.data.plan ?? null
        });
        setShowConfig(false);
      } else {
        setMyProfile({ name: 'Chưa đăng nhập', photo: null, plan: null });
        setShowConfig(true);
      }
    } catch {
      setMyProfile({ name: 'Chưa đăng nhập', photo: null, plan: null });
      setShowConfig(true);
    }
  }, []);

  const handleResetAndReload = () => {
    setRecommendations([]);
    setLoadCount(0);
    setHasFetchedOnce(false);
    setSelectedUser(null);
    setActionByUser({});
    setLoading(true);
    fetch(feedApiUrl)
      .then(res => res.json())
      .then(data => {
        const results = data.data?.data?.results ?? data.data?.results ?? [];
        if (data.success && Array.isArray(results) && results.length > 0) {
          setRecommendations(results);
          setHasFetchedOnce(true);
          toast.success('Đã bắt đầu lại');
        }
      })
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = loadMoreTriggerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0]?.isIntersecting || loading || loadingMore || loadCount >= MAX_LAZY_LOADS || !hasFetchedOnce || feedMode !== 'recommend') return;
        fetchFeed(true);
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadCount, hasFetchedOnce, feedMode, fetchFeed]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const [actionByUser, setActionByUser] = useState<Record<string, ActionType>>({});

  const handleLike = async (user: Recommendation) => {
    try {
      const body: Record<string, unknown> = { userId: user.user._id, sNumber: user.s_number };
      if (feedMode === 'fast_match' && user.liked_content_id != null && user.liked_content_type != null) {
        body.fast_match = 1;
        body.liked_content_id = user.liked_content_id;
        body.liked_content_type = user.liked_content_type;
      }
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Đã like ${user.user.name}`);
        setActionByUser(prev => ({ ...prev, [user.user._id]: 'like' }));
      } else toast.error(result.message || 'Lỗi khi like');
    } catch (error) {
      toast.error('Lỗi khi like');
    }
  };

  const handleDislike = async (user: Recommendation) => {
    try {
      const body: Record<string, unknown> = { userId: user.user._id };
      if ((feedMode === 'my_likes' || feedMode === 'fast_match') && user.s_number) {
        body.fast_match = 1;
        body.s_number = user.s_number;
      }
      const res = await fetch('/api/dislike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Đã pass ${user.user.name}`);
        setActionByUser(prev => ({ ...prev, [user.user._id]: 'dislike' }));
      } else toast.error(result.message || 'Lỗi');
    } catch (error) {
      toast.error('Lỗi khi pass');
    }
  };

  const handleSuperLike = async (user: Recommendation) => {
    try {
      const res = await fetch('/api/super-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user._id, sNumber: user.s_number })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Đã super like ${user.user.name}`);
        setActionByUser(prev => ({ ...prev, [user.user._id]: 'superlike' }));
      } else toast.error(result.message || 'Lỗi');
    } catch (error) {
      toast.error('Lỗi khi super like');
    }
  };

  const openProfile = (rec: Recommendation, index: number) => {
    setSelectedUser(rec);
    setSelectedUserIndex(index);
  };

  const goToProfile = (delta: number) => {
    const next = selectedUserIndex + delta;
    if (next < 0 || next >= recommendations.length) return;
    setSelectedUser(recommendations[next]);
    setSelectedUserIndex(next);
  };

  return (
    <>
      <div className="min-h-screen pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 opacity-90">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>
        <div className="relative z-10">
          <h1 className="text-center text-5xl md:text-6xl font-extrabold text-white py-12 drop-shadow-2xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-100 to-white animate-pulse">Tinder Super Tool</span>
          </h1>

          <div className="fixed top-8 right-8 flex flex-col gap-4 z-50 items-end">
            {myProfile && (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => myProfile.name && setShowMyProfileModal(true)}
                  className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/50 shadow-xl bg-white/20 flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                  title={myProfile.name ? 'Xem profile' : 'Chưa đăng nhập'}
                >
                  {myProfile.photo ? <img src={myProfile.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-xs font-bold text-center px-1">LOGIN?</span>}
                </button>
                {myProfile.plan && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white shadow">
                    Gói: {myProfile.plan.toUpperCase()}
                  </span>
                )}
              </div>
            )}
            <button onClick={() => setShowConfig(true)} className="w-16 h-16 bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/50 cursor-pointer" title="Cấu hình">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={() => setShowGuide(true)} className="w-16 h-16 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/50 cursor-pointer" title="Hướng dẫn">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </button>
            <StartStopButtons />
            <button onClick={() => setShowChat(true)} className="w-16 h-16 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/50 cursor-pointer" title="Tin nhắn">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
            {showBackToTop && (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-10 right-8 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/50 bg-white/25 hover:bg-white/40 text-white cursor-pointer"
                title="Về đầu trang"
                aria-label="Về đầu trang"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
            )}
          </div>

          <div className="fixed top-8 left-8 z-50 flex flex-col gap-3">
            <button onClick={() => fetchFeed(false)} disabled={loading} className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 border-2 border-white/50 cursor-pointer">
              <svg className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span className="text-lg text-white font-bold">{loading ? 'Đang tải...' : hasFetchedOnce ? 'Cập nhật' : 'Bắt đầu'}</span>
            </button>
            <div className="flex rounded-xl overflow-hidden border-2 border-white/50 shadow-lg bg-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => { setFeedMode('recommend'); setRecommendations([]); setHasFetchedOnce(false); setLoadCount(0); }}
                className={`px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${feedMode === 'recommend' ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'}`}
              >
                Đề xuất
              </button>
              <button
                type="button"
                onClick={() => { setFeedMode('fast_match'); setRecommendations([]); setHasFetchedOnce(false); setLoadCount(0); }}
                className={`px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${feedMode === 'fast_match' ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'}`}
              >
                Ai thích tôi
              </button>
              <button
                type="button"
                onClick={() => { setFeedMode('my_likes'); setRecommendations([]); setHasFetchedOnce(false); setLoadCount(0); }}
                className={`px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${feedMode === 'my_likes' ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'}`}
                title="Cần gói Gold"
              >
                Fast Match
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="fixed bottom-10 left-8 z-50 px-5 py-3 rounded-2xl bg-white/25 hover:bg-white/40 text-white font-extrabold shadow-2xl border-2 border-white/50 backdrop-blur-md transition-all duration-300 hover:scale-105 flex items-center gap-2 cursor-pointer"
            title="Xem log console"
            aria-label="Xem log console"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
            Log
          </button>

          <div className="container mx-auto px-4 py-8">
            {loading && recommendations.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white/90 rounded-3xl overflow-hidden shadow-xl animate-pulse">
                    <div className="h-96 bg-gray-300" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="flex gap-3 pt-4 justify-center">
                        <div className="h-14 w-14 rounded-full bg-gray-200" />
                        <div className="h-14 w-14 rounded-full bg-gray-200" />
                        <div className="h-14 w-14 rounded-full bg-gray-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 && !loading && !loadingMore ? (
              <div className="text-center py-20 bg-white/95 backdrop-blur-md rounded-3xl max-w-md mx-auto border-2 border-white/50 shadow-2xl">
                <svg className="w-24 h-24 mx-auto text-purple-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <p className="text-gray-800 text-xl font-bold mb-2">Chưa có danh sách hiển thị</p>
                <p className="text-gray-600 text-sm">Nhấn &quot;Bắt đầu&quot; để tận dụng hết sức mạnh của tool.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.map((rec, index) => (
                    <RecommendationCard
                      key={rec.user._id}
                      recommendation={rec}
                      selectedAction={actionByUser[rec.user._id] ?? null}
                      onLike={() => handleLike(rec)}
                      onDislike={() => handleDislike(rec)}
                      onSuperLike={() => handleSuperLike(rec)}
                      onViewProfile={() => openProfile(rec, index)}
                    />
                  ))}
                </div>
                {loadingMore && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white/90 rounded-3xl overflow-hidden shadow-xl animate-pulse">
                        <div className="h-96 bg-gray-300" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="flex gap-3 pt-4">
                            <div className="h-12 flex-1 rounded-full bg-gray-200" />
                            <div className="h-12 flex-1 rounded-full bg-gray-200" />
                            <div className="h-12 flex-1 rounded-full bg-gray-200" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={loadMoreTriggerRef} className="h-4" />
                {loadCount >= MAX_LAZY_LOADS && recommendations.length > 0 && (
                  <div className="text-center py-8 mt-6 bg-white/95 rounded-2xl border-2 border-white/50 shadow-xl max-w-lg mx-auto">
                    <p className="text-gray-700 font-semibold mb-4">Vui lòng Bắt đầu lại để đảm bảo trải nghiệm mượt mà.</p>
                    <button onClick={handleResetAndReload} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all cursor-pointer">
                      Bắt đầu lại
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedUser && (
            <ProfileModal
              user={selectedUser}
              userIndex={selectedUserIndex}
              totalUsers={recommendations.length}
              selectedAction={actionByUser[selectedUser.user._id] ?? null}
              onClose={() => setSelectedUser(null)}
              onPrev={() => goToProfile(-1)}
              onNext={() => goToProfile(1)}
              onLike={() => handleLike(selectedUser)}
              onDislike={() => handleDislike(selectedUser)}
              onSuperLike={() => handleSuperLike(selectedUser)}
            />
          )}

          {showConfig && <ConfigModal onClose={() => setShowConfig(false)} onAuthUpdated={refreshProfile} />}
          {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
          {showChat && <ChatModal onClose={() => setShowChat(false)} />}
          {showMyProfileModal && <MyProfileModal onClose={() => setShowMyProfileModal(false)} />}
          {showLog && <LogModal onClose={() => setShowLog(false)} />}
        </div>
      </div>
    </>
  );
}

export type ActionType = 'dislike' | 'superlike' | 'like' | null;

function RecommendationCard({
  recommendation,
  selectedAction,
  onLike,
  onDislike,
  onSuperLike,
  onViewProfile
}: {
  recommendation: Recommendation;
  selectedAction: ActionType;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
  onViewProfile: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [animating, setAnimating] = useState<string | null>(null);
  const photos = recommendation.user.photos || [];
  const detail = getUserDetail(recommendation);
  const currentPhoto = photos[photoIndex]?.url;

  // Preload ảnh kế cận để chuyển ảnh không bị đơ
  useEffect(() => {
    photos.forEach((p, i) => {
      const next = (photoIndex + 1) % photos.length;
      const prev = (photoIndex - 1 + photos.length) % photos.length;
      if (i === photoIndex || i === next || i === prev) {
        const img = new Image();
        img.src = p.url;
      }
    });
  }, [photos, photoIndex]);

  const runAction = (action: ActionType, handler: () => void) => {
    setAnimating(action);
    handler();
    setTimeout(() => setAnimating(null), 400);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex(i => (i <= 0 ? photos.length - 1 : i - 1));
  };
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex(i => (i >= photos.length - 1 ? 0 : i + 1));
  };

  const actionConfig = {
    dislike: { label: 'Dislike', color: 'from-red-500 to-pink-500', bg: 'bg-red-500', icon: 'M6 18L18 6M6 6l12 12' },
    superlike: { label: 'Super Like', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-500', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    like: { label: 'Like', color: 'from-green-400 to-emerald-500', bg: 'bg-green-500', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50 transition-all duration-300 group/card relative">
      {selectedAction && (
        <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-lg ${actionConfig[selectedAction].bg}`}>
          {actionConfig[selectedAction].label}
        </div>
      )}
      <div className="relative overflow-hidden">
        <div className="w-full min-h-[380px] h-96 bg-gray-100 relative">
          {currentPhoto ? (
            <img key={currentPhoto} src={currentPhoto} alt="" className="w-full h-full object-cover cursor-pointer group-hover/card:scale-105 transition-transform duration-500" onClick={onViewProfile} loading="eager" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
          {photos.length > 1 && (
            <>
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                {photos.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
              <button type="button" onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-black/70 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button type="button" onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-black/70 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {currentPhoto && (
              <a href={currentPhoto} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer" title="Tải ảnh">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </a>
            )}
            <button type="button" onClick={onViewProfile} className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer" title="Xem profile">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <h3 className="text-white font-extrabold text-xl drop-shadow-lg">{recommendation.user.name}{detail.age != null && `, ${detail.age}`}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90 text-sm mt-1">
              {detail.distance != null && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {detail.distance.toFixed(1)} km
                </span>
              )}
              {detail.city && <span>{detail.city}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-br from-white to-gray-50">
        {recommendation.user.bio && <p className="text-gray-700 text-sm mb-4 line-clamp-2 font-medium">{recommendation.user.bio}</p>}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => runAction('dislike', onDislike)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== 'dislike' ? 'opacity-40 hover:opacity-100' : ''} bg-gradient-to-br ${actionConfig.dislike.color} text-white`}
            title="Dislike"
          >
            <svg className={`w-7 h-7 ${animating === 'dislike' ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionConfig.dislike.icon} /></svg>
          </button>
          <button
            onClick={() => runAction('superlike', onSuperLike)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== 'superlike' ? 'opacity-40 hover:opacity-100' : ''} bg-gradient-to-br ${actionConfig.superlike.color} text-white`}
            title="Super Like"
          >
            <svg className={`w-7 h-7 ${animating === 'superlike' ? 'animate-bounce' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </button>
          <button
            onClick={() => runAction('like', onLike)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== 'like' ? 'opacity-40 hover:opacity-100' : ''} bg-gradient-to-br ${actionConfig.like.color} text-white`}
            title="Like"
          >
            <svg className={`w-7 h-7 ${animating === 'like' ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionConfig.like.icon} /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const profileModalActionConfig = {
  dislike: { label: 'Dislike', color: 'from-red-500 to-pink-500', bg: 'bg-red-500', icon: 'M6 18L18 6M6 6l12 12' },
  superlike: { label: 'Super Like', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-500', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  like: { label: 'Like', color: 'from-green-400 to-emerald-500', bg: 'bg-green-500', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' }
};

function ProfileModal({
  user,
  userIndex,
  totalUsers,
  selectedAction,
  onClose,
  onPrev,
  onNext,
  onLike,
  onDislike,
  onSuperLike
}: {
  user: Recommendation;
  userIndex: number;
  totalUsers: number;
  selectedAction: ActionType;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [animating, setAnimating] = useState<ActionType | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const photos = user.user.photos || [];
  const detail = getUserDetail(user);
  const currentPhoto = photos[photoIndex]?.url;

  useEffect(() => {
    setPhotoIndex(0);
    setImageLoaded(false);
  }, [user.user._id]);

  useEffect(() => {
    setImageLoaded(false);
  }, [currentPhoto]);

  useEffect(() => {
    photos.forEach((p, i) => {
      if (i === photoIndex || i === (photoIndex + 1) % (photos.length || 1) || i === (photoIndex - 1 + photos.length) % (photos.length || 1)) {
        const img = new Image();
        img.src = p.url;
      }
    });
  }, [photos, photoIndex]);

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex(i => (i <= 0 ? photos.length - 1 : i - 1));
  };
  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex(i => (i >= photos.length - 1 ? 0 : i + 1));
  };

  const runAction = (action: ActionType, handler: () => void) => {
    setAnimating(action);
    handler();
    setTimeout(() => {
      setAnimating(null);
      onNext();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      style={{ overflow: "hidden" }} // Ẩn scroll khi modal hiện
    >
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-30 cursor-pointer"
        disabled={userIndex <= 0}
        aria-label="Profile trước"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all disabled:opacity-30 cursor-pointer"
        disabled={userIndex >= totalUsers - 1}
        aria-label="Profile sau"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full min-h-[80vh] max-h-[90vh] flex flex-col border-2 border-white/30 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>
          {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          `}
        </style>
        {selectedAction && (
          <div className={`absolute top-14 right-12 z-20 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-lg ${profileModalActionConfig[selectedAction].bg}`}>
            {profileModalActionConfig[selectedAction].label}
          </div>
        )}
        <div className="flex-shrink-0 rounded-t-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 px-4 py-3 flex justify-between items-center z-10">
          <h2 className="text-xl font-extrabold text-white drop-shadow-lg truncate pr-2">{user.user.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-all hover:rotate-90 shrink-0 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          <div className="p-0">
            <div className="relative w-full overflow-hidden bg-black">
              <div className="aspect-[3/4] w-full block relative">
                {currentPhoto ? (
                  <>
                    {/* Blur-load: ảnh mờ nền, khi load xong hiện ảnh rõ phủ lên */}
                    <img
                      key={`blur-${currentPhoto}`}
                      src={currentPhoto}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-xl scale-105 opacity-80"
                      aria-hidden
                      draggable={false}
                    />
                    <img
                      key={currentPhoto}
                      src={currentPhoto}
                      alt=""
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                      loading="eager"
                      draggable={false}
                      style={{ userSelect: "none" }}
                      onLoad={() => setImageLoaded(true)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">No photo</span>
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <>
                  <div className="absolute top-2 left-0 right-0 flex justify-center gap-2">
                    {photos.map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-2 h-2 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={e => prevPhoto(e)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                    tabIndex={-1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  <button
                    type="button"
                    onClick={e => nextPhoto(e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                    tabIndex={-1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path></svg>
                  </button>
                  {currentPhoto && (
                    <>
                      <a
                        href={currentPhoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-20 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                        title="Tải ảnh về"
                        tabIndex={-1}
                        download
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-6-6m6 6l6-6M6 20h12" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowLightbox(true)}
                        className="absolute top-2 right-8 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
                        title="Xem ảnh lớn"
                        tabIndex={-1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="p-4 space-y-4" style={{ minHeight: '127px' }}>
              <div className="flex flex-wrap gap-4 text-gray-700 text-sm">
                {detail.age != null && (
                  <div>
                    <span className="font-semibold">Tuổi:</span> {detail.age}
                  </div>
                )}
                {detail.distance != null && (
                  <div>
                    <span className="font-semibold">Khoảng cách:</span> {detail.distance.toFixed(1)} km
                  </div>
                )}
                {detail.city && (
                  <div>
                    <span className="font-semibold">Sống tại:</span> {detail.city}
                  </div>
                )}
                {detail.school && (
                  <div>
                    <span className="font-semibold">Trường:</span> {detail.school}
                  </div>
                )}
                {detail.job && (
                  <div>
                    <span className="font-semibold">Công việc:</span> {detail.job}
                  </div>
                )}
              </div>
              {user.user.bio && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-800 mb-2">Giới thiệu</h3>
                  <p className="text-gray-700 leading-relaxed">{user.user.bio}</p>
                </div>
              )}

              <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-4 pt-2 pb-2">
                <button
                  type="button"
                  onClick={() => runAction("dislike", onDislike)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== "dislike"
                      ? "opacity-40 hover:opacity-100"
                      : ""
                    } bg-gradient-to-br ${profileModalActionConfig.dislike.color} text-white`}
                  title="Dislike"
                >
                  <svg
                    className={`w-7 h-7 ${animating === "dislike" ? "animate-bounce" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={profileModalActionConfig.dislike.icon} />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => runAction("superlike", onSuperLike)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== "superlike"
                      ? "opacity-40 hover:opacity-100"
                      : ""
                    } bg-gradient-to-br ${profileModalActionConfig.superlike.color} text-white`}
                  title="Super Like"
                >
                  <svg
                    className={`w-7 h-7 ${animating === "superlike" ? "animate-bounce" : ""}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d={profileModalActionConfig.superlike.icon} />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => runAction("like", onLike)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer ${selectedAction && selectedAction !== "like"
                      ? "opacity-40 hover:opacity-100"
                      : ""
                    } bg-gradient-to-br ${profileModalActionConfig.like.color} text-white`}
                  title="Like"
                >
                  <svg
                    className={`w-7 h-7 ${animating === "like" ? "animate-bounce" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={profileModalActionConfig.like.icon} />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLightbox && currentPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
          style={{ overflow: "hidden" }} // Ẩn scroll ở lightbox
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
            style={{ overflow: "hidden" }} // Ẩn scroll ở ảnh lớn
          >
            <img key={currentPhoto} src={currentPhoto} alt="" className="max-w-full max-h-[95vh] object-contain" draggable={false} style={{ userSelect: "none" }} />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    prevPhoto(e);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                  tabIndex={-1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    nextPhoto(e);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                  tabIndex={-1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path></svg>
                </button>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block w-2 h-2 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
              tabIndex={-1}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StartStopButtons() {
  const [isRunning, setIsRunning] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/start');
        const data = await res.json();
        setIsRunning(!!data.isAutoRunning);
      } catch (e) {
        console.error(e);
      }
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  const handleStart = async () => {
    try {
      const res = await fetch('/api/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsRunning(true);
        toast.success(data.message || 'Đã bắt đầu');
      } else toast.error(data.message || 'Không thể bắt đầu');
    } catch (e: any) {
      toast.error('Lỗi: ' + (e?.message || ''));
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsRunning(false);
        toast.success(data.message || 'Đã dừng');
      } else toast.error(data.message || 'Không thể dừng');
    } catch (e: any) {
      toast.error('Lỗi: ' + (e?.message || ''));
    }
  };

  return (
    <>
      <button onClick={handleStart} disabled={isRunning} className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 border-white/50 cursor-pointer ${isRunning ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-gradient-to-br from-green-600 to-teal-600 hover:scale-110'}`} title="Bắt đầu">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </button>
      <button onClick={handleStop} disabled={!isRunning} className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 border-white/50 cursor-pointer ${!isRunning ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-gradient-to-br from-red-600 to-pink-600 hover:scale-110'}`} title="Dừng">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" /></svg>
      </button>
    </>
  );
}
