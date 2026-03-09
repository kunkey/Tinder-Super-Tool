'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  clearConsoleEntries,
  type ConsoleSource,
  getConsoleEntries,
  installConsoleCapture,
  subscribeConsoleEntries,
  type ConsoleEntry,
  type ConsoleLevel
} from '@/libs/consoleCapture';

function levelColor(level: ConsoleLevel) {
  if (level === 'error') return 'text-red-600';
  if (level === 'warn') return 'text-amber-700';
  if (level === 'info') return 'text-blue-700';
  if (level === 'debug') return 'text-slate-600';
  return 'text-slate-900';
}

function levelBadge(level: ConsoleLevel) {
  if (level === 'error') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'warn') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (level === 'info') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (level === 'debug') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function toPlainText(list: ConsoleEntry[]) {
  return list
    .map(e => `[${formatTime(e.ts)}] ${e.source.toUpperCase()} ${e.level.toUpperCase()} ${e.text}`)
    .join('\n');
}

function sourceBadge(source: ConsoleSource) {
  if (source === 'server') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-purple-100 text-purple-800 border-purple-200';
}

export default function LogModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<ConsoleEntry[]>(() => getConsoleEntries());
  const [filter, setFilter] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    installConsoleCapture();
    return subscribeConsoleEntries(() => {
      setEntries(getConsoleEntries());
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => (e.text || '').toLowerCase().includes(q) || e.level.includes(q) || e.source.includes(q));
  }, [entries, filter]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    stickToBottomRef.current = atBottom;
  };

  const handleCopy = async () => {
    const text = toPlainText(filtered);
    if (!text) {
      toast.error('Không có log để copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã copy log');
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleClear = () => {
    clearConsoleEntries();
    toast.success('Đã xoá log');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-start items-stretch z-50 p-0 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl w-full max-w-3xl sm:max-w-4xl h-full flex flex-col overflow-hidden sm:rounded-r-2xl sm:rounded-l-none animate-[slide-in-left_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-8 0h8m-9 4h10a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Log stdout (console)
            </h2>
            <p className="text-white/70 text-sm font-medium truncate">
              {filtered.length}/{entries.length} dòng
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/15 rounded-full p-2 transition-colors duration-200 cursor-pointer"
            aria-label="Đóng"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Lọc theo nội dung hoặc level (error/warn/info...)"
                className="w-full py-2.5 pl-10 pr-3 rounded-xl border-2 border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 bg-white text-gray-800"
              />
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              title="Copy log"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
              title="Xoá log"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="h-full overflow-y-auto p-4 bg-gradient-to-br from-white to-slate-50"
          >
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Không có log.
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((e) => (
                  <li key={e.id} className="rounded-xl border border-gray-200 bg-white/90 shadow-sm">
                    <div className="flex items-start gap-3 px-3 py-2">
                      <span className="text-xs font-mono text-gray-500 pt-0.5 shrink-0">
                        {formatTime(e.ts)}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${sourceBadge(e.source)}`}>
                        {e.source.toUpperCase()}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${levelBadge(e.level)}`}>
                        {e.level.toUpperCase()}
                      </span>
                      <pre className={`text-sm font-mono whitespace-pre-wrap wrap-break-word flex-1 ${levelColor(e.level)}`}>
                        {e.text}
                      </pre>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

