/**
 * Realtime Presence & Analytics Engine with Firebase Realtime Database
 * 
 * Features:
 * - Anonymous visitor identification (Zero PII, privacy-first)
 * - Multi-tab deduplication (Same browser tabs counted as 1 online visitor)
 * - Firebase presence tracking with onDisconnect() and visibility heartbeat
 * - Distinction between open background sessions and active users
 * - Live quiz taker counter (synced with screen transitions)
 * - Daily and total unique visitors calculation
 * - Graceful fallback / offline degradation mode
 */

import { getFirebaseConfig, isFirebaseConfigured } from './firebaseConfig.js';

// Local storage keys
export const STORAGE_KEYS = {
  VISITOR_ID: 'quiz_visitor_id',
  TAB_ID: 'quiz_tab_id',
  VISIT_TODAY: 'quiz_visit_today',
  HAS_VISITED: 'quiz_has_visited',
  STATS_CACHE: 'quiz_stats_cache'
};

/**
 * Format today's date in Vietnam Timezone (Asia/Ho_Chi_Minh: UTC+7) as YYYY-MM-DD
 */
export function getTodayDateString(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Format date for friendly UI display (e.g., "15/10/2026")
 */
export function formatFriendlyDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 'Hôm nay';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Get or create an anonymous visitor ID stored in localStorage
 */
export function getOrCreateVisitorId(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (storage) {
    const existing = storage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (existing) return existing;
  }

  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 10);
  const newId = `u_${Date.now().toString(36)}_${randomPart1}${randomPart2}`;

  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.VISITOR_ID, newId);
    } catch (e) {}
  }
  return newId;
}

/**
 * Get or create a unique tab ID stored in sessionStorage
 */
export function getOrCreateTabId(storage = (typeof sessionStorage !== 'undefined' ? sessionStorage : null)) {
  if (storage) {
    const existing = storage.getItem(STORAGE_KEYS.TAB_ID);
    if (existing) return existing;
  }

  const randomPart = Math.random().toString(36).substring(2, 8);
  const newTabId = `tab_${Date.now().toString(36)}_${randomPart}`;

  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.TAB_ID, newTabId);
    } catch (e) {}
  }
  return newTabId;
}

/**
 * Check if today's visit should be recorded
 */
export function shouldRecordDailyVisit(storage = (typeof localStorage !== 'undefined' ? localStorage : null), todayStr = getTodayDateString()) {
  if (!storage) return true;
  const lastRecorded = storage.getItem(STORAGE_KEYS.VISIT_TODAY);
  return lastRecorded !== todayStr;
}

/**
 * Check if first-ever visit should be recorded
 */
export function shouldRecordTotalVisit(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return true;
  return !storage.getItem(STORAGE_KEYS.HAS_VISITED);
}

/**
 * Calculate aggregate presence stats from raw presence data.
 * Deduplicates multiple tabs belonging to the same visitor.
 * 
 * @param {Object} presenceData - Snapshot from /presence
 * @param {number} nowMs - Current timestamp in milliseconds
 * @returns {Object} { onlineCount, activeCount, quizCount }
 */
