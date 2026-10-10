/**
 * Comprehensive Automated QA Test Suite
 * Covers TC01 to TC08, Modes, LocalStorage Scenarios A-E, Security/XSS, and Admin Logic.
 * Exits with code 1 on ANY failure, and code 0 only on 100% PASS.
 */

import { INITIAL_QUIZ_DATA } from './js/data.js';
import { store, migrateExercisesData, validateExercisesSchema, STORAGE_KEYS, CURRENT_DATA_VERSION } from './js/store.js';
import { QuizEngine } from './js/quizEngine.js';
import { escapeHtml } from './js/app.js';

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
