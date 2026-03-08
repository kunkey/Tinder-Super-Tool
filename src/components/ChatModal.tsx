'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type MessageStatus = 'red' | 'yellow' | 'green' | null;

interface ChatMessage {
  message: string;
  from?: string;
  isMe?: boolean;
}

interface Match {
  _id: string;
  person: {
    name: string;
    photos: Array<{ url: string }>;
  };
  messages?: ChatMessage[];
  last_message?: { message: string };
  distance_mi?: number;
  distance_km?: number;
  lastMessageStatus?: MessageStatus;
}

export default function ChatModal({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unreplied' | 'messages' | 'bulkmessage'>('unreplied');
  const [unrepliedMatches, setUnrepliedMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Match[]>([]);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'unreplied') {
      fetchUnreplied();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab]);

  const fetchUnreplied = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      if (data.data?.data?.matches) {
        const unreplied = data.data.data.matches.filter((match: Match) => !match.last_message);
        setUnrepliedMatches(unreplied);
      }
    } catch (error) {
      console.error('Lỗi tải matches:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.data?.data?.matches) {
        const withMessages = data.data.data.matches.filter((match: Match) => 
          match.messages && match.messages.length > 0
        );
        setMessages(withMessages);
      }
    } catch (error) {
      console.error('Lỗi tải messages:', error);
    }
  };

  const sendMessage = async (matchId: string, message: string) => {
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, message })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Gửi tin nhắn thành công');
        if (activeTab === 'unreplied') fetchUnreplied();
        else fetchMessages();
      } else {
        toast.error(result.message || 'Lỗi khi gửi tin nhắn');
      }
    } catch (error) {
      toast.error('Lỗi khi gửi tin nhắn');
    }
  };

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
        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 px-8 py-6 flex justify-between items-center flex-shrink-0">
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3 drop-shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Tin nhắn
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:rotate-90">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-shrink-0 flex gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 px-6">
          <button
            onClick={() => setActiveTab('unreplied')}
            className={`pb-4 px-6 pt-4 font-semibold transition-all duration-300 relative ${
              activeTab === 'unreplied' 
                ? 'text-pink-600' 
                : 'text-gray-600 hover:text-pink-500'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tin nhắn chưa trả lời
            </span>
            {activeTab === 'unreplied' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-4 px-6 pt-4 font-semibold transition-all duration-300 relative ${
              activeTab === 'messages' 
                ? 'text-pink-600' 
                : 'text-gray-600 hover:text-pink-500'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Tin nhắn đã nhắn
            </span>
            {activeTab === 'messages' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bulkmessage')}
            className={`pb-4 px-6 pt-4 font-semibold transition-all duration-300 relative ${
              activeTab === 'bulkmessage' 
                ? 'text-pink-600' 
                : 'text-gray-600 hover:text-pink-500'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Gửi tin nhắn hàng loạt
            </span>
            {activeTab === 'bulkmessage' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-full"></div>
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50">
          {activeTab === 'unreplied' && (
            <div className="space-y-4">
              {unrepliedMatches.length === 0 ? (
                <div className="text-center py-12 glass-strong rounded-2xl border-2 border-white/30">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600 font-semibold text-lg">Không có match nào chưa trả lời</p>
                </div>
              ) : (
                unrepliedMatches.map((match) => (
                  <UnrepliedItem key={match._id} match={match} onSend={sendMessage} />
                ))
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 glass-strong rounded-2xl border-2 border-white/30">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-gray-600 font-semibold text-lg">Không có tin nhắn nào</p>
                </div>
              ) : (
                messages.map((match) => (
                  <MessageItem key={match._id} match={match} onSend={sendMessage} />
                ))
              )}
            </div>
          )}

          {activeTab === 'bulkmessage' && <BulkMessageTab />}
        </div>
      </div>
    </div>
  );
}

function UnrepliedItem({ match, onSend }: { match: Match; onSend: (id: string, msg: string) => void }) {
  const [message, setMessage] = useState('');

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-5 border-2 border-white/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <img src={match.person.photos[0]?.url} alt={getPersonDisplayName(match.person)} className="w-16 h-16 rounded-full object-cover border-4 border-pink-300 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg text-gray-800 mb-1">{getPersonDisplayName(match.person)}</div>
            {match.messages && match.messages.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-2 mt-1 line-clamp-2">
                {match.messages[match.messages.length - 1].message}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                onSend(match._id, message);
                setMessage('');
              }
            }}
            placeholder="Nhập tin nhắn..."
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 w-64"
          />
          <button
            onClick={() => {
              if (message.trim()) {
                onSend(match._id, message);
                setMessage('');
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-pink-500/50 hover:scale-105 transform flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ match, onSend }: { match: Match; onSend: (id: string, msg: string) => void }) {
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[] | null>(match.messages ?? null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const effectiveMessages = chatMessages ?? match.messages ?? [];
  const lastMessage = effectiveMessages[effectiveMessages.length - 1];
  const distance = match.distance_km || (match.distance_mi ? match.distance_mi * 1.60934 : null);

  const status = match.lastMessageStatus || null;
  let badgeColor = 'bg-gray-300';
  let badgeTitle = '';
  if (status === 'red') {
    badgeColor = 'bg-red-500';
    badgeTitle = 'Người kia nhắn, bạn chưa từng nhắn';
  } else if (status === 'yellow') {
    badgeColor = 'bg-yellow-400';
    badgeTitle = 'Người kia nhắn cuối, bạn chưa trả lời lại';
  } else if (status === 'green') {
    badgeColor = 'bg-green-500';
    badgeTitle = 'Bạn là người nhắn tin cuối';
  }

  const toggleHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (chatMessages && chatMessages.length > 0) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/messages/${match._id}?limit=100`);
      const payload = await res.json();
      if (payload.success && payload.data?.data?.messages) {
        setChatMessages(payload.data.data.messages as ChatMessage[]);
      }
    } catch (e) {
      console.error('Lỗi load đoạn hội thoại', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-5 border-2 border-white/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <img src={match.person.photos[0]?.url} alt={getPersonDisplayName(match.person)} className="w-16 h-16 rounded-full object-cover border-4 border-blue-300 shadow-lg" />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${badgeColor}`} title={badgeTitle}></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-bold text-lg text-gray-800">{getPersonDisplayName(match.person)}</div>
              <button
                type="button"
                onClick={toggleHistory}
                className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
              >
                {showHistory ? 'Ẩn đoạn chat' : loadingHistory ? 'Đang tải...' : 'Xem đoạn chat'}
              </button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              {distance && (
                <div className="flex items-center gap-1 text-sm text-blue-600 font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {distance.toFixed(1)} km
                </div>
              )}
            </div>
            {lastMessage && !showHistory && (
              <div className="text-sm text-gray-700 bg-blue-50 rounded-lg px-3 py-2 border-l-4 border-blue-500 line-clamp-2">
                {lastMessage.message}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                onSend(match._id, message);
                setMessage('');
              }
            }}
            placeholder="Nhập tin nhắn..."
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 w-64"
          />
          <button
            onClick={() => {
              if (message.trim()) {
                onSend(match._id, message);
                setMessage('');
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 hover:scale-105 transform flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Gửi
          </button>
        </div>
      </div>
      {showHistory && effectiveMessages && effectiveMessages.length > 0 && (
        <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-2">
          {effectiveMessages.map((m, idx) => (
            <div key={idx} className={`flex ${m.isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`inline-block px-3 py-2 rounded-2xl text-sm max-w-[70%] ${
                  m.isMe
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {m.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lấy tên hiển thị từ person (API đôi khi trả name là string hoặc object { name }). Luôn trả string. */
function getPersonDisplayName(person: { name?: unknown } | null | undefined): string {
  if (!person) return '—';
  let n: unknown = person.name;
  if (typeof n === 'string') return n;
  while (n && typeof n === 'object' && 'name' in n) {
    const next = (n as { name?: unknown }).name;
    if (typeof next === 'string') return next;
    n = next;
  }
  return '—';
}

/** Parse một dòng tin nhắn giống cấu hình: nhiều mẫu cách ; cuối dòng /0 hoặc /1 (random), thay {{name}} */
function parseBulkMessageLine(lines: string[], name: string): string | null {
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
  const parts = content.split(';').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const msg = randomAmong ? parts[Math.floor(Math.random() * parts.length)]! : parts[0]!;
  return msg.replace(/\{\{name\}\}/g, name);
}

function BulkMessageTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('xin chào {{name}};chào cậu nha;haluu đằng đó nha/1');
  const [delayMs, setDelayMs] = useState(2000);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<Record<string, 'success' | 'error'>>({});
  const [sentCount, setSentCount] = useState(0);

  const loadPage = async (pageToken: string | null, append: boolean) => {
    const url = pageToken
      ? `/api/messages?limit=60&page_token=${encodeURIComponent(pageToken)}`
      : '/api/messages?limit=60';
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(url);
      const payload = await res.json();
      if (!payload.success || !payload.data?.data?.matches) {
        if (!append) setMatches([]);
        return null;
      }
      const list = payload.data.data.matches as Match[];
      const nextToken = payload.data.data?.next_page_token ?? payload.data?.next_page_token ?? null;
      if (append) setMatches(prev => [...prev, ...list]);
      else setMatches(list);
      setNextPageToken(nextToken);
      return nextToken;
    } catch (e) {
      console.error('Lỗi tải danh sách match:', e);
      if (!append) setMatches([]);
      return null;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(null, false);
  }, []);

  const filteredMatches = searchQuery.trim()
    ? matches.filter(m => getPersonDisplayName(m.person).toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : matches;

  const selectedList = filteredMatches.filter(m => selectedIds.has(m._id));
  const totalSelected = selectedList.length;

  const selectAll = () => {
    setSelectedIds(new Set(filteredMatches.map(m => m._id)));
  };
  const deselectAll = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendBulk = async () => {
    const lines = messageText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Vui lòng nhập ít nhất một dòng tin nhắn');
      return;
    }
    if (totalSelected === 0) {
      toast.error('Vui lòng chọn ít nhất một người');
      return;
    }
    setIsSending(true);
    setSendResults({});
    setSentCount(0);
    let done = 0;
    for (const match of selectedList) {
        const text = parseBulkMessageLine(lines, getPersonDisplayName(match.person));
      if (!text) continue;
      try {
        const res = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match._id, message: text })
        });
        const result = await res.json();
        if (result.success) {
          setSendResults(r => ({ ...r, [match._id]: 'success' }));
          done += 1;
          setSentCount(done);
        } else {
          setSendResults(r => ({ ...r, [match._id]: 'error' }));
        }
      } catch {
        setSendResults(r => ({ ...r, [match._id]: 'error' }));
      }
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }
    setIsSending(false);
    toast.success(`Đã gửi ${done}/${totalSelected} tin nhắn`);
  };

  return (
    <div className="bg-white/95 rounded-2xl border-2 border-white/50 shadow-xl overflow-hidden flex flex-col max-h-[100vh]">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-bold text-gray-800">Gửi đến</h3>
      </div>
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người và nhóm"
            className="w-full py-2.5 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-800"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <button type="button" onClick={selectAll} className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Chọn tất cả</button>
          <span className="text-gray-500">|</span>
          <button type="button" onClick={deselectAll} className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Bỏ chọn tất cả</button>
        </div>
        <span className="text-sm font-bold text-gray-700">Đã chọn: {Number(totalSelected)}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Không có match nào</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredMatches.map(match => (
              <li key={match._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(match._id)}
                  onChange={() => toggleSelect(match._id)}
                  disabled={isSending}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <img src={match.person?.photos?.[0]?.url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" />
                <span className="flex-1 font-medium text-gray-800 truncate">{String(getPersonDisplayName(match.person))}</span>
                {sendResults[match._id] === 'success' && (
                  <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Thành công
                  </span>
                )}
                {sendResults[match._id] === 'error' && (
                  <span className="text-red-600 text-sm font-semibold">Lỗi</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {!loading && nextPageToken && (
          <div className="p-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => loadPage(nextPageToken, true)}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-xl border-2 border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? 'Đang tải...' : 'Xem thêm'}
            </button>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nội dung tin nhắn (mỗi dòng = 1 người, dùng {'{{name}}'}; mẫu cách ; cuối dòng /1 random)
          </label>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            rows={3}
            placeholder="xin chào {{name}};chào cậu nha;haluu đằng đó nha/1"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-800 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Delay giữa mỗi tin nhắn (ms)</label>
          <input
            type="number"
            min={0}
            max={120000}
            step={500}
            value={delayMs}
            onChange={e => setDelayMs(Math.max(0, Math.min(120000, parseInt(e.target.value) || 0)))}
            className="w-32 px-3 py-2 rounded-lg border-2 border-gray-200"
          />
          <span className="ml-2 text-xs text-gray-500">500 = 0.5s, 2000 = 2s</span>
        </div>
        {isSending && (
          <p className="text-sm font-bold text-blue-600">Đã gửi: {Number(sentCount)} / {Number(totalSelected)}</p>
        )}
        <button
          type="button"
          onClick={handleSendBulk}
          disabled={isSending || totalSelected === 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          Gửi
        </button>
      </div>
    </div>
  );
}
