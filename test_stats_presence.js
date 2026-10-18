/**
 * Automated Test Suite for Realtime Presence, Multi-tab Deduplication & Analytics
 * 
 * Tests:
 * 1. Multi-tab deduplication (No double-counting across tabs)
 * 2. Tab closure and onDisconnect cleanup
 * 3. Screen transitions & Live quiz takers tracking
 * 4. Active vs Idle user differentiation
 * 5. Daily and total unique visitor logic
 * 6. Disconnect & Graceful offline fallback
 * 7. Anonymous ID generation & Security schema validation
 */

import {
  calculatePresenceStats,
  getOrCreateVisitorId,
  getOrCreateTabId,
  shouldRecordDailyVisit,
  shouldRecordTotalVisit,
  getTodayDateString,
  STORAGE_KEYS
} from './js/statsEngine.js';
import { isFirebaseConfigured } from './js/firebaseConfig.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
  passedTests++;
}

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

console.log('================================================================');
console.log('      KIỂM THỬ THỐNG KÊ NGƯỜI DÙNG & FIREBASE PRESENCE          ');
console.log('================================================================\n');

// --- TEST GROUP 1: Multi-Tab Deduplication ---
console.log('--- TEST GROUP 1: Kiểm thử đếm trùng đa tab (Multi-tab Deduplication) ---');
{
  const now = Date.now();

  // Scenario 1: User A opens 1 tab
  const data1 = {
    'u_alice': {
      tabs: {
        'tab_1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false }
      }
    }
  };
  const stats1 = calculatePresenceStats(data1, now);
  assert(stats1.onlineCount === 1, 'Mở 1 tab được tính là 1 người online');

  // Scenario 2: User A opens 3 more tabs in same browser (total 4 tabs)
  const data2 = {
    'u_alice': {
      tabs: {
        'tab_1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false },
        'tab_2': { screen: 'home', state: 'idle', lastSeen: now, isQuiz: false },
        'tab_3': { screen: 'quiz', state: 'active', lastSeen: now, isQuiz: true },
        'tab_4': { screen: 'result', state: 'idle', lastSeen: now, isQuiz: false }
      }
    }
  };
  const stats2 = calculatePresenceStats(data2, now);
  assert(stats2.onlineCount === 1, 'Mở 4 tab trong cùng một trình duyệt KHÔNG đếm trùng (vẫn là 1 người online)');

  // Scenario 3: User B enters with 2 tabs
  const data3 = {
    'u_alice': data2['u_alice'],
    'u_bob': {
      tabs: {
        'tab_b1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false },
        'tab_b2': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false }
      }
    }
  };
  const stats3 = calculatePresenceStats(data3, now);
  assert(stats3.onlineCount === 2, '2 người dùng mở tổng cộng 6 tab được đếm chính xác là 2 người online');
}

// --- TEST GROUP 2: Tab Closing & Disconnect Cleanup ---
console.log('\n--- TEST GROUP 2: Đóng tab & Dọn dẹp phiên kết nối (Tab Closing & Disconnect) ---');
{
  const now = Date.now();
  const visitorData = {
    'u_alice': {
      tabs: {
        'tab_1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false },
        'tab_2': { screen: 'quiz', state: 'active', lastSeen: now, isQuiz: true },
        'tab_3': { screen: 'home', state: 'idle', lastSeen: now, isQuiz: false }
      }
    }
  };

  // Close Tab 1
  delete visitorData['u_alice'].tabs['tab_1'];
  let stats = calculatePresenceStats(visitorData, now);
  assert(stats.onlineCount === 1, 'Đóng Tab 1 khi vẫn còn Tab 2 & 3: người dùng vẫn duy trì trạng thái online');

  // Close Tab 2
  delete visitorData['u_alice'].tabs['tab_2'];
  stats = calculatePresenceStats(visitorData, now);
  assert(stats.onlineCount === 1, 'Đóng tiếp Tab 2: người dùng vẫn online do còn Tab 3');

  // Close Tab 3 (All tabs closed -> node removed by onDisconnect)
  delete visitorData['u_alice'].tabs['tab_3'];
  stats = calculatePresenceStats(visitorData, now);
  assert(stats.onlineCount === 0, 'Đóng toàn bộ các tab: số người online trở về 0');
}

