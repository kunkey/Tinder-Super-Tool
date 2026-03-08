'use client';

import { useState, useEffect } from 'react';

interface FullProfile {
  name: string;
  photo: string | null;
  plan: string | null;
  photos: string[];
  bio: string | null;
  age: number | null;
  city: string | null;
  school: string | null;
  job: string | null;
}

const ALBUM_GRID_SIZE = 9;

export default function MyProfileModal({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'album'>('info');
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfile({
            name: data.data.name ?? '',
            photo: data.data.photo ?? null,
            plan: data.data.plan ?? null,
            photos: Array.isArray(data.data.photos) ? data.data.photos : [],
            bio: data.data.bio ?? null,
            age: data.data.age ?? null,
            city: data.data.city ?? null,
            school: data.data.school ?? null,
            job: data.data.job ?? null
          });
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const slots = Array.from({ length: ALBUM_GRID_SIZE }, (_, i) => profile?.photos?.[i] ?? null);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end items-stretch z-50 p-0 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white shadow-2xl w-full max-w-3xl sm:max-w-4xl h-full flex flex-col overflow-hidden transform transition-transform duration-300 ease-out rounded-l-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile của tôi
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors duration-200 cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-shrink-0 flex gap-2 border-b-2 border-gray-200 bg-gray-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-4 px-6 pt-4 font-semibold transition-all relative ${
              activeTab === 'info' ? 'text-pink-600' : 'text-gray-600 hover:text-pink-500'
            }`}
          >
            Thông tin
            {activeTab === 'info' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('album')}
            className={`pb-4 px-6 pt-4 font-semibold transition-all relative ${
              activeTab === 'album' ? 'text-pink-600' : 'text-gray-600 hover:text-pink-500'
            }`}
          >
            Album ảnh
            {activeTab === 'album' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-full" />
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-pink-50">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !profile ? (
            <div className="text-center py-12 text-gray-500">Không tải được profile.</div>
          ) : activeTab === 'info' ? (
            <div className="space-y-6">
              {profile.photo && (
                <div className="flex justify-center">
                  <img
                    src={profile.photo}
                    alt=""
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl"
                  />
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                {profile.name && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Tên</span>
                    <p className="text-gray-900 font-medium">{profile.name}</p>
                  </div>
                )}
                {profile.plan && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Gói</span>
                    <p className="text-gray-900 font-medium uppercase">{profile.plan}</p>
                  </div>
                )}
                {profile.age != null && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Tuổi</span>
                    <p className="text-gray-900 font-medium">{profile.age}</p>
                  </div>
                )}
                {profile.city && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Thành phố</span>
                    <p className="text-gray-900 font-medium">{profile.city}</p>
                  </div>
                )}
                {profile.school && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Trường</span>
                    <p className="text-gray-900 font-medium">{profile.school}</p>
                  </div>
                )}
                {profile.job && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Công việc</span>
                    <p className="text-gray-900 font-medium">{profile.job}</p>
                  </div>
                )}
                {profile.bio && (
                  <div>
                    <span className="text-sm font-semibold text-gray-500">Giới thiệu</span>
                    <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {slots.map((url, i) =>
                url ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div
                    key={`skeleton-${i}`}
                    className="aspect-square rounded-xl bg-gray-200 animate-pulse border-2 border-gray-100"
                    aria-hidden
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
