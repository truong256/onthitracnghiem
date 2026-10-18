/**
 * Comprehensive Automated QA Test Suite
 * Covers TC01 to TC08, Modes, LocalStorage Scenarios A-E, Security/XSS, and Admin Logic.
 * Exits with code 1 on ANY failure, and code 0 only on 100% PASS.
 */

import { INITIAL_QUIZ_DATA } from './js/data.js';
import { store, migrateExercisesData, validateExercisesSchema, STORAGE_KEYS, CURRENT_DATA_VERSION } from './js/store.js';
import { QuizEngine } from './js/quizEngine.js';
import { escapeHtml } from './js/app.js';
import { DragDropEngine } from './js/dragDropEngine.js';

console.log('================================================================');
console.log('       BỘ KIỂM THỬ TOÀN DIỆN QA AUTOMATION — ONTHITRACNGHIEM    ');
console.log('================================================================\n');

const testResults = [];
let passCount = 0;
let failCount = 0;

function runTest(testId, suiteName, description, testFn) {
  try {
    testFn();
    testResults.push({ id: testId, suite: suiteName, desc: description, status: 'PASS' });
    passCount++;
    console.log(`  ✅ [PASS] ${testId.padEnd(8)}: ${description}`);
  } catch (err) {
    testResults.push({ id: testId, suite: suiteName, desc: description, status: 'FAIL', error: err.message });
    failCount++;
    console.error(`  ❌ [FAIL] ${testId.padEnd(8)}: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// =============================================================================
// TC01: CHỌN BÀI ÔN TẬP & TÍNH TOÀN VẸN CÂU HỎI
// =============================================================================
console.log('--- TEST GROUP 1: TC01 — Chọn bài ôn tập & Số lượng câu hỏi ---');

const expectedCounts = {
  'bai-1': 41,
  'bai-2': 40,
  'bai-3': 40,
  'bai-4': 45,
  'bai-5': 42,
  'bai-6': 27
};

Object.entries(expectedCounts).forEach(([exId, expectedNum]) => {
  runTest(`TC01-${exId}`, 'TC01', `Bài ${exId} tải đúng ${expectedNum} câu, không lấy nhầm bài khác`, () => {
    const ex = store.getExercise(exId);
    assert(Boolean(ex), `Không tìm thấy bài ${exId}`);
    assert(ex.questions.length === expectedNum, `Bài ${exId} có ${ex.questions.length} câu, mong đợi ${expectedNum}`);
    // No empty questions and no cross-lesson bleed
    ex.questions.forEach((q, idx) => {
      assert(q.id.startsWith(exId), `Câu ${q.id} không thuộc bài ${exId}`);
      assert(q.content && q.content.trim().length > 5, `Câu ${q.id} bị rỗng hoặc quá ngắn`);
      assert(q.number === idx + 1, `Câu ${q.id} sai thứ tự ${q.number} !== ${idx + 1}`);
    });
  });
});

runTest('TC01-all', 'TC01', 'Tổng hợp tất cả các bài có đúng 235 câu hỏi', () => {
  const allEx = store.getExercise('all');
  assert(Boolean(allEx), 'Không tải được đề tổng hợp all');
  assert(allEx.questions.length === 235, `Tổng hợp có ${allEx.questions.length} câu, mong đợi 235`);
});

// =============================================================================
// TC02: TRẮC NGHIỆM MỘT ĐÁP ÁN (SINGLE CHOICE)
// =============================================================================
console.log('\n--- TEST GROUP 2: TC02 — Trắc nghiệm một đáp án ---');

runTest('TC02-01', 'TC02', 'Chọn đáp án đúng được 1 điểm, chọn sai được 0 điểm', () => {
  const engine = new QuizEngine();
  const qSingle = {
    id: 'test-sc-1',
    type: 'single_choice',
    header: 'Câu 1:',
    content: 'Nội dung test',
    options: [
      { key: 'A', content: 'Phương án A', isCorrect: false },
      { key: 'B', content: 'Phương án B', isCorrect: true },
      { key: 'C', content: 'Phương án C', isCorrect: false }
    ],
    correctAnswers: ['B']
  };

  // User picks B (correct)
  const evalCorrect = engine.evaluateQuestion(qSingle, 'B');
  assert(evalCorrect.isCorrect === true, 'Chọn B phải là đúng');
  assert(evalCorrect.score === 1, 'Điểm phải là 1');

  // User picks A (wrong)
  const evalWrong = engine.evaluateQuestion(qSingle, 'A');
  assert(evalWrong.isCorrect === false, 'Chọn A phải là sai');
  assert(evalWrong.score === 0, 'Điểm phải là 0');

  // User leaves blank
  const evalBlank = engine.evaluateQuestion(qSingle, null);
  assert(evalBlank.isCorrect === false, 'Bỏ trống phải là sai');
  assert(evalBlank.score === 0, 'Điểm phải là 0');
});

runTest('TC02-02', 'TC02', 'Đổi phương án và lưu trạng thái người dùng chính xác', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  const qId = engine.getCurrentQuestion().id;

  engine.setAnswer(qId, 'A');
  assert(engine.getAnswer(qId) === 'A', 'Đáp án lưu phải là A');

  engine.setAnswer(qId, 'C');
  assert(engine.getAnswer(qId) === 'C', 'Đổi phương án phải cập nhật thành C');
});

// =============================================================================
// TC03: TRẮC NGHIỆM NHIỀU ĐÁP ÁN (MULTIPLE CHOICE)
// =============================================================================
console.log('\n--- TEST GROUP 3: TC03 — Trắc nghiệm nhiều đáp án ---');

runTest('TC03-01', 'TC03', 'Chỉ chấm đúng khi chọn chính xác tập hợp đáp án', () => {
  const engine = new QuizEngine();
  const qMulti = {
    id: 'test-mc-1',
    type: 'multiple_choice',
    header: 'Câu chọn nhiều:',
    content: 'Chọn 2 phương án',
    options: [
      { key: 'A', content: 'Đúng 1', isCorrect: true },
      { key: 'B', content: 'Sai 1', isCorrect: false },
      { key: 'C', content: 'Đúng 2', isCorrect: true },
      { key: 'D', content: 'Sai 2', isCorrect: false }
    ],
    correctAnswers: ['A', 'C']
  };

  // Exact set ['A', 'C']
  const evalExact = engine.evaluateQuestion(qMulti, ['A', 'C']);
  assert(evalExact.isCorrect === true, 'Chọn [A, C] phải đúng tuyệt đối');
  assert(evalExact.score === 1, 'Điểm phải là 1');

  // Exact set reversed ['C', 'A']
  const evalReversed = engine.evaluateQuestion(qMulti, ['C', 'A']);
  assert(evalReversed.isCorrect === true, 'Chọn [C, A] phải đúng tuyệt đối');

  // Missing one correct ['A']
  const evalMissing = engine.evaluateQuestion(qMulti, ['A']);
  assert(evalMissing.isCorrect === false, 'Thiếu đáp án C không được tính đúng');
  assert(evalMissing.score === 0, 'Thiếu đáp án điểm phải là 0');

  // One correct and one wrong ['A', 'B']
  const evalOneWrong = engine.evaluateQuestion(qMulti, ['A', 'B']);
  assert(evalOneWrong.isCorrect === false, 'Có phương án sai không được tính đúng');
  assert(evalOneWrong.score === 0, 'Có phương án sai điểm phải là 0');

  // Extra wrong option ['A', 'C', 'D']
  const evalExtra = engine.evaluateQuestion(qMulti, ['A', 'C', 'D']);
  assert(evalExtra.isCorrect === false, 'Chọn thừa đáp án sai không được tính đúng');
  assert(evalExtra.score === 0, 'Chọn thừa đáp án sai điểm phải là 0');
});

// =============================================================================
// TC04: CÂU HỎI ĐÚNG / SAI THEO NHÓM
// =============================================================================
console.log('\n--- TEST GROUP 4: TC04 — Câu hỏi Đúng / Sai theo nhóm ---');

runTest('TC04-01', 'TC04', 'Chấm điểm phát biểu độc lập và tính điểm phân số chính xác', () => {
  const engine = new QuizEngine();
  const qTF = {
    id: 'test-tf-1',
    type: 'true_false_group',
    header: 'Câu Đúng Sai:',
    content: 'Đánh giá các phát biểu sau:',
    items: [
      { order: 1, statement: 'Nhận định 1', correctAnswer: 'Đúng' },
      { order: 2, statement: 'Nhận định 2', correctAnswer: 'Sai' },
      { order: 3, statement: 'Nhận định 3', correctAnswer: 'Đúng' },
      { order: 4, statement: 'Nhận định 4', correctAnswer: 'Sai' }
    ]
  };

  // All 4 correct
  const evalAllCorrect = engine.evaluateQuestion(qTF, { 1: 'Đúng', 2: 'Sai', 3: 'Đúng', 4: 'Sai' });
  assert(evalAllCorrect.isCorrect === true, 'Đúng cả 4 câu phải isCorrect = true');
  assert(evalAllCorrect.score === 1, 'Điểm phải là 1');

  // 2 out of 4 correct
  const evalHalf = engine.evaluateQuestion(qTF, { 1: 'Đúng', 2: 'Đúng', 3: 'Sai', 4: 'Sai' });
  assert(evalHalf.isCorrect === false, 'Đúng 2/4 câu isCorrect = false');
  assert(Math.abs(evalHalf.score - 0.5) < 0.001, 'Điểm đúng 2/4 phải là 0.5');

  // Blank
  const evalBlank = engine.evaluateQuestion(qTF, null);
  assert(evalBlank.isCorrect === false, 'Bỏ trống điểm phải là 0');
  assert(evalBlank.score === 0, 'Điểm bỏ trống là 0');
});

// =============================================================================
// TC05: CÂU HỎI KÉO THẢ (PAIRS & COLUMNS)
// =============================================================================
console.log('\n--- TEST GROUP 5: TC05 — Kéo thả điền khuyết & phân loại cột ---');

runTest('TC05-01', 'TC05', 'Kéo thả điền khuyết kiểm tra cặp tương ứng', () => {
  const engine = new QuizEngine();
  const qDD = {
    id: 'test-dd-1',
    type: 'drag_drop',
    pairs: [
      { id: 'pair-1', prompt: 'Khái niệm A là _____', correctAnswer: 'từ khóa A' },
      { id: 'pair-2', prompt: 'Khái niệm B là _____', correctAnswer: 'từ khóa B' }
    ],
    optionsPool: ['từ khóa A', 'từ khóa B']
  };

  const evalCorrect = engine.evaluateQuestion(qDD, { 'pair-1': 'từ khóa A', 'pair-2': 'từ khóa B' });
  assert(evalCorrect.isCorrect === true, 'Ghép đúng cả 2 cặp phải đạt điểm tối đa');
  assert(evalCorrect.score === 1, 'Điểm là 1');

  const evalWrong = engine.evaluateQuestion(qDD, { 'pair-1': 'từ khóa B', 'pair-2': 'từ khóa A' });
  assert(evalWrong.isCorrect === false, 'Ghép đảo ngược vị trí phải sai');
  assert(evalWrong.score === 0, 'Điểm là 0');
});

runTest('TC05-02', 'TC05', 'Kéo thả phân loại 2 cột chấm chính xác theo tập hợp cột', () => {
  const engine = new QuizEngine();
  const qCols = {
    id: 'test-cols-1',
    type: 'drag_drop_columns',
    columns: [
      { id: 'col-1', title: 'Khách quan', correctItems: ['Yếu tố 1', 'Yếu tố 2'] },
      { id: 'col-2', title: 'Chủ quan', correctItems: ['Yếu tố 3', 'Yếu tố 4'] }
    ],
    optionsPool: ['Yếu tố 1', 'Yếu tố 2', 'Yếu tố 3', 'Yếu tố 4']
  };

  // Exact match
  const evalCorrect = engine.evaluateQuestion(qCols, {
    'col-1': ['Yếu tố 1', 'Yếu tố 2'],
    'col-2': ['Yếu tố 3', 'Yếu tố 4']
  });
  assert(evalCorrect.isCorrect === true, 'Phân loại đúng tất cả các cột phải đạt điểm tối đa');
  assert(evalCorrect.score === 1, 'Điểm là 1');

  // Partial match: 1 col correct, 1 col missing
  const evalPartial = engine.evaluateQuestion(qCols, {
    'col-1': ['Yếu tố 1', 'Yếu tố 2'],
    'col-2': ['Yếu tố 3']
  });
  assert(evalPartial.isCorrect === false, 'Thiếu yếu tố ở cột 2 không được coi là hoàn toàn đúng');
  assert(Math.abs(evalPartial.score - 0.5) < 0.001, 'Đúng 1/2 cột được 0.5 điểm');
});

runTest('TC05-03', 'TC05', 'DragDropEngine khởi tạo cấu trúc 2 cột, hỗ trợ thêm, chuyển cột và xóa thẻ', () => {
  class MockElement {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.classList = new Set();
      this.dataset = {};
      this.listeners = {};
    }
    set className(val) {
      this.classList = new Set((val || '').split(' ').filter(Boolean));
    }
    get className() {
      return Array.from(this.classList).join(' ');
    }
    appendChild(child) {
      this.children.push(child);
    }
    addEventListener(evt, fn) {
      this.listeners[evt] = fn;
    }
    querySelector() { return new MockElement('mock'); }
    querySelectorAll() { return []; }
  }

  const prevDoc = global.document;
  global.document = {
    createElement(tag) { return new MockElement(tag); }
  };

  try {
    const mount = new MockElement('div');
    let capturedState = null;
    const engine = new DragDropEngine(mount, (st) => { capturedState = st; });
    const qCols = {
      id: 'test-cols-dd',
      type: 'drag_drop_columns',
      columns: [
        { id: 'col-1', title: 'Khách quan', correctItems: ['Yếu tố A', 'Yếu tố B'] },
        { id: 'col-2', title: 'Chủ quan', correctItems: ['Yếu tố C', 'Yếu tố D'] }
      ],
      optionsPool: ['Yếu tố A', 'Yếu tố B', 'Yếu tố C', 'Yếu tố D']
    };

    engine.render(qCols);
    const wrapper = mount.children[0];
    assert(wrapper && wrapper.classList.has('dd-columns-wrapper'), 'Cấu trúc wrapper dd-columns-wrapper được khởi tạo');

    // Add item to column 1
    engine.addItemToColumn('col-1', 'Yếu tố A');
    assert(capturedState['col-1'].includes('Yếu tố A'), 'Yếu tố A đã được thêm vào cột 1');
    assert(capturedState['col-2'].length === 0, 'Cột 2 vẫn rỗng');

    // Move item to column 2
    engine.addItemToColumn('col-2', 'Yếu tố A');
    assert(!capturedState['col-1'].includes('Yếu tố A'), 'Yếu tố A đã tự động rời cột 1 khi sang cột 2');
    assert(capturedState['col-2'].includes('Yếu tố A'), 'Yếu tố A nằm trong cột 2');

    // Remove item by value
    engine.removeColumnItemByValue('col-2', 'Yếu tố A');
    assert(!capturedState['col-2'].includes('Yếu tố A'), 'Yếu tố A đã được xóa trả về pool');
  } finally {
    global.document = prevDoc;
  }
});

runTest('TC05-04', 'TC05', 'DragDropEngine hiển thị đầy đủ banner kết quả, màu sắc Đúng/Sai và đáp án khi bấm Kiểm tra', () => {
  class MockElement {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.classList = new Set();
      this.dataset = {};
      this.listeners = {};
      this._innerHTML = '';
    }
    set className(val) {
      this.classList = new Set((val || '').split(' ').filter(Boolean));
    }
    get className() {
      return Array.from(this.classList).join(' ');
    }
    set innerHTML(val) {
      this._innerHTML = val;
    }
    get innerHTML() {
      return this._innerHTML;
    }
    appendChild(child) {
      this.children.push(child);
    }
    addEventListener(evt, fn) {
      this.listeners[evt] = fn;
    }
    querySelector() { return new MockElement('mock'); }
    querySelectorAll() { return []; }
  }

  const prevDoc = global.document;
  global.document = {
    createElement(tag) { return new MockElement(tag); }
  };

  try {
    const mount = new MockElement('div');
    const qDD = {
      id: 'bai-1-q39-test',
      type: 'drag_drop',
      pairs: [
        { id: 'p1', prompt: 'Prompt 1', correctAnswer: 'Đảng Cộng Sản' },
        { id: 'p2', prompt: 'Prompt 2', correctAnswer: 'tầng lớp nhân dân' }
      ]
    };

    // User answered: p1 correctly, p2 incorrectly
    const evalRes = {
      isCorrect: false,
      score: 0.5,
      correctPairs: 1,
      totalPairs: 2,
      pairResults: [
        { id: 'p1', prompt: 'Prompt 1', correctAnswer: 'Đảng Cộng Sản', userAnswer: 'Đảng Cộng Sản', isCorrect: true },
        { id: 'p2', prompt: 'Prompt 2', correctAnswer: 'tầng lớp nhân dân', userAnswer: 'tầng lớp tri thức', isCorrect: false }
      ]
    };

    const engine = new DragDropEngine(mount, () => {}, {
      isReadOnly: true,
      isChecked: true,
      evalRes
    });

    engine.render(qDD, { p1: 'Đảng Cộng Sản', p2: 'tầng lớp tri thức' });

    const wrapper = mount.children[0];
    assert(wrapper, 'Wrapper được tạo');
    // Top banner should exist
    const hasBanner = wrapper.children.some(c => c.classList.has('dd-eval-banner') && c.classList.has('eval-wrong'));
    assert(hasBanner, 'Banner đánh giá Chưa chính xác xuất hiện ở đầu');

    // Statements column should have feedback
    const statementsCol = wrapper.children.find(c => c.classList.has('dd-statements-col'));
    assert(statementsCol, 'Cột statements tồn tại');
    assert(statementsCol.children.length === 2, 'Có 2 dòng phát biểu');

    // Row 1 has eval-correct slot, Row 2 has eval-wrong slot
    const row1 = statementsCol.children[0];
    const slotWrapper1 = row1.children[1];
    const dropSlot1 = slotWrapper1.children[0];
    assert(dropSlot1.classList.has('eval-correct'), 'Vị trí 1 được đánh dấu eval-correct');

    const row2 = statementsCol.children[1];
    const slotWrapper2 = row2.children[1];
    const dropSlot2 = slotWrapper2.children[0];
    assert(dropSlot2.classList.has('eval-wrong'), 'Vị trí 2 được đánh dấu eval-wrong');

    // Row 2 should show correct answer hint
    const hasCorrectHint = slotWrapper2.children.some(c => c.classList.has('dd-pair-correct-feedback') && c.innerHTML.includes('tầng lớp nhân dân'));
    assert(hasCorrectHint, 'Hiển thị đối chiếu đáp án đúng cho vị trí ghép sai');
  } finally {
    global.document = prevDoc;
  }
});

// =============================================================================
// TC06: ĐIỀU HƯỚNG CÂU HỎI & LƯU TRẠNG THÁI PHIÊN
// =============================================================================
console.log('\n--- TEST GROUP 6: TC06 — Điều hướng & Giữ trạng thái làm bài ---');

runTest('TC06-01', 'TC06', 'Chuyển câu hỏi, gắn cờ xem lại và giữ nguyên đáp án đã chọn', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  // Answer question 0
  const q0 = engine.questions[0];
  engine.setAnswer(q0.id, 'B');
  engine.toggleFlag(q0.id);
  assert(engine.isFlagged(q0.id) === true, 'Gắn cờ câu hỏi 0 thành công');

  // Navigate next
  engine.nextQuestion();
  assert(engine.currentIndex === 1, 'Chuyển sang câu 1 thành công');

  // Jump direct to question 5
  engine.goToQuestion(5);
  assert(engine.currentIndex === 5, 'Nhảy trực tiếp câu 5 thành công');

  // Navigate back to question 0
  engine.goToQuestion(0);
  assert(engine.getAnswer(q0.id) === 'B', 'Đáp án đã chọn ở câu 0 phải được giữ nguyên');
  assert(engine.isFlagged(q0.id) === true, 'Cờ xem lại ở câu 0 phải được giữ nguyên');
});

// =============================================================================
// TC07: NỘP BÀI, CHẤM ĐIỂM & CHỐNG NỘP TRÙNG (IDEMPOTENCY)
// =============================================================================
console.log('\n--- TEST GROUP 7: TC07 — Nộp bài, chấm điểm & Tính bất biến ---');

runTest('TC07-01', 'TC07', 'Chấm điểm phiên làm bài all correct và all wrong', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'quick', questionCount: 5 });

  // Answer all correctly
  engine.questions.forEach(q => {
    if (q.type === 'single_choice') {
      engine.setAnswer(q.id, q.correctAnswers[0]);
    } else if (q.type === 'multiple_choice') {
      engine.setAnswer(q.id, q.correctAnswers);
    } else if (q.type === 'true_false_group') {
      const tfAns = {};
      q.items.forEach(it => tfAns[it.order] = it.correctAnswer);
      engine.setAnswer(q.id, tfAns);
    } else if (q.type === 'drag_drop') {
      const ddAns = {};
      q.pairs.forEach((p, i) => ddAns[p.id || `pair-${i+1}`] = p.correctAnswer);
      engine.setAnswer(q.id, ddAns);
    } else if (q.type === 'drag_drop_columns') {
      const colAns = {};
      q.columns.forEach(c => colAns[c.id] = c.correctItems);
      engine.setAnswer(q.id, colAns);
    }
  });

  const summary = engine.submitQuiz(false);
  assert(summary.totalQuestions === 5, 'Tổng số 5 câu');
  assert(summary.correctCount === 5, 'Đúng cả 5 câu');
  assert(summary.score === 5, 'Điểm đạt 5');
  assert(summary.percentage === 100, 'Tỷ lệ 100%');
});

runTest('TC07-02', 'TC07', 'Chống nộp bài trùng lặp (Idempotent) & Khóa đáp án sau khi nộp', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'quick', questionCount: 3 });

  const initialAttempts = store.getAttempts().length;

  // First submit
  const res1 = engine.submitQuiz(false);
  const attemptsAfter1 = store.getAttempts().length;
  assert(attemptsAfter1 === initialAttempts + 1, 'Nộp bài lần 1 ghi thêm 1 attempt');

  // Second submit (spamming)
  const res2 = engine.submitQuiz(false);
  const attemptsAfter2 = store.getAttempts().length;
  assert(attemptsAfter2 === attemptsAfter1, 'Nộp lần 2 KHÔNG được nhân đôi attempt trong lịch sử');
  assert(res1.score === res2.score, 'Điểm không thay đổi');

  // Attempting to change answer after submit MUST BE BLOCKED
  const q0 = engine.questions[0];
  const oldAns = engine.getAnswer(q0.id);
  engine.setAnswer(q0.id, 'MALICIOUS_CHANGED_ANSWER');
  assert(engine.getAnswer(q0.id) === oldAns, 'Không được phép thay đổi đáp án sau khi đã nộp bài');
});

// =============================================================================
// TC08: ĐỒNG HỒ ĐẾM NGƯỢC & HẾT GIỜ TỰ NỘP BÀI
// =============================================================================
console.log('\n--- TEST GROUP 8: TC08 — Đồng hồ đếm ngược ---');

runTest('TC08-01', 'TC08', 'Đồng hồ đếm ngược format đúng và tự động nộp bài khi hết giờ', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'exam', timeLimitMinutes: 15 });

  assert(engine.getFormattedTime() === '15:00', 'Định dạng 15 phút ban đầu là 15:00');
  engine.timeRemaining = 125;
  assert(engine.getFormattedTime() === '02:05', '125 giây phải format thành 02:05');

  // Simulate timeout
  engine.timeRemaining = 0;
  engine.submitQuiz(true);
  assert(engine.isSubmitted === true, 'Hết giờ phải đánh dấu đã nộp bài');
  assert(engine.timerInterval === null, 'Timer phải được dọn dẹp không chạy ngầm');
});

// =============================================================================
// CÁC CHẾ ĐỘ ÔN LUYỆN (MODES)
// =============================================================================
console.log('\n--- TEST GROUP 9: Các chế độ ôn luyện (Modes) ---');

runTest('MODE-random', 'Modes', 'Chế độ Ngẫu nhiên xáo trộn thứ tự nhưng không mất câu', () => {
  const engine = new QuizEngine();
  const qList = engine.startQuiz({ exerciseId: 'bai-1', mode: 'random' });
  assert(qList.length === 41, 'Chế độ random giữ đủ 41 câu của bài 1');
  const idSet = new Set(qList.map(q => q.id));
  assert(idSet.size === 41, 'Không có câu hỏi trùng lặp khi xáo trộn');
});

runTest('MODE-quick', 'Modes', 'Chế độ Luyện nhanh lấy đúng 10 câu ngẫu nhiên', () => {
  const engine = new QuizEngine();
  const qList = engine.startQuiz({ exerciseId: 'bai-2', mode: 'quick', questionCount: 10 });
  assert(qList.length === 10, 'Chế độ quick lấy đúng 10 câu');
});

runTest('MODE-exam', 'Modes', 'Chế độ Thi thử tắt instant check và đặt giới hạn 15 phút', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-3', mode: 'exam' });
  assert(engine.instantCheck === false, 'Thi thử không cho phép kiểm tra ngay từng câu');
  assert(engine.timeLimitSeconds === 15 * 60, 'Thời gian thi thử là 15 phút');
});

runTest('MODE-wrong-empty', 'Modes', 'Chế độ Ôn câu làm sai báo lỗi nếu danh sách rỗng', () => {
  store.clearWrongQuestions();
  const engine = new QuizEngine();
  let threw = false;
  try {
    engine.startQuiz({ mode: 'wrong_only' });
  } catch (e) {
    threw = true;
    assert(e.message.includes('chưa có câu trả lời sai'), 'Phải ném thông báo đúng khi chưa có câu sai');
  }
  assert(threw, 'Phải ném lỗi khi không có câu sai');
});

runTest('MODE-wrong-active', 'Modes', 'Ghi nhận câu sai và vào chế độ Ôn câu sai thành công', () => {
  const testQ = INITIAL_QUIZ_DATA[0].questions[0];
  store.recordQuestionResult(testQ.id, false, testQ);

  const wrongObjs = store.getWrongQuestionObjects();
  assert(wrongObjs.length >= 1, 'Phải có ít nhất 1 câu sai được ghi');
  assert(wrongObjs.some(q => q.id === testQ.id), 'Câu sai vừa ghi phải có trong danh sách');

  const engine = new QuizEngine();
  const qList = engine.startQuiz({ mode: 'wrong_only' });
  assert(qList.length >= 1, 'Chế độ ôn câu sai nạp được câu hỏi');

  // When answered correctly, decrement / remove
  store.recordQuestionResult(testQ.id, true, testQ);
});

// =============================================================================
// LOCALSTORAGE VÀ AN TOÀN DỮ LIỆU (SCENARIOS A, B, C, D, E)
// =============================================================================
console.log('\n--- TEST GROUP 10: LocalStorage Scenarios A, B, C, D, E ---');

runTest('STORAGE-A', 'LocalStorage', 'Kịch bản A: Người dùng mới tải mặc định đủ 6 bài 235 câu', () => {
  const exercises = store.getExercises();
  assert(exercises.length === 6, 'Có đủ 6 bài');
  const totalQ = exercises.reduce((sum, e) => sum + e.questions.length, 0);
  assert(totalQ === 235, `Tổng số câu mới phải là 235 (có: ${totalQ})`);
});

runTest('STORAGE-B', 'LocalStorage', 'Kịch bản B: Người dùng cũ v1 di chuyển lên có đủ Bài 6 và đáp án mới', () => {
  const mockV1 = INITIAL_QUIZ_DATA.slice(0, 5).map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    questions: e.questions.slice(0, 20)
  }));

  const migrated = migrateExercisesData(mockV1, INITIAL_QUIZ_DATA);
  assert(migrated.length === 6, 'Sau migration có đủ 6 bài');
  const bai6 = migrated.find(e => e.id === 'bai-6');
  assert(Boolean(bai6) && bai6.questions.length === 27, 'Bài 6 có đủ 27 câu sau migration');
});

runTest('STORAGE-C', 'LocalStorage', 'Kịch bản C: Người dùng sửa trong Admin không bị ghi đè khi đồng bộ', () => {
  const mockData = INITIAL_QUIZ_DATA.map(e => ({ ...e, questions: [...e.questions] }));
  const customQ = {
    ...mockData[0].questions[0],
    content: 'NỘI DUNG SỬA BỞI GIẢNG VIÊN ADMIN',
    isCustomized: true
  };
  mockData[0].questions[0] = customQ;

  const migrated = migrateExercisesData(mockData, INITIAL_QUIZ_DATA);
  const qResult = migrated[0].questions.find(q => q.id === customQ.id);
  assert(qResult.content === 'NỘI DUNG SỬA BỞI GIẢNG VIÊN ADMIN', 'Migration không được làm mất sửa đổi Admin');
});

runTest('STORAGE-D', 'LocalStorage', 'Kịch bản D: Lưu lịch sử attempts và câu làm sai tồn tại qua phiên', () => {
  const initialAtts = store.getAttempts().length;
  store.saveAttempt({
    exerciseId: 'bai-test',
    score: 10,
    maxScore: 10,
    percentage: 100
  });
  const attsAfter = store.getAttempts();
  assert(attsAfter.length === initialAtts + 1, 'Lịch sử lưu thành công');
  assert(attsAfter[0].score === 10, 'Thông tin điểm số lưu chính xác');
});

runTest('STORAGE-E', 'LocalStorage', 'Kịch bản E: Xử lý dữ liệu hỏng / corrupted JSON an toàn không crash', () => {
  // Test validateExercisesSchema with corrupt inputs
  assert(validateExercisesSchema(null).valid === false, 'null exercises phải invalid');
  assert(validateExercisesSchema([]).valid === false, 'mảng rỗng phải invalid');
  assert(validateExercisesSchema([{ id: 'bai-1' }]).valid === false, 'thiếu questions phải invalid');
  assert(validateExercisesSchema([{ id: 'bai-1', title: 'T', questions: [{ id: 'q1', type: 'single_choice' }] }]).valid === false, 'câu thiếu options phải invalid');

  // Test importAllData with corrupt json string
  const corruptJsonRes = store.importAllData('{"not_valid_json": [');
  assert(corruptJsonRes.success === false, 'JSON syntax error phải trả về success: false');

  const invalidSchemaRes = store.importAllData(JSON.stringify({ exercises: [{ garbage: 123 }] }));
  assert(invalidSchemaRes.success === false, 'Schema rác phải trả về success: false');
});

// =============================================================================
// ADMIN CMS & SECURITY XSS
// =============================================================================
console.log('\n--- TEST GROUP 11: Admin CMS Logic & Bảo mật XSS ---');

runTest('SEC-XSS-01', 'Security', 'Hàm escapeHtml vô hiệu hóa thẻ HTML và mã độc XSS', () => {
  const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>"\'&';
  const escaped = escapeHtml(xssPayload);
  assert(!escaped.includes('<script>'), 'Không được còn thẻ script');
  assert(!escaped.includes('<img'), 'Không được còn thẻ img');
  assert(escaped.includes('&lt;script&gt;'), 'Phải mã hóa thành &lt;script&gt;');
  assert(escaped.includes('&quot;'), 'Dấu nháy kép phải được escape');
});

runTest('ADMIN-CRUD', 'Admin', 'Thêm, sửa, xóa câu hỏi trong Admin hoạt động đúng quy tắc', () => {
  const newQData = {
    type: 'single_choice',
    header: 'Câu Thử Nghiệm:',
    content: 'Nội dung câu thử nghiệm Admin',
    options: [
      { key: 'A', content: 'Đúng', isCorrect: true },
      { key: 'B', content: 'Sai', isCorrect: false }
    ],
    correctAnswers: ['A'],
    needsReview: false
  };

  // Add
  const added = store.addQuestion('bai-1', newQData);
  assert(Boolean(added) && added.id.includes('bai-1-custom'), 'Thêm câu hỏi mới thành công');

  // Edit
  added.content = 'Nội dung đã được chỉnh sửa';
  const updated = store.updateQuestion('bai-1', added);
  assert(updated === true, 'Cập nhật câu hỏi thành công');

  // Verify edited content
  const currentEx = store.getExercise('bai-1');
  const foundQ = currentEx.questions.find(q => q.id === added.id);
  assert(foundQ.content === 'Nội dung đã được chỉnh sửa', 'Nội dung câu hỏi đã đổi đúng');

  // Delete
  const deleted = store.deleteQuestion('bai-1', added.id);
  assert(deleted === true, 'Xóa câu hỏi thành công');
  const currentExAfter = store.getExercise('bai-1');
  assert(!currentExAfter.questions.some(q => q.id === added.id), 'Câu hỏi đã bị xóa khỏi danh sách');
});

runTest('ADMIN-EXPORT-IMPORT', 'Admin', 'Xuất JSON và Nhập JSON hợp lệ thành công', () => {
  const exportStr = store.exportAllData();
  assert(typeof exportStr === 'string' && exportStr.length > 100, 'Dữ liệu xuất không rỗng');
  const parsedExport = JSON.parse(exportStr);
  assert(parsedExport.exercises.length === 6, 'Dữ liệu xuất chứa đủ 6 bài');

  // Import exact export back
  const importRes = store.importAllData(exportStr);
  assert(importRes.success === true, 'Nhập lại dữ liệu vừa xuất phải thành công');
  assert(importRes.count === 6, 'Nhập đủ 6 bài');
});

// =============================================================================
// TEST GROUP 12: HỆ THỐNG CHẤM ĐIỂM & KẾT QUẢ THEO YÊU CẦU (RESULT-01 -> RESULT-12)
// =============================================================================
console.log('\n--- TEST GROUP 12: Regression Tests Chấm điểm & Hiển thị kết quả ---');

runTest('RESULT-01', 'Scoring', 'Bài 41 câu, chỉ trả lời đúng 1 câu: điểm ~0.2/10, đúng 1, sai 0, chưa trả lời 40', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  assert(engine.questions.length === 41, 'Bài 1 phải có 41 câu');

  // Answer only question 0 correctly
  const q0 = engine.questions[0];
  engine.setAnswer(q0.id, q0.correctAnswers ? q0.correctAnswers[0] : 'B');

  const summary = engine.calculateSummary();
  assert(summary.totalQuestions === 41, 'Tổng số câu là 41');
  assert(summary.answeredCount === 1, `Số câu đã trả lời phải là 1 (thực tế: ${summary.answeredCount})`);
  assert(summary.correctCount === 1, `Số câu đúng phải là 1 (thực tế: ${summary.correctCount})`);
  assert(summary.wrongCount === 0, `Số câu sai phải là 0 (thực tế: ${summary.wrongCount})`);
  assert(summary.unansweredCount === 40, `Số câu chưa trả lời phải là 40 (thực tế: ${summary.unansweredCount})`);
  assert(summary.score10 === 0.2, `Điểm quy đổi thang 10 phải là 0.2 (thực tế: ${summary.score10})`);
  assert(summary.percentage === 2, `Tỷ lệ điểm phải là 2% (thực tế: ${summary.percentage}%)`);
});

runTest('RESULT-02', 'Scoring', 'Bài 41 câu, chỉ trả lời sai 1 câu: điểm 0/10, đúng 0, sai 1, chưa trả lời 40', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  // Answer question 0 wrongly
  const q0 = engine.questions[0];
  const wrongKey = (q0.options && q0.options.find(o => !o.isCorrect)) ? q0.options.find(o => !o.isCorrect).key : 'INCORRECT_KEY';
  engine.setAnswer(q0.id, wrongKey);

  const summary = engine.calculateSummary();
  assert(summary.totalQuestions === 41, 'Tổng số câu là 41');
  assert(summary.answeredCount === 1, 'Số câu đã trả lời là 1');
  assert(summary.correctCount === 0, 'Số câu đúng là 0');
  assert(summary.wrongCount === 1, 'Số câu sai là 1');
  assert(summary.unansweredCount === 40, 'Số câu chưa trả lời là 40');
  assert(summary.score10 === 0, `Điểm quy đổi thang 10 phải là 0/10 (thực tế: ${summary.score10})`);
  assert(summary.percentage === 0, 'Tỷ lệ điểm là 0%');
});

runTest('RESULT-03', 'Scoring', 'Bài 41 câu, bỏ trống toàn bộ: điểm 0/10, đúng 0, sai 0, chưa trả lời 41', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  const summary = engine.calculateSummary();
  assert(summary.totalQuestions === 41, 'Tổng số câu là 41');
  assert(summary.answeredCount === 0, 'Số câu đã trả lời là 0');
  assert(summary.correctCount === 0, 'Số câu đúng là 0');
  assert(summary.wrongCount === 0, 'Số câu sai là 0');
  assert(summary.unansweredCount === 41, 'Số câu chưa trả lời là 41');
  assert(summary.score10 === 0, `Điểm quy đổi thang 10 phải là 0/10 (thực tế: ${summary.score10})`);
  assert(summary.percentage === 0, 'Tỷ lệ điểm là 0%');
});

runTest('RESULT-04', 'Scoring', 'Bài 41 câu, trả lời đúng tất cả: điểm 10/10, đúng 41, sai 0, chưa trả lời 0', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  engine.questions.forEach(q => {
    if (q.type === 'single_choice') {
      engine.setAnswer(q.id, q.correctAnswers[0]);
    } else if (q.type === 'multiple_choice') {
      engine.setAnswer(q.id, q.correctAnswers);
    } else if (q.type === 'true_false_group') {
      const tfAns = {};
      q.items.forEach(it => tfAns[it.order] = it.correctAnswer);
      engine.setAnswer(q.id, tfAns);
    } else if (q.type === 'drag_drop') {
      const ddAns = {};
      q.pairs.forEach((p, i) => ddAns[p.id || `pair-${i+1}`] = p.correctAnswer);
      engine.setAnswer(q.id, ddAns);
    } else if (q.type === 'drag_drop_columns') {
      const colAns = {};
      q.columns.forEach(c => colAns[c.id] = c.correctItems);
      engine.setAnswer(q.id, colAns);
    }
  });

  const summary = engine.calculateSummary();
  assert(summary.totalQuestions === 41, 'Tổng số câu là 41');
  assert(summary.answeredCount === 41, 'Đã trả lời 41');
  assert(summary.correctCount === 41, 'Đúng 41');
  assert(summary.wrongCount === 0, 'Sai 0');
  assert(summary.unansweredCount === 0, 'Chưa trả lời 0');
  assert(summary.score10 === 10, 'Điểm quy đổi 10/10');
  assert(summary.percentage === 100, 'Tỷ lệ 100%');
});

runTest('RESULT-05', 'Scoring', 'Bài 41 câu, đúng 20 và sai 21: điểm 4.9/10, đúng 20, sai 21, chưa trả lời 0', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  engine.questions.forEach((q, idx) => {
    if (idx < 20) {
      // Correct
      if (q.type === 'single_choice') engine.setAnswer(q.id, q.correctAnswers[0]);
      else if (q.type === 'multiple_choice') engine.setAnswer(q.id, q.correctAnswers);
      else if (q.type === 'true_false_group') {
        const tfAns = {};
        q.items.forEach(it => tfAns[it.order] = it.correctAnswer);
        engine.setAnswer(q.id, tfAns);
      } else if (q.type === 'drag_drop') {
        const ddAns = {};
        q.pairs.forEach((p, i) => ddAns[p.id || `pair-${i+1}`] = p.correctAnswer);
        engine.setAnswer(q.id, ddAns);
      } else if (q.type === 'drag_drop_columns') {
        const colAns = {};
        q.columns.forEach(c => colAns[c.id] = c.correctItems);
        engine.setAnswer(q.id, colAns);
      }
    } else {
      // Wrong
      engine.setAnswer(q.id, 'INTENTIONALLY_WRONG');
    }
  });

  const summary = engine.calculateSummary();
  assert(summary.answeredCount === 41, 'Đã trả lời 41');
  assert(summary.correctCount === 20, 'Đúng 20');
  assert(summary.wrongCount === 21, 'Sai 21');
  assert(summary.unansweredCount === 0, 'Chưa trả lời 0');
  assert(summary.score10 === 4.9, `Điểm thang 10 là 4.9 (thực tế: ${summary.score10})`);
  assert(summary.percentage === 49, `Tỷ lệ phần trăm là 49% (thực tế: ${summary.percentage}%)`);
});

runTest('RESULT-06', 'Submission', 'Nộp bài nhiều lần liên tiếp: chỉ tạo 1 kết quả (Idempotency)', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  const q0 = engine.questions[0];
  engine.setAnswer(q0.id, 'B');

  const historyLenBefore = store.getAttempts().length;
  const res1 = engine.submitQuiz(false);
  const res2 = engine.submitQuiz(false);
  const res3 = engine.submitQuiz(false);

  const historyLenAfter = store.getAttempts().length;
  assert(historyLenAfter === historyLenBefore + 1, 'Chỉ tạo duy nhất 1 lần lưu attempt');
  assert(res1 === res2 && res2 === res3, 'Các lần submit sau trả về cùng 1 kết quả đã chốt');
});

runTest('RESULT-07', 'Submission', 'Hết giờ tự động nộp bài chính xác', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'exam' });
  engine.timeRemaining = 0;
  const summary = engine.submitQuiz(true);
  assert(summary.isTimeout === true, 'Đánh dấu hết giờ nộp bài thành công');
  assert(engine.isSubmitted === true, 'Đã nộp bài');
  assert(engine.timerInterval === null, 'Dừng interval đếm ngược');
});

runTest('RESULT-08', 'ReviewFilters', 'Lọc câu đúng/sai/chưa trả lời hiển thị đúng danh sách và số lượng', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  // Answer 1 correct (q0), 2 wrong (q1, q2), leave 38 unanswered
  engine.setAnswer(engine.questions[0].id, engine.questions[0].correctAnswers[0]);
  engine.setAnswer(engine.questions[1].id, 'WRONG_1');
  engine.setAnswer(engine.questions[2].id, 'WRONG_2');

  const summary = engine.calculateSummary();
  const correctItems = summary.results.filter(r => r.isCorrect);
  const wrongItems = summary.results.filter(r => r.isAnswered && !r.isCorrect);
  const unansweredItems = summary.results.filter(r => r.isUnanswered);

  assert(correctItems.length === 1, `Lọc đúng có 1 câu (có: ${correctItems.length})`);
  assert(wrongItems.length === 2, `Lọc sai có 2 câu (có: ${wrongItems.length})`);
  assert(unansweredItems.length === 38, `Lọc chưa trả lời có 38 câu (có: ${unansweredItems.length})`);
  assert(summary.results.length === 41, 'Tổng là 41');
});

runTest('RESULT-09', 'Session', 'Làm lại bài: reset phiên làm bài đúng (userAnswers rỗng, isSubmitted = false)', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  engine.setAnswer(engine.questions[0].id, 'A');
  engine.submitQuiz(false);
  assert(engine.isSubmitted === true, 'Đã submit');

  // Restart session
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  assert(engine.isSubmitted === false, 'Phiên mới isSubmitted = false');
  assert(Object.keys(engine.userAnswers).length === 0, 'Đáp án phải được reset');
  assert(engine.currentIndex === 0, 'Vị trí câu hỏi quay về câu 0');
});

runTest('RESULT-10', 'Placeholders', 'Dữ liệu HTML mẫu không hiển thị giả mạo (được đồng bộ từ kết quả)', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  const summary = engine.calculateSummary();
  // With 0 answered:
  assert(summary.score10 === 0, 'Điểm phải là 0/10');
  assert(summary.percentage === 0, 'Phần trăm phải là 0%');
  assert(summary.unansweredCount === 41, 'Chưa trả lời 41');
});

runTest('RESULT-11', 'Scoring', 'Câu nhiều đáp án và Đúng/Sai tính điểm thành phần đúng', () => {
  const engine = new QuizEngine();
  // True/False with 4 items: correct 3 out of 4 = 0.75 points
  const qTF = {
    id: 'test-tf-sub',
    type: 'true_false_group',
    items: [
      { order: 1, correctAnswer: 'Đúng' },
      { order: 2, correctAnswer: 'Sai' },
      { order: 3, correctAnswer: 'Đúng' },
      { order: 4, correctAnswer: 'Sai' }
    ]
  };
  const evalTF = engine.evaluateQuestion(qTF, { 1: 'Đúng', 2: 'Sai', 3: 'Đúng', 4: 'Đúng' });
  assert(Math.abs(evalTF.score - 0.75) < 0.001, 'Đúng 3/4 câu Đúng/Sai được 0.75 điểm');
});

runTest('RESULT-12', 'Scoring', 'Câu kéo thả cả điền khuyết và 2 cột tính điểm và phần xem lại đúng', () => {
  const engine = new QuizEngine();
  const qCols = {
    id: 'test-col-sub',
    type: 'drag_drop_columns',
    columns: [
      { id: 'c1', title: 'C1', correctItems: ['A', 'B'] },
      { id: 'c2', title: 'C2', correctItems: ['C', 'D'] }
    ]
  };
  // Answer only column 1 correctly
  const evalCol = engine.evaluateQuestion(qCols, { c1: ['A', 'B'], c2: [] });
  assert(Math.abs(evalCol.score - 0.5) < 0.001, 'Đúng 1/2 cột được 0.5 điểm');
  assert(evalCol.colResults.length === 2, 'Có đủ 2 cột kết quả để xem lại');
});

// =============================================================================
// TEST GROUP 13: TÍNH NĂNG 50 CÂU NGẪU NHIÊN
// =============================================================================
console.log('\n--- TEST GROUP 13: Tính năng Luyện & Thi thử 50 câu ngẫu nhiên ---');

runTest('RANDOM50-01', 'Random 50', 'Khởi tạo 50 câu ngẫu nhiên rút đủ 50 câu duy nhất từ ngân hàng 235 câu', () => {
  const engine = new QuizEngine();
  const qList = engine.startQuiz({ exerciseId: 'random_50', mode: 'random_50' });
  assert(qList.length === 50, `Phải có đúng 50 câu, thực tế: ${qList.length}`);
  const uniqueIds = new Set(qList.map(q => q.id));
  assert(uniqueIds.size === 50, 'Tất cả 50 câu hỏi phải là các câu duy nhất không trùng lặp');
  assert(qList[0].sessionNumber === 1 && qList[49].sessionNumber === 50, 'Đánh số thứ tự sessionNumber từ 1 đến 50');
  assert(engine.exercise.id === 'random_50', 'Exercise ID là random_50');
  assert(engine.exercise.title.includes('50 CÂU NGẪU NHIÊN'), 'Tiêu đề thể hiện đúng 50 câu ngẫu nhiên');
});

runTest('RANDOM50-02', 'Random 50', 'Chế độ luyện tập 50 câu tự do bật kiểm tra tức thì và thời gian linh hoạt', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'random_50', mode: 'random_50', instantCheck: true });
  assert(engine.instantCheck === true, 'Chế độ tự do cho phép kiểm tra đáp án tức thì');
  assert(engine.exercise.title === 'LUYỆN 50 CÂU NGẪU NHIÊN', 'Tiêu đề chế độ tự do là LUYỆN 50 CÂU NGẪU NHIÊN');
  assert(engine.timeLimitSeconds >= 45 * 60, 'Thời gian làm bài tự do thoải mái');
});

runTest('RANDOM50-03', 'Random 50', 'Chế độ thi thử 50 câu tính giờ đúng 45 phút và khóa kiểm tra tức thì', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'random_50', mode: 'exam', isRandom50: true, instantCheck: false });
  assert(engine.instantCheck === false, 'Thi thử không cho phép kiểm tra tức thì trước khi nộp');
  assert(engine.timeLimitSeconds === 45 * 60, `Thời gian thi thử 50 câu phải là 45 phút (2700s), thực tế: ${engine.timeLimitSeconds}`);
  assert(engine.getFormattedTime() === '45:00', 'Đồng hồ hiển thị ban đầu 45:00');
  assert(engine.exercise.title === 'ĐỀ THI THỬ 50 CÂU NGẪU NHIÊN', 'Tiêu đề thể hiện đúng ĐỀ THI THỬ 50 CÂU NGẪU NHIÊN');
});

runTest('RANDOM50-04', 'Random 50', 'Xáo trộn ngẫu nhiên tạo các đề thi 50 câu khác nhau giữa các lượt bắt đầu', () => {
  const engine1 = new QuizEngine();
  const qList1 = engine1.startQuiz({ exerciseId: 'random_50', mode: 'random_50' });

  const engine2 = new QuizEngine();
  const qList2 = engine2.startQuiz({ exerciseId: 'random_50', mode: 'random_50' });

  // Compare first 10 question IDs
  const sample1 = qList1.slice(0, 10).map(q => q.id).join(',');
  const sample2 = qList2.slice(0, 10).map(q => q.id).join(',');
  assert(sample1 !== sample2, 'Hai lượt tạo đề 50 câu ngẫu nhiên phải sinh ra thứ tự hoặc tập hợp câu hỏi khác nhau');
});

runTest('RANDOM50-05', 'Random 50', 'Chọn 50 câu từ cấu hình modal với exerciseId: all và questionCount: 50', () => {
  const engine = new QuizEngine();
  const qList = engine.startQuiz({ exerciseId: 'all', questionCount: '50', mode: 'random' });
  assert(qList.length === 50, `Rút đúng 50 câu từ tất cả các bài, thực tế: ${qList.length}`);
  assert(engine.exercise.id === 'random_50', 'Tự động gắn mã đề random_50 khi chọn 50 câu');
});

// =============================================================================
// TỔNG KẾT BÁO CÁO AUTOMATION
// =============================================================================
console.log('\n================================================================');
console.log('                 TỔNG KẾT KIỂM THỬ AUTOMATION                  ');
console.log('================================================================');
console.log(`- Tổng số Test Cases:    ${testResults.length}`);
console.log(`- Số ca kiểm thử PASS:   ${passCount}`);
console.log(`- Số ca kiểm thử FAIL:   ${failCount}`);
console.log(`- Tỷ lệ hoàn thành:      ${Math.round((passCount / testResults.length) * 100)}%`);

if (failCount > 0) {
  console.error(`\n❌ PHÁT HIỆN ${failCount} TEST CASES THẤT BẠI!`);
  process.exit(1);
} else {
  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐÃ ĐẠT PASS 100%! HỆ THỐNG SẴN SÀNG SỬ DỤNG!');
  console.log('================================================================\n');
  process.exit(0);
}