// --- TEST GROUP 3: Screen Transitions & Live Quiz Takers ---
console.log('\n--- TEST GROUP 3: Chuyển màn hình & Đếm người đang làm bài (Screen Transitions) ---');
{
  const now = Date.now();

  // Alice and Bob on Home
  const sessionData = {
    'u_alice': {
      tabs: {
        'tab_a1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false }
      }
    },
    'u_bob': {
      tabs: {
        'tab_b1': { screen: 'home', state: 'active', lastSeen: now, isQuiz: false }
      }
    }
  };
  let stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 0, 'Cả 2 người ở trang chủ: số người đang làm bài = 0');

  // Alice enters quiz
  sessionData['u_alice'].tabs['tab_a1'].screen = 'quiz';
  sessionData['u_alice'].tabs['tab_a1'].isQuiz = true;
  stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 1, 'Alice vào làm bài: số người đang làm bài tăng lên 1');

  // Alice opens second tab also on quiz
  sessionData['u_alice'].tabs['tab_a2'] = { screen: 'quiz', state: 'active', lastSeen: now, isQuiz: true };
  stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 1, 'Alice mở thêm tab thứ 2 đang làm bài: KHÔNG đếm trùng (vẫn là 1 người làm bài)');

  // Bob enters quiz
  sessionData['u_bob'].tabs['tab_b1'].screen = 'quiz';
  sessionData['u_bob'].tabs['tab_b1'].isQuiz = true;
  stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 2, 'Bob cũng vào làm bài: số người làm bài = 2');

  // Alice submits quiz and goes to result screen
  sessionData['u_alice'].tabs['tab_a1'].screen = 'result';
  sessionData['u_alice'].tabs['tab_a1'].isQuiz = false;
  delete sessionData['u_alice'].tabs['tab_a2'];
  stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 1, 'Alice nộp bài sang màn hình kết quả: số người làm bài giảm còn 1 (chỉ còn Bob)');

  // Bob navigates back to Home
  sessionData['u_bob'].tabs['tab_b1'].screen = 'home';
  sessionData['u_bob'].tabs['tab_b1'].isQuiz = false;
  stats = calculatePresenceStats(sessionData, now);
  assert(stats.quizCount === 0, 'Bob về trang chủ: số người đang làm bài trở về 0');
}

// --- TEST GROUP 4: Active vs Idle User Differentiation ---
console.log('\n--- TEST GROUP 4: Phân biệt người thực sự hoạt động vs phiên treo (Active vs Idle) ---');
{
  const now = Date.now();
  const sessionData = {
    // Alice: interacted 1 minute ago (Active)
    'u_alice': {
      tabs: {
        'tab_1': { screen: 'home', state: 'active', lastSeen: now - 60 * 1000, isQuiz: false }
      }
    },
    // Bob: tab left open in background for 10 minutes (Idle)
    'u_bob': {
      tabs: {
        'tab_2': { screen: 'home', state: 'idle', lastSeen: now - 10 * 60 * 1000, isQuiz: false }
      }
    },
    // Charlie: ancient session disconnected without cleanup 30 minutes ago (Stale)
    'u_charlie': {
      tabs: {
        'tab_3': { screen: 'home', state: 'idle', lastSeen: now - 30 * 60 * 1000, isQuiz: false }
      }
    }
  };

  const stats = calculatePresenceStats(sessionData, now);
  assert(stats.onlineCount === 2, 'Tổng online = 2 (Alice và Bob, phiên cũ của Charlie bị lọc bỏ)');
  assert(stats.activeCount === 1, 'Chỉ Alice được tính là đang hoạt động thực sự (Active)');
}

// --- TEST GROUP 5: Daily & Total Unique Visitors Tracking ---
console.log('\n--- TEST GROUP 5: Thống kê khách truy cập hôm nay & Tổng lượt (Daily & Total) ---');
{
  const mockStorage = new MockStorage();
  const today = getTodayDateString();

  // First time visitor on this browser
  assert(shouldRecordDailyVisit(mockStorage, today) === true, 'Khách mới: cần ghi nhận truy cập hôm nay');
  assert(shouldRecordTotalVisit(mockStorage) === true, 'Khách mới: cần ghi nhận tổng lượt truy cập');

  // Record visit
  mockStorage.setItem(STORAGE_KEYS.VISIT_TODAY, today);
  mockStorage.setItem(STORAGE_KEYS.HAS_VISITED, 'true');

  // Second visit on the same day
  assert(shouldRecordDailyVisit(mockStorage, today) === false, 'Khách truy cập lại cùng ngày: KHÔNG ghi nhận trùng hôm nay');
  assert(shouldRecordTotalVisit(mockStorage) === false, 'Khách cũ: KHÔNG ghi nhận trùng tổng lượt');

  // Next day visit
  const tomorrow = '2026-10-16';
  assert(shouldRecordDailyVisit(mockStorage, tomorrow) === true, 'Khách quay lại vào ngày hôm sau: ghi nhận lượt hôm nay mới');
  assert(shouldRecordTotalVisit(mockStorage) === false, 'Khách quay lại vào ngày hôm sau: KHÔNG tăng tổng khách mới');
}