export function calculatePresenceStats(presenceData, nowMs = Date.now()) {
  if (!presenceData || typeof presenceData !== 'object') {
    return { onlineCount: 0, activeCount: 0, quizCount: 0 };
  }

  const ACTIVE_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes for active user
  const STALE_WINDOW_MS = 20 * 60 * 1000;  // 20 minutes max stale cutoff

  let onlineCount = 0;
  let activeCount = 0;
  let quizCount = 0;

  for (const visitorId of Object.keys(presenceData)) {
    const visitorNode = presenceData[visitorId];
    if (!visitorNode) continue;

    // Support both /presence/{visitorId}/tabs/{tabId} and flat tabs
    const tabsObj = visitorNode.tabs || visitorNode;
    if (typeof tabsObj !== 'object') continue;

    let isVisitorOnline = false;
    let isVisitorActive = false;
    let isVisitorTakingQuiz = false;

    for (const tabKey of Object.keys(tabsObj)) {
      const tab = tabsObj[tabKey];
      if (!tab || typeof tab !== 'object') continue;

      const lastSeen = Number(tab.lastSeen) || nowMs;
      const isRecent = (nowMs - lastSeen) <= STALE_WINDOW_MS;

      if (isRecent) {
        isVisitorOnline = true;

        if (tab.state === 'active' && (nowMs - lastSeen) <= ACTIVE_WINDOW_MS) {
          isVisitorActive = true;
        }

        if (tab.screen === 'quiz' || tab.isQuiz === true) {
          isVisitorTakingQuiz = true;
        }
      }
    }

    if (isVisitorOnline) {
      onlineCount++;
      if (isVisitorActive) activeCount++;
      if (isVisitorTakingQuiz) quizCount++;
    }
  }

  return { onlineCount, activeCount, quizCount };
}

export class StatsEngine {
  constructor(options = {}) {
    this.options = options;
    this.visitorId = getOrCreateVisitorId();
    this.tabId = getOrCreateTabId();
    this.currentScreen = 'home';
    this.state = 'active'; // 'active' | 'idle'
    this.lastActivityTime = Date.now();
    this.isFirebaseReady = false;
    this.isConnected = false;

    // Default & cached stats
    this.stats = {
      online: 1,
      active: 1,
      takingQuiz: 0,
      today: 1,
      total: 1
    };

    this.todayStr = getTodayDateString();

    // Firebase instances
    this.firebaseApp = null;
    this.database = null;
    this.tabRef = null;
    this.connectedRef = null;
    this.presenceRef = null;

    // Timers
    this.heartbeatTimer = null;
    this.idleCheckTimer = null;
    this.activityThrottle = 0;

    // Load cached stats if available
    this.loadCachedStats();
  }

