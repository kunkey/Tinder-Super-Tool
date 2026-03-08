'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AUTH_SCRIPT = `// ================================================
//  🔥 TINDER SUPER TOOL AUTH DEVTOOLS SCRIPT 🔥
//   © 2024 by kunkeypr - All Rights Reserved
//     "Hack the planet, but with style 😎"
// ------------------------------------------------
//      Github: https://github.com/kunkey
// ================================================

(() => {
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    if (typeof url === "string" && url.includes("api.gotinder.com/v2/profile")) {
      const h = options?.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : (options?.headers || {});
      const r = {
        meID: null,
        "app-session-id": h["app-session-id"] || h["App-Session-Id"],
        "app-session-time-elapsed": h["app-session-time-elapsed"] || h["App-Session-Time-Elapsed"],
        "persistent-device-id": h["persistent-device-id"] || h["Persistent-Device-Id"],
        "user-session-id": h["user-session-id"] || h["User-Session-Id"],
        "user-session-time-elapsed": h["user-session-time-elapsed"] || h["User-Session-Time-Elapsed"],
        "x-auth-token": h["x-auth-token"] || h["X-Auth-Token"],
        locale: "vi"
      };
      try {
        const json = await (await _fetch(...args)).clone().json();
        r.meID = json?.data?.user?._id || null;
        console.log("TINDER SESSION JSON:");
        console.log(JSON.stringify(r, null, 2));
        window.__TINDER_SESSION__ = r;
      } catch (e) {
        console.error("Parse response error", e);
      }
      return _fetch(...args);
    }
    return _fetch(...args);
  };
})();`;

export default function GuideModal({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AUTH_SCRIPT);
      toast.success('Đã copy script vào clipboard');
    } catch {
      toast.error('Không thể copy');
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
        {/* Header - giống ConfigModal */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Hướng dẫn lấy Auth Token
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
          <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-amber-800 flex items-center gap-2 pb-2 border-b-2 border-amber-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Các bước thực hiện
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 font-medium">
              <li>Mở Tinder trên trình duyệt (Chrome/Edge), đăng nhập tài khoản.</li>
              <li>Vào trang <strong>Profile</strong> của bạn (trang cá nhân).</li>
              <li>Mở <strong>DevTools</strong> (nhấn F12 hoặc chuột phải → Kiểm tra).</li>
              <li>Chọn tab <strong>Console</strong> trong DevTools.</li>
              <li>Copy toàn bộ script bên dưới (dùng nút Copy), dán vào Console và nhấn Enter.</li>
              <li>Script sẽ lọc và lấy các header cần thiết từ request tới API profile và in ra JSON session trong Console (dòng có <code className="bg-amber-100 px-1 rounded">📦 TINDER SESSION JSON</code>).</li>
              <li>Copy JSON đó, mở <strong>Cấu hình</strong> → dán vào ô Import JSON → bấm <strong>Áp dụng JSON</strong> → <strong>Cập nhật Auth</strong>.</li>
            </ol>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-bold mb-3 text-gray-800">Script (chạy trong Console)</h3>
            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-900 shadow-lg">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-sm font-semibold shadow border border-gray-200 cursor-pointer transition-colors"
                title="Copy script"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <pre className="p-4 pr-24 pt-14 overflow-x-auto text-sm text-gray-100 font-mono whitespace-pre leading-relaxed">
                <code>{AUTH_SCRIPT}</code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
