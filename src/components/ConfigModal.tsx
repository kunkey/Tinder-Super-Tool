'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Auth {
  meID: string;
  'app-session-id': string;
  'app-session-time-elapsed': string;
  'persistent-device-id': string;
  'user-session-id': string;
  'user-session-time-elapsed': string;
  'x-auth-token': string;
}

interface CatalogItem {
  catalog_id: string;
  title: string;
  title_non_localized: string;
}

interface Settings {
  likeRecommendUser: boolean;
  likeCatalogUser?: boolean;
  selectedCatalogIds?: string[];
  sendMessageToMatchedUser: boolean;
  message: string[];
  likeDelayMs?: number;
  messageDelayMs?: number;
  location: { lat: number; long: number };
  unMatch: { distance: number; gender: string };
  autoExpandDistance?: boolean;
  autoExpandDistanceMax?: number;
  ageFilterMin?: number;
  ageFilterMax?: number;
  autoExpansionAgeToggle?: boolean;
  autoExpansionDistanceToggle?: boolean;
}

export default function ConfigModal({
  onClose,
  onAuthUpdated
}: {
  onClose: () => void;
  onAuthUpdated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<Auth>({
    meID: '',
    'app-session-id': '',
    'app-session-time-elapsed': '',
    'persistent-device-id': '',
    'user-session-id': '',
    'user-session-time-elapsed': '',
    'x-auth-token': ''
  });
  const [settings, setSettings] = useState<Settings>({
    likeRecommendUser: false,
    likeCatalogUser: false,
    selectedCatalogIds: [],
    sendMessageToMatchedUser: false,
    message: [],
    likeDelayMs: 5000,
    messageDelayMs: 10000,
    location: { lat: 0, long: 0 },
    unMatch: { distance: 0, gender: 'all' },
    autoExpandDistance: false,
    autoExpandDistanceMax: 50,
    ageFilterMin: 18,
    ageFilterMax: 26,
    autoExpansionAgeToggle: true,
    autoExpansionDistanceToggle: true
  });
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showMessageHelp, setShowMessageHelp] = useState(false);
  const [loadingTinderLocation, setLoadingTinderLocation] = useState(false);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [authJsonInput, setAuthJsonInput] = useState('');

  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    // Load config from API
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.auth) {
          setAuth(data.auth);
          setAuthJsonInput(JSON.stringify(data.auth, null, 2));
        }
        if (data.settings) {
          let gender = data.settings.unMatch?.gender ?? 'all';
          if (!data.settings._genderVersion) {
            const migrated: Record<string, string> = { '0': 'all', '1': '0', '2': '1' };
            gender = migrated[gender] ?? 'all';
          }
          setSettings({
            ...data.settings,
            likeCatalogUser: data.settings.likeCatalogUser ?? false,
            selectedCatalogIds: data.settings.selectedCatalogIds ?? [],
            unMatch: {
              ...data.settings.unMatch,
              gender: ['all', '0', '1', '2'].includes(gender) ? gender : 'all'
            },
            autoExpandDistance: data.settings.autoExpandDistance ?? false,
            autoExpandDistanceMax: data.settings.autoExpandDistanceMax ?? 50,
            ageFilterMin: data.settings.ageFilterMin ?? 18,
            ageFilterMax: data.settings.ageFilterMax ?? 26,
            autoExpansionAgeToggle: data.settings.autoExpansionAgeToggle ?? true,
            autoExpansionDistanceToggle: data.settings.autoExpansionDistanceToggle ?? true,
            likeDelayMs: data.settings.likeDelayMs ?? 5000,
            messageDelayMs: data.settings.messageDelayMs ?? 10000
          });
        }
      })
      .catch(err => console.error('Lỗi load config:', err));
  }, []);

  useEffect(() => {
    if (settings.likeCatalogUser) {
      setLoadingCatalog(true);
      fetch('/api/explore')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) setCatalogItems(data.data);
          else setCatalogItems([]);
        })
        .catch(() => setCatalogItems([]))
        .finally(() => setLoadingCatalog(false));
    } else {
      setCatalogItems([]);
    }
  }, [settings.likeCatalogUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/update-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message, { duration: 4000, icon: '✅', style: { background: '#22c55e', color: 'white' } });
        if (result.name) setAuthJsonInput(JSON.stringify({ ...auth }, null, 2));
        if (onAuthUpdated) {
          onAuthUpdated();
        }
      } else {
        toast.error(result.message || 'Lỗi khi cập nhật auth');
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật auth');
    }
  };

  const applyAuthFromJson = () => {
    try {
      const parsed = JSON.parse(authJsonInput) as Record<string, string>;
      const next: Auth = {
        meID: parsed.meID ?? auth.meID,
        'app-session-id': parsed['app-session-id'] ?? auth['app-session-id'],
        'app-session-time-elapsed': parsed['app-session-time-elapsed'] ?? auth['app-session-time-elapsed'],
        'persistent-device-id': parsed['persistent-device-id'] ?? auth['persistent-device-id'],
        'user-session-id': parsed['user-session-id'] ?? auth['user-session-id'],
        'user-session-time-elapsed': parsed['user-session-time-elapsed'] ?? auth['user-session-time-elapsed'],
        'x-auth-token': parsed['x-auth-token'] ?? auth['x-auth-token']
      };
      setAuth(next);
      setAuthJsonInput(JSON.stringify(next, null, 2));
      toast.success('Đã áp dụng JSON');
    } catch {
      toast.error('JSON không hợp lệ');
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dist = settings.unMatch.distance;
    const maxDist = settings.autoExpandDistanceMax ?? 50;
    const ageMin = settings.ageFilterMin ?? 18;
    const ageMax = settings.ageFilterMax ?? 26;
    if (dist < 0 || dist > 100) {
      toast.error('Phạm vi bán kính phải từ 0 đến 100 km');
      return;
    }
    if (settings.autoExpandDistance && (maxDist < dist || maxDist > 160)) {
      toast.error('Khoảng cách tối đa tự tăng phải lớn hơn bán kính và không quá 160 km');
      return;
    }
    if (ageMin < 18 || ageMin > 100 || ageMax < 18 || ageMax > 100 || ageMin > ageMax) {
      toast.error('Độ tuổi phải từ 18-100 và tuổi tối thiểu không được lớn hơn tối đa');
      return;
    }
    const lat = settings.location.lat;
    const long = settings.location.long;
    const hasLocation = (lat !== 0 || long !== 0) && Number.isFinite(lat) && Number.isFinite(long);
    if (hasLocation) {
      const latStr = lat.toFixed(3);
      const longStr = long.toFixed(3);
      if (!/^-?\d+\.\d{3}$/.test(latStr)) {
        toast.error('Vĩ độ phải có đủ 3 chữ số sau dấu chấm (vd: 20.685)');
        return;
      }
      if (!/^-?\d+\.\d{3}$/.test(longStr)) {
        toast.error('Kinh độ phải có đủ 3 chữ số sau dấu chấm (vd: 106.482)');
        return;
      }
    }
    const formData = new FormData();
    formData.append('likeRecommendUser', settings.likeRecommendUser ? 'on' : '');
    formData.append('likeCatalogUser', settings.likeCatalogUser ? 'on' : '');
    formData.append('selectedCatalogIds', JSON.stringify(settings.selectedCatalogIds || []));
    formData.append('sendMessageToMatchedUser', settings.sendMessageToMatchedUser ? 'on' : '');
    const filteredMessages = settings.message.filter(m => m.trim());
    formData.append('message', filteredMessages.join('\n'));
    formData.append('lat', Number.isFinite(settings.location.lat) ? settings.location.lat.toFixed(3) : '0.000');
    formData.append('long', Number.isFinite(settings.location.long) ? settings.location.long.toFixed(3) : '0.000');
    formData.append('distance', dist.toString());
    formData.append('gender', settings.unMatch.gender);
    formData.append('autoExpandDistance', settings.autoExpandDistance ? 'on' : '');
    formData.append('autoExpandDistanceMax', (settings.autoExpandDistanceMax ?? 50).toString());
    formData.append('ageFilterMin', (settings.ageFilterMin ?? 18).toString());
    formData.append('ageFilterMax', (settings.ageFilterMax ?? 26).toString());
    formData.append('autoExpansionAgeToggle', settings.autoExpansionAgeToggle !== false ? 'on' : '');
    formData.append('autoExpansionDistanceToggle', settings.autoExpansionDistanceToggle !== false ? 'on' : '');
    formData.append('likeDelayMs', String(settings.likeDelayMs ?? 5000));
    formData.append('messageDelayMs', String(settings.messageDelayMs ?? 10000));

    try {
      const response = await fetch('/api/update-settings', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Lỗi khi cập nhật cài đặt');
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật cài đặt');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end items-stretch z-50 p-0 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white shadow-2xl w-full max-w-3xl sm:max-w-4xl h-full flex flex-col overflow-hidden transform transition-transform duration-300 ease-out sm:rounded-l-2xl sm:rounded-r-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cấu hình
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors duration-200 cursor-pointer"
            aria-label="Đóng"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Auth Section */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-2 pb-3 border-b-2 border-blue-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Cấu hình Auth Tinder
              </h3>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    Import JSON (từ script getAuthScript.Devtools.js)
                    <button type="button" onClick={() => setShowAuthHelp(!showAuthHelp)} className="text-blue-500 hover:text-blue-700 cursor-pointer" title="Hướng dẫn">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  </label>
                  {showAuthHelp && (
                    <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700 space-y-1">
                      <p>1. Mở Tinder trên trình duyệt, đăng nhập, vào trang Profile.</p>
                      <p>2. Mở DevTools (F12) → Console.</p>
                      <p>3. Dán và chạy script từ file getAuthScript.Devtools.js.</p>
                      <p>4. Script sẽ log ra JSON session. Copy và dán vào ô bên dưới, bấm Áp dụng JSON.</p>
                    </div>
                  )}
                  <textarea
                    value={authJsonInput}
                    onChange={e => setAuthJsonInput(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-mono text-sm"
                    placeholder='{"x-auth-token":"...", "app-session-id":"...", ...}'
                  />
                  <button type="button" onClick={applyAuthFromJson} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 cursor-pointer">
                    Áp dụng JSON
                  </button>
                </div>
                {Object.entries(auth).map(([key, value]) => (
                  <div key={key} className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor={`auth-${key}`}>
                      {key}
                    </label>
                    <input
                      id={`auth-${key}`}
                      type="text"
                      value={value}
                      onChange={e => {
                        const next = { ...auth, [key]: e.target.value };
                        setAuth(next);
                        setAuthJsonInput(JSON.stringify(next, null, 2));
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white text-gray-800 placeholder-gray-400"
                      required
                      placeholder={`Nhập ${key}...`}
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cập nhật Auth
                  </span>
                </button>
              </form>
            </section>
            {/* Settings Section */}
            <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-purple-700 flex items-center gap-2 pb-3 border-b-2 border-purple-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cấu hình cài đặt tự động
              </h3>
              <form onSubmit={handleSettingsSubmit} className="space-y-5">
                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-center p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={settings.likeRecommendUser}
                      onChange={e => setSettings({ ...settings, likeRecommendUser: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-700 font-medium group-hover:text-blue-600">Like người dùng được đề xuất</span>
                  </label>
                  {settings.likeRecommendUser && (
                    <div className="ml-8">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Delay giữa mỗi like (ms)</label>
                      <input
                        type="number"
                        min={0}
                        max={60000}
                        step={500}
                        value={settings.likeDelayMs ?? 5000}
                        onChange={e => setSettings({ ...settings, likeDelayMs: Math.max(0, Math.min(60000, parseInt(e.target.value) || 0)) })}
                        className="w-32 px-3 py-2 border-2 border-gray-200 rounded-lg"
                      />
                      <span className="ml-2 text-xs text-gray-500">500 = 0.5s, 1000 = 1s (áp dụng cả like theo chủ đề)</span>
                    </div>
                  )}
                  <label className="flex items-center p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={settings.likeCatalogUser}
                      onChange={e => setSettings({ ...settings, likeCatalogUser: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-700 font-medium group-hover:text-blue-600">Like người dùng chung chủ đề</span>
                  </label>
                  {settings.likeCatalogUser && (
                    <div className="ml-8 mt-2 p-3 rounded-lg bg-white border-2 border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Chọn chủ đề:</p>
                      {loadingCatalog ? (
                        <p className="text-sm text-gray-500">Đang tải danh sách chủ đề...</p>
                      ) : catalogItems.length === 0 ? (
                        <p className="text-sm text-gray-500">Không có chủ đề nào. Vui lòng đăng nhập và thử lại.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {catalogItems.map(item => (
                            <label key={item.catalog_id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(settings.selectedCatalogIds || []).includes(item.catalog_id)}
                                onChange={e => {
                                  const ids = settings.selectedCatalogIds || [];
                                  const newIds = e.target.checked
                                    ? [...ids, item.catalog_id]
                                    : ids.filter(id => id !== item.catalog_id);
                                  setSettings({ ...settings, selectedCatalogIds: newIds });
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{item.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <label className="flex items-center p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={settings.sendMessageToMatchedUser}
                      onChange={e => {
                      const checked = e.target.checked;
                      const next = { ...settings, sendMessageToMatchedUser: checked };
                      if (checked && (!settings.message || settings.message.length === 0)) {
                        next.message = ['xin chào {{name}};chào cậu nha;haluu đằng đó nha/1'];
                      }
                      setSettings(next);
                    }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-700 font-medium group-hover:text-blue-600">Gửi tin nhắn cho người dùng đã match</span>
                  </label>
                  {settings.sendMessageToMatchedUser && (
                    <>
                      <div className="ml-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Delay giữa mỗi tin nhắn (ms)</label>
                        <input
                          type="number"
                          min={0}
                          max={120000}
                          step={500}
                          value={settings.messageDelayMs ?? 10000}
                          onChange={e => setSettings({ ...settings, messageDelayMs: Math.max(0, Math.min(120000, parseInt(e.target.value) || 0)) })}
                          className="w-32 px-3 py-2 border-2 border-gray-200 rounded-lg"
                        />
                        <span className="ml-2 text-xs text-gray-500">500 = 0.5s, 1000 = 1s</span>
                      </div>
                      <div className="ml-8 mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          Nội dung tin nhắn (mỗi dòng = 1 người)
                          <button type="button" onClick={() => setShowMessageHelp(!showMessageHelp)} className="text-blue-500 hover:text-blue-700 cursor-pointer" title="Hướng dẫn">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        </label>
                        {showMessageHelp && (
                          <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700 space-y-1">
                            <p className="font-semibold">Mỗi dòng: nhiều tin phân cách bằng ; Cuối dòng có thể thêm /0 (cố định) hoặc /1 (random trong dòng).</p>
                            <p>Shorttags: {'{{name}}'} (tên), {'{{age}}'} (tuổi), {'{{distance}}'} (km), {'{{city}}'} (thành phố), {'{{job}}'} (nghề), {'{{school}}'} (trường), {'{{bio}}'} (giới thiệu).</p>
                            <p>Ví dụ: xin chào {'{{name}}'};chào cậu nha;haluu đằng đó nha/1</p>
                          </div>
                        )}
                        <textarea
                          id="settings-messages"
                          value={settings.message.join('\n')}
                          onChange={e => setSettings({ ...settings, message: e.target.value.split('\n') })}
                          rows={5}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white text-gray-800 resize-y"
                          placeholder="xin chào {{name}};chào cậu nha;haluu đằng đó nha/1"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Gender + Location - cùng hàng */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="settings-gender">Giới tính đối tượng match</label>
                    <select
                      id="settings-gender"
                      value={settings.unMatch.gender}
                      onChange={e => setSettings({ ...settings, unMatch: { ...settings.unMatch, gender: e.target.value } })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-gray-800 cursor-pointer"
                    >
                      <option value="all">Tất cả</option>
                      <option value="0">Nam</option>
                      <option value="1">Nữ</option>
                      <option value="2">Ngoại lệ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="settings-lat">Set vĩ độ (bắt buộc đủ ký tự)</label>
                    <input
                      id="settings-lat"
                      type="text"
                      inputMode="decimal"
                      value={Number.isFinite(settings.location.lat) ? settings.location.lat.toFixed(3) : ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^-?\d*\.?\d{0,3}$/.test(v) || v === '') {
                          const n = parseFloat(v);
                          setSettings({
                            ...settings,
                            location: { ...settings.location, lat: isNaN(n) ? 0 : Math.round(n * 1000) / 1000 }
                          });
                        }
                      }}
                      onBlur={e => {
                        const n = parseFloat(e.target.value);
                        if (!isNaN(n)) {
                          setSettings({
                            ...settings,
                            location: { ...settings.location, lat: Math.round(n * 1000) / 1000 }
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-gray-800"
                      placeholder="20.685"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="settings-long">Set kinh độ (bắt buộc đủ ký tự)</label>
                    <input
                      id="settings-long"
                      type="text"
                      inputMode="decimal"
                      value={Number.isFinite(settings.location.long) ? settings.location.long.toFixed(3) : ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^-?\d*\.?\d{0,3}$/.test(v) || v === '') {
                          const n = parseFloat(v);
                          setSettings({
                            ...settings,
                            location: { ...settings.location, long: isNaN(n) ? 0 : Math.round(n * 1000) / 1000 }
                          });
                        }
                      }}
                      onBlur={e => {
                        const n = parseFloat(e.target.value);
                        if (!isNaN(n)) {
                          setSettings({
                            ...settings,
                            location: { ...settings.location, long: Math.round(n * 1000) / 1000 }
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-gray-800"
                      placeholder="106.482"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingTinderLocation(true);
                      try {
                        const res = await fetch('/api/profile');
                        const data = await res.json();
                        if (data.success && data.data?.pos) {
                          const { lat, lon } = data.data.pos;
                          setSettings({ ...settings, location: { lat, long: lon } });
                          toast.success('Đã lấy vị trí từ Tinder');
                        } else {
                          toast.error(data.message || 'Không lấy được vị trí');
                        }
                      } catch {
                        toast.error('Lỗi khi gọi API');
                      } finally {
                        setLoadingTinderLocation(false);
                      }
                    }}
                    disabled={loadingTinderLocation}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingTinderLocation ? 'Đang lấy...' : 'Sử dụng vị trí hiện tại từ Tinder'}
                  </button>
                </div>
                {/* Phạm vi bán kính & Auto expand */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="settings-distance">Phạm vi trong bán kính (km)</label>
                    <input
                      id="settings-distance"
                      type="number"
                      min={0}
                      max={100}
                      value={settings.unMatch.distance}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          unMatch: { ...settings.unMatch, distance: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) },
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white text-gray-800"
                      placeholder="0"
                    />
                  </div>
                  <label className="flex items-center p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={settings.autoExpandDistance}
                      onChange={e => setSettings({ ...settings, autoExpandDistance: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-700 font-medium group-hover:text-blue-600">Tự động tăng 1km phạm vi khi hết người dùng</span>
                  </label>
                  {settings.autoExpandDistance && (
                    <div className="ml-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="settings-auto-expand-max">Khoảng cách tối đa có thể tự tăng (km)</label>
                      <input
                        id="settings-auto-expand-max"
                        type="number"
                        min={settings.unMatch.distance + 1}
                        max={160}
                        value={settings.autoExpandDistanceMax ?? 50}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            autoExpandDistanceMax: Math.max(settings.unMatch.distance + 1, Math.min(160, parseInt(e.target.value) || settings.unMatch.distance + 1))
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white text-gray-800"
                        placeholder="50"
                      />
                    </div>
                  )}
                </div>
                {/* Độ tuổi ưu tiên - 2 thanh riêng, phần đã kéo có màu */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Độ tuổi ưu tiên: <span className="text-pink-600 font-bold">{settings.ageFilterMin ?? 18}</span> - <span className="text-pink-600 font-bold">{settings.ageFilterMax ?? 26}</span> tuổi
                  </label>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-gray-500">Từ</span>
                      <div className="relative h-6 flex items-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-[width] duration-100" style={{ width: `${((settings.ageFilterMin ?? 18) - 18) / 82 * 100}%` }} />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={100}
                          value={settings.ageFilterMin ?? 18}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            const max = settings.ageFilterMax ?? 26;
                            setSettings({ ...settings, ageFilterMin: Math.min(v, max) });
                          }}
                          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Đến</span>
                      <div className="relative h-6 flex items-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-[width] duration-100" style={{ width: `${((settings.ageFilterMax ?? 26) - 18) / 82 * 100}%` }} />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={100}
                          value={Math.max(settings.ageFilterMax ?? 26, settings.ageFilterMin ?? 18)}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            const min = settings.ageFilterMin ?? 18;
                            setSettings({ ...settings, ageFilterMax: Math.max(v, min) });
                          }}
                          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>18</span>
                    <span>100</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Chỉ quẹt người dùng trong phạm vi độ tuổi và khoảng cách này</p>
                </div>
                {/* Auto expansion toggles */}
                <div className="space-y-2 p-3 rounded-lg bg-white border-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Cho phép mở rộng khi hết người:</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoExpansionAgeToggle !== false}
                      onChange={e => setSettings({ ...settings, autoExpansionAgeToggle: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Mở rộng độ tuổi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoExpansionDistanceToggle !== false}
                      onChange={e => setSettings({ ...settings, autoExpansionDistanceToggle: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Mở rộng khoảng cách</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cập nhật Cài đặt
                  </span>
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