  loadCachedStats() {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(STORAGE_KEYS.STATS_CACHE);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            this.stats = { ...this.stats, ...parsed };
          }
        }
      }
    } catch (e) {}
  }

  saveCachedStats() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.STATS_CACHE, JSON.stringify(this.stats));
      }
    } catch (e) {}
  }

  async init() {
    this.bindDOM();
    this.updateUI();
    this.setupActivityListeners();
    this.setupPageUnloadHandlers();

    const config = getFirebaseConfig();
    const isConfigured = isFirebaseConfigured(config);

    if (!isConfigured) {
      this.initOfflineMode();
      return;
    }

    try {
      await this.initFirebase(config);
    } catch (err) {
      console.warn('Firebase initialization error, entering offline fallback mode:', err);
      this.initOfflineMode();
    }
  }

  bindDOM() {
    if (typeof document === 'undefined') return;

    this.dom = {
      onlineCount: document.getElementById('stat-online-count'),
      activeDetail: document.getElementById('stat-active-detail'),
      quizCount: document.getElementById('stat-quiz-count'),
      todayCount: document.getElementById('stat-today-count'),
      todayDate: document.getElementById('stat-today-date'),
      totalCount: document.getElementById('stat-total-count'),
      statusDot: document.getElementById('stats-status-dot'),
      statusLabel: document.getElementById('stats-status-label'),
      connectionStatus: document.getElementById('stats-connection-status')
    };

    if (this.dom.todayDate) {
      this.dom.todayDate.textContent = `Hôm nay (${formatFriendlyDate(this.todayStr)})`;
    }
  }

  initOfflineMode() {
    this.isFirebaseReady = false;
    this.isConnected = false;
    this.updateStatusBadge('offline', 'Chế độ ngoại tuyến');
    this.updateUI();
  }

  async initFirebase(config) {
    this.updateStatusBadge('connecting', 'Đang kết nối...');

    // Dynamically import Firebase modular packages so tree-shaking and bundles are lean
    const { initializeApp, getApps } = await import('firebase/app');
    const {
      getDatabase,
      ref,
      onValue,
      set,
      update,
      remove,
      onDisconnect,
      serverTimestamp,
      runTransaction
    } = await import('firebase/database');

    // Get or initialize Firebase App
    const apps = getApps();
    this.firebaseApp = apps.length > 0 ? apps[0] : initializeApp(config);
    this.database = getDatabase(this.firebaseApp);

    // References
    this.tabRef = ref(this.database, `presence/${this.visitorId}/tabs/${this.tabId}`);
    this.connectedRef = ref(this.database, '.info/connected');
    this.presenceRef = ref(this.database, 'presence');
    const totalRef = ref(this.database, 'stats/total_visitors');
    const dailyRef = ref(this.database, `stats/daily/${this.todayStr}`);

    // Listen to connection state
    onValue(this.connectedRef, (snap) => {
      const connected = Boolean(snap.val());
      this.isConnected = connected;

      if (connected) {
        this.updateStatusBadge('live', 'Trực tiếp');

        // Setup onDisconnect cleanup for this specific tab
        onDisconnect(this.tabRef).remove().catch((e) => console.warn('onDisconnect setup error:', e));

        // Write initial tab presence
        set(this.tabRef, {
          screen: this.currentScreen,
          state: this.state,
          isQuiz: this.currentScreen === 'quiz',
          lastSeen: serverTimestamp()
        }).catch((e) => console.warn('set presence error:', e));

        // Handle daily & total visit recording
        this.recordVisits(runTransaction, set, ref, serverTimestamp);
      } else {
        this.updateStatusBadge('connecting', 'Mất kết nối (Đang thử lại...)');
      }
    });

    // Listen to full presence list and compute deduplicated metrics
    onValue(this.presenceRef, (snap) => {
      const data = snap.val();
      const { onlineCount, activeCount, quizCount } = calculatePresenceStats(data);
      this.stats.online = Math.max(1, onlineCount);
      this.stats.active = Math.max(1, activeCount);
      this.stats.takingQuiz = quizCount;
      this.saveCachedStats();
      this.updateUI();
    });

    // Listen to total visitors counter
    onValue(totalRef, (snap) => {
      const val = snap.val();
      if (typeof val === 'number') {
        this.stats.total = val;
        this.saveCachedStats();
        this.updateUI();
      }
    });

    // Listen to today's visitors counter
    onValue(dailyRef, (snap) => {
      const val = snap.val();
      if (typeof val === 'number') {
        this.stats.today = val;
        this.saveCachedStats();
        this.updateUI();
      }
    });

    // Setup periodic active heartbeat
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.tabRef && this.state === 'active') {
        update(this.tabRef, {
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    }, 45000);

    this.isFirebaseReady = true;
  }

  async recordVisits(runTransaction, set, ref, serverTimestamp) {
    if (typeof localStorage === 'undefined') return;

    // 1. Daily Visitor Check
    if (shouldRecordDailyVisit(localStorage, this.todayStr)) {
      try {
        const dailyUserRef = ref(this.database, `daily_visitors/${this.todayStr}/${this.visitorId}`);
        await set(dailyUserRef, { visitedAt: serverTimestamp() });

        const dailyCountRef = ref(this.database, `stats/daily/${this.todayStr}`);
        await runTransaction(dailyCountRef, (currentVal) => {
          return (currentVal || 0) + 1;
        });

        localStorage.setItem(STORAGE_KEYS.VISIT_TODAY, this.todayStr);
      } catch (err) {
        console.warn('Daily visit record notice:', err);
      }
    }

    // 2. All-Time Total Visitor Check
    if (shouldRecordTotalVisit(localStorage)) {
      try {
        const totalUserRef = ref(this.database, `all_visitors/${this.visitorId}`);
        await set(totalUserRef, { firstSeen: serverTimestamp() });

        const totalCountRef = ref(this.database, 'stats/total_visitors');
        await runTransaction(totalCountRef, (currentVal) => {
          return (currentVal || 0) + 1;
        });

        localStorage.setItem(STORAGE_KEYS.HAS_VISITED, 'true');
      } catch (err) {
        console.warn('Total visit record notice:', err);
      }
    }
  }

  /**
   * Called by App whenever the user navigates between screens
   * ('home' | 'quiz' | 'result' | 'admin')
   */
  setScreen(screenName) {
    this.currentScreen = screenName;
    const isQuiz = (screenName === 'quiz');

    if (this.isConnected && this.tabRef) {
      import('firebase/database').then(({ update, serverTimestamp }) => {
        update(this.tabRef, {
          screen: screenName,
          isQuiz: isQuiz,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }).catch(() => {});
    } else {
      // In offline mode, update local simulation
      this.stats.takingQuiz = isQuiz ? 1 : 0;
      this.updateUI();
    }
  }

  setupActivityListeners() {
    if (typeof window === 'undefined') return;

    const onUserActivity = () => {
      const now = Date.now();
      this.lastActivityTime = now;

      // Throttle Firebase writes to once per 10 seconds
      if (now - this.activityThrottle > 10000) {
        this.activityThrottle = now;
        if (this.state !== 'active') {
          this.setState('active');
        }
      }
    };

    ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    // Check visibility change (switching tabs)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.setState('idle');
        } else {
          this.lastActivityTime = Date.now();
          this.setState('active');
        }
      });
    }

    // Idle watchdog: after 3 minutes of zero input, transition to idle
    this.idleCheckTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTime;
      if (idleTime >= 3 * 60 * 1000 && this.state === 'active') {
        this.setState('idle');
      }
    }, 30000);
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;

    if (this.isConnected && this.tabRef) {
      import('firebase/database').then(({ update, serverTimestamp }) => {
        update(this.tabRef, {
          state: newState,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }).catch(() => {});
    }
  }

  setupPageUnloadHandlers() {
    if (typeof window === 'undefined') return;

    const cleanup = () => {
      this.cleanupTab();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
  }

  cleanupTab() {
    if (this.tabRef && this.isConnected) {
      try {
        import('firebase/database').then(({ remove }) => {
          remove(this.tabRef);
        }).catch(() => {});
      } catch (e) {}
    }
  }

  updateStatusBadge(status, label) {
    if (!this.dom || !this.dom.statusDot || !this.dom.statusLabel) return;

    this.dom.statusDot.className = `status-dot ${status}`;
    this.dom.statusLabel.textContent = label;

    if (this.dom.connectionStatus) {
      if (status === 'live') {
        this.dom.connectionStatus.title = 'Đang đồng bộ trực tuyến với Firebase Realtime Database';
      } else if (status === 'connecting') {
        this.dom.connectionStatus.title = 'Đang kết nối tới Firebase Realtime Database...';
      } else {
        this.dom.connectionStatus.title = 'Hệ thống đang hoạt động ở chế độ ngoại tuyến';
      }
    }
  }

  updateUI() {
    if (!this.dom) return;

    const formatNum = (num) => {
      const n = Number(num);
      return isNaN(n) ? '--' : n.toLocaleString('vi-VN');
    };

    if (this.dom.onlineCount) {
      this.dom.onlineCount.textContent = formatNum(this.stats.online);
    }

    if (this.dom.activeDetail) {
      const active = this.stats.active || 1;
      this.dom.activeDetail.textContent = `${formatNum(active)} đang hoạt động`;
    }

    if (this.dom.quizCount) {
      this.dom.quizCount.textContent = formatNum(this.stats.takingQuiz);
    }

    if (this.dom.todayCount) {
      this.dom.todayCount.textContent = formatNum(this.stats.today);
    }

    if (this.dom.totalCount) {
      this.dom.totalCount.textContent = formatNum(this.stats.total);
    }
  }

  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);
    this.cleanupTab();
  }
}