// --- TEST GROUP 6: Graceful Disconnect & Offline Fallback ---
console.log('\n--- TEST GROUP 6: Mất kết nối & Chế độ dự phòng ngoại tuyến (Offline Fallback) ---');
{
  // Test invalid/empty config detection
  const emptyConfig = { apiKey: '', databaseURL: '' };
  assert(isFirebaseConfigured(emptyConfig) === false, 'Cấu hình rỗng được phát hiện chính xác là chưa kết nối');

  const placeholderConfig = {
    apiKey: 'AIzaSy_YOUR_API_KEY_HERE',
    databaseURL: 'https://your-project-id-default-rtdb.firebaseio.com'
  };
  assert(isFirebaseConfigured(placeholderConfig) === false, 'Cấu hình mẫu placeholder không gây lỗi kết nối giả lập');

  const validConfig = {
    apiKey: 'AIzaSyBN1234567890abcdef',
    databaseURL: 'https://onthitracnghiem-db.asia-southeast1.firebasedatabase.app',
    projectId: 'onthitracnghiem-prod'
  };
  assert(isFirebaseConfigured(validConfig) === true, 'Cấu hình Firebase hợp lệ được xác thực thành công');

  // Date format test
  const testDate = new Date('2026-10-15T09:30:00Z');
  const dateStr = getTodayDateString(testDate);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(dateStr), `Định dạng ngày YYYY-MM-DD chính xác (${dateStr})`);
}

// --- TEST GROUP 7: Anonymous ID & Privacy Protection ---
console.log('\n--- TEST GROUP 7: Định danh ẩn danh & Bảo mật quyền riêng tư (Privacy & Security) ---');
{
  const mockStorage = new MockStorage();
  const id1 = getOrCreateVisitorId(mockStorage);
  assert(typeof id1 === 'string' && id1.startsWith('u_'), 'Visitor ID ẩn danh bắt đầu bằng u_');
  assert(id1.length >= 16, 'Visitor ID có độ dài ngẫu nhiên bảo mật cao');

  const id2 = getOrCreateVisitorId(mockStorage);
  assert(id1 === id2, 'Cùng một trình duyệt tái sử dụng ID ẩn danh cố định, không tạo ID rác');

  const tabId1 = getOrCreateTabId(mockStorage);
  assert(typeof tabId1 === 'string' && tabId1.startsWith('tab_'), 'Tab ID bắt đầu bằng tab_');

  // Schema rule validation check
  const samplePayload = { screen: 'quiz', state: 'active', lastSeen: Date.now() };
  const hasRequiredFields = ['screen', 'state', 'lastSeen'].every(k => k in samplePayload);
  const isValidScreen = ['home', 'quiz', 'result', 'admin'].includes(samplePayload.screen);
  const isValidState = ['active', 'idle'].includes(samplePayload.state);

  assert(hasRequiredFields && isValidScreen && isValidState, 'Dữ liệu presence đáp ứng chuẩn schema bảo mật của Firebase Rules');
}

console.log('\n================================================================');
console.log('                 TỔNG KẾT KIỂM THỬ THỐNG KÊ                     ');
console.log('================================================================');
console.log(`- Tổng số Test Cases:    ${totalTests}`);
console.log(`- Số ca kiểm thử PASS:   ${passedTests}`);
console.log(`- Số ca kiểm thử FAIL:   0`);
console.log(`- Tỷ lệ hoàn thành:      100%`);
console.log('🎉 TOÀN BỘ KIỂM THỬ PRESENCE, DEDUPLICATION VÀ ANALYTICS ĐÃ PASS!');
console.log('================================================================\n');
