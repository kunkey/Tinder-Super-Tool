export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export type ConsoleSource = 'client' | 'server';

export interface ConsoleEntry {
  id: string;
  ts: number;
  level: ConsoleLevel;
  text: string;
  source: ConsoleSource;
}

type Listener = () => void;

let installed = false;
let maxEntries = 1000;

let entries: ConsoleEntry[] = [];
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function makeId() {
  try {
    const c = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
    if (typeof c.crypto?.randomUUID === 'function') return c.crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeStringify(value: unknown) {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_k, v) => {
        if (v instanceof Error) {
          return { name: v.name, message: v.message, stack: v.stack };
        }
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        if (typeof v === 'bigint') return v.toString();
        return v;
      },
      2
    );
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

function formatValue(v: unknown): string {
  if (v == null) return String(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint' || typeof v === 'symbol') return String(v);
  if (typeof v === 'function') return `[Function${v.name ? `: ${v.name}` : ''}]`;
  if (v instanceof Error) return v.stack || `${v.name}: ${v.message}`;
  const s = safeStringify(v);
  return typeof s === 'string' ? s : String(s);
}

function formatArgs(args: unknown[]) {
  return args.map(formatValue).join(' ');
}

export function subscribeConsoleEntries(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConsoleEntries() {
  return entries;
}

export function clearConsoleEntries() {
  entries = [];
  notify();
}

export function addConsoleEntry(input: {
  level: ConsoleLevel;
  text: string;
  source?: ConsoleSource;
  ts?: number;
}) {
  const next: ConsoleEntry = {
    id: makeId(),
    ts: input.ts ?? Date.now(),
    level: input.level,
    text: input.text,
    source: input.source ?? 'client'
  };
  entries = entries.length >= maxEntries ? [...entries.slice(1), next] : [...entries, next];
  notify();
}

export function installConsoleCapture(opts?: { maxEntries?: number }) {
  if (installed) return;
  if (typeof window === 'undefined') return;
  installed = true;
  if (opts?.maxEntries != null) maxEntries = Math.max(50, Math.floor(opts.maxEntries));

  const c = console as unknown as Record<string, unknown>;

  const patch = (level: ConsoleLevel) => {
    const original = (c[level] as (...a: unknown[]) => void) ?? (() => {});
    c[level] = (...args: unknown[]) => {
      try {
        addConsoleEntry({ level, text: formatArgs(args), source: 'client' });
      } catch {
        // ignore capture errors
      }
      try {
        original(...args);
      } catch {
        // ignore console errors
      }
    };
  };

  patch('log');
  patch('info');
  patch('warn');
  patch('error');
  patch('debug');
}

