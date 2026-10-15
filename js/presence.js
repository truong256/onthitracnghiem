const VISITOR_KEY = 'onthi_online_visitor_v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Anonymous browser presence, shared across tabs; no names, answers or history sent. */
export function startPresence({ element, window: win = globalThis.window, document: doc = globalThis.document, fetch: fetcher = globalThis.fetch } = {}) {
  if (!element || !win || !doc) return () => {};
  let visitorId;
  try { visitorId = win.localStorage.getItem(VISITOR_KEY); } catch { /* Storage can be disabled. */ }
  if (!UUID.test(visitorId)) {
    visitorId = win.crypto.randomUUID();
    try { win.localStorage.setItem(VISITOR_KEY, visitorId); } catch { /* Use this page's ID. */ }
  }
  let interval, pending, paused = false, disposed = false;
  function show(text, state) {
    element.textContent = text;
    element.dataset.state = state;
  }
  async function heartbeat() {
    if (disposed || paused || pending || doc.visibilityState === 'hidden') return;
    if (win.navigator.onLine === false) {
      show('Online: mất mạng', 'unavailable');
      return;
    }
    // Converge if first-ever tabs raced while creating the shared ID.
    try {
      const canonicalId = win.localStorage.getItem(VISITOR_KEY);
      if (UUID.test(canonicalId)) visitorId = canonicalId;
    } catch { /* Keep the in-memory ID when storage is unavailable. */ }
    const controller = new AbortController();
    pending = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher('/api/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }), cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) throw new Error('Presence unavailable');
      const { count } = await response.json();
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
      if (!disposed && !paused && !controller.signal.aborted) show(`${count.toLocaleString('vi-VN')} người online`, 'connected');
    } catch {
      if (!disposed && !paused && !controller.signal.aborted) show('Online: chưa kết nối', 'unavailable');
      else if (!disposed && !paused && win.navigator.onLine !== false) show('Online: chưa kết nối', 'unavailable');
    } finally {
      clearTimeout(timeout);
      if (pending === controller) pending = null;
    }
  }
  function resume() {
    if (disposed) return;
    paused = false;
    if (!interval) interval = win.setInterval(heartbeat, 30_000);
    void heartbeat();
  }
  function pause() {
    paused = true;
    win.clearInterval(interval);
    interval = null;
    pending?.abort();
    pending = null;
  }
  function offline() {
    pending?.abort();
    show('Online: mất mạng', 'unavailable');
  }
  function storageChanged(event) {
    if (event.key === VISITOR_KEY) void heartbeat();
  }
  const events = [[win, 'storage', storageChanged], [win, 'pagehide', pause], [win, 'pageshow', resume], [win, 'online', heartbeat], [win, 'offline', offline], [doc, 'visibilitychange', heartbeat]];
  events.forEach(([target, name, fn]) => target.addEventListener(name, fn));
  element.title = 'Số trình duyệt đang mở website ở tab hiển thị, cập nhật mỗi 30 giây. Các tab cùng trình duyệt được gộp; tự hết online sau tối đa 90 giây không cập nhật.';
  show('Online: đang kết nối…', 'connecting');
  resume();
  return () => {
    disposed = true;
    pause();
    events.forEach(([target, name, fn]) => target.removeEventListener(name, fn));
  };
}
