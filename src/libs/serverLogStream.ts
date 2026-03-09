import { io, type Socket } from 'socket.io-client';
import { addConsoleEntry, type ConsoleLevel } from '@/libs/consoleCapture';

type ServerLogPayload = {
  ts?: number;
  level?: ConsoleLevel;
  text?: string;
};

let installed = false;
let socket: Socket | null = null;

function normalizeLevel(level: unknown): ConsoleLevel {
  if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug' || level === 'log') return level;
  return 'log';
}

export function installServerLogStream() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  installed = true;

  socket = io({
    transports: ['websocket'],
    reconnection: true
  });

  socket.on('connect_error', (err) => {
    addConsoleEntry({
      level: 'warn',
      source: 'client',
      text: `[log-stream] WebSocket connect_error: ${err?.message || String(err)}`
    });
  });

  socket.on('server-log', (payload: ServerLogPayload) => {
    const text = typeof payload?.text === 'string' ? payload.text : String(payload?.text ?? '');
    if (!text) return;
    addConsoleEntry({
      level: normalizeLevel(payload?.level),
      source: 'server',
      ts: typeof payload?.ts === 'number' ? payload.ts : Date.now(),
      text
    });
  });

  socket.on('server-log-batch', (list: ServerLogPayload[]) => {
    if (!Array.isArray(list)) return;
    for (const p of list) {
      const text = typeof p?.text === 'string' ? p.text : String(p?.text ?? '');
      if (!text) continue;
      addConsoleEntry({
        level: normalizeLevel(p?.level),
        source: 'server',
        ts: typeof p?.ts === 'number' ? p.ts : Date.now(),
        text
      });
    }
  });
}

export function disconnectServerLogStream() {
  try {
    socket?.disconnect();
  } catch {
    // ignore
  } finally {
    socket = null;
    installed = false;
  }
}

