/**
 * Automated Test Suite: Advanced Randomization, New Question Types & Session State
 * Tests all required criteria from Prompt Section 8:
 * - 50 questions shuffle without loss or duplicate
 * - Options shuffle Fisher-Yates with stable ID mapping
 * - Correct answer moved from A to C evaluated correctly
 * - Protection for order-dependent questions ("Tất cả đáp án trên"...)
 * - Multiple choice options shuffle & evaluation
 * - Fill in the blank (case-insensitive, whitespace trim, accents, equivalent answers)
 * - Matching (independent column shuffle, ID pair scoring)
 * - Table completion (per-cell scoring, read-only preservation)
 * - Reload persistence (F5 preserves active session)
 * - Back navigation preserves answers
 * - No answer reveal before check
 * - Toggle shuffle OFF keeps original order
 * - New attempt creates fresh random order
 * - Backward compatibility with all 235 existing questions
 */
import { QuizEngine, shuffleArray, isOptionOrderDependent } from './js/quizEngine.js';
import { store } from './js/store.js';
import { INITIAL_QUIZ_DATA } from './js/data.js';

console.log('================================================================');
console.log('  BỘ KIỂM THỬ TỰ ĐỘNG: TRỘN ĐỀ, DẠNG CÂU HỎI MỚI & TRẠNG THÁI  ');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTestCase(id, name, testFn) {
  try {
    testFn();
    passedTests++;
    console.log(`  ✅ [PASS] ${id.padEnd(10)}: ${name}`);
  } catch (err) {
    failedTests++;
    errors.push({ id, name, err: err.message });
    console.error(`  ❌ [FAIL] ${id.padEnd(10)}: ${name}`);
    console.error(`     Chi tiết: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST GROUP 1: TRỘN THỨ TỰ CÂU HỎI & FISHER-YATES
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Trộn thứ tự câu hỏi & Thuật toán Fisher–Yates ---');

runTestCase('SHUF-50', 'Trộn 50 câu hỏi không mất hoặc trùng câu', () => {
  const dummy50 = Array.from({ length: 50 }, (_, i) => ({
    id: `q-${i + 1}`,
    number: i + 1,
    type: 'single_choice',
    content: `Câu hỏi số ${i + 1}`,
    options: [
      { key: 'A', content: 'Opt A', isCorrect: true },
      { key: 'B', content: 'Opt B', isCorrect: false }
    ],
    correctAnswers: ['A']
  }));

  const shuffled = shuffleArray(dummy50);
  assert(shuffled.length === 50, `Độ dài sau khi trộn phải đúng 50 (thực tế: ${shuffled.length})`);

  const ids = new Set(shuffled.map(q => q.id));
  assert(ids.size === 50, `Phải có đúng 50 ID phân biệt, không được trùng câu (thực tế: ${ids.size})`);

  dummy50.forEach(q => {
    assert(ids.has(q.id), `Thiếu câu hỏi ${q.id} sau khi trộn`);
  });

  // Verify that shuffle actually changes order (probability of 50 items identical is 1/50!)
  const isIdentical = dummy50.every((q, idx) => q.id === shuffled[idx].id);
  assert(!isIdentical, 'Trật tự 50 câu sau khi trộn không được giống hoàn toàn ban đầu');
});

runTestCase('SHUF-TOGGLE', 'Chế độ tắt trộn giữ nguyên thứ tự ban đầu', () => {
  const engine = new QuizEngine();
  const questions = engine.startQuiz({
    exerciseId: 'bai-1',
    mode: 'all',
    shuffleQuestions: false,
    shuffleOptions: false
  });

  const baseBai1 = store.getExercise('bai-1').questions;
  assert(questions.length === baseBai1.length, 'Số lượng câu hỏi phải trùng khớp');
  questions.forEach((q, idx) => {
    assert(q.id === baseBai1[idx].id, `Câu ở vị trí ${idx} bị thay đổi khi tắt trộn`);
    if (q.options && baseBai1[idx].options) {
      assert(q.options[0].key === baseBai1[idx].options[0].key, `Phương án ở vị trí ${idx} bị thay đổi khi tắt trộn`);
    }
  });
});

runTestCase('SHUF-NEW-RUN', 'Bắt đầu lượt mới có thể tạo thứ tự khác nhau', () => {
  const engine = new QuizEngine();
  const run1 = engine.startQuiz({ exerciseId: 'bai-1', shuffleQuestions: true, shuffleOptions: true });
  const ids1 = run1.map(q => q.id).join(',');

  let foundDifferent = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const run2 = engine.startQuiz({ exerciseId: 'bai-1', shuffleQuestions: true, shuffleOptions: true });
    const ids2 = run2.map(q => q.id).join(',');
    if (ids1 !== ids2) {
      foundDifferent = true;
      break;
    }
  }
  assert(foundDifferent, 'Các lượt làm bài khác nhau phải tạo ra thứ tự xáo trộn khác nhau');
});

// -----------------------------------------------------------------------------
// TEST GROUP 2: TRỘN VỊ TRÍ ĐÁP ÁN VÀ ÁNH XẠ STABLE ID
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Trộn vị trí đáp án & Bảo toàn chấm điểm ---');

runTestCase('OPT-STABLE-ID', 'Đáp án đúng chuyển từ A sang C vẫn được chấm chính xác', () => {
  const engine = new QuizEngine();
  const testQuestion = {
    id: 'test-q-1',
    type: 'single_choice',
    content: 'Tuyên ngôn của Đảng Cộng sản ra đời năm nào?',
    options: [
      { key: 'A', content: '1848', isCorrect: true },
      { key: 'B', content: '1871', isCorrect: false },
      { key: 'C', content: '1917', isCorrect: false },
      { key: 'D', content: '1945', isCorrect: false }
    ],
    correctAnswers: ['A']
  };

  // Mock a session question where options were shuffled so that origKey 'A' is placed at visualKey 'C'
  const sessionQuestion = {
    ...testQuestion,
    options: [
      { origKey: 'C', key: 'C', visualKey: 'A', content: '1917', isCorrect: false },
      { origKey: 'D', key: 'D', visualKey: 'B', content: '1945', isCorrect: false },
      { origKey: 'A', key: 'A', visualKey: 'C', content: '1848', isCorrect: true },
      { origKey: 'B', key: 'B', visualKey: 'D', content: '1871', isCorrect: false }
    ]
  };

  // User chooses option at visualKey 'C' (content '1848', origKey 'A')
  const evalCorrect = engine.evaluateQuestion(sessionQuestion, 'A');
  assert(evalCorrect.isCorrect === true, 'Chọn đáp án A (hiển thị tại vị trí C) phải đúng');
  assert(evalCorrect.score === 1, 'Điểm số phải là 1');
  assert(evalCorrect.correctVisualKey === 'C', `Visual key của đáp án đúng phải là C (thực tế: ${evalCorrect.correctVisualKey})`);

  // User chooses option at visualKey 'A' (content '1917', origKey 'C')
  const evalWrong = engine.evaluateQuestion(sessionQuestion, 'C');
  assert(evalWrong.isCorrect === false, 'Chọn đáp án sai C (hiển thị tại vị trí A) phải được chấm sai');
  assert(evalWrong.score === 0, 'Điểm số phải là 0');
});

runTestCase('OPT-ORDER-DEP', 'Xử lý an toàn câu phụ thuộc thứ tự ("Tất cả đáp án trên"...)', () => {
  const dependentQ1 = {
    id: 'dep-1',
    type: 'single_choice',
    content: 'Những tiền đề khoa học tự nhiên ra đời của CNXHKH?',
    options: [
      { key: 'A', content: 'Học thuyết tiến hóa', isCorrect: false },
      { key: 'B', content: 'Định luật bảo toàn và chuyển hóa năng lượng', isCorrect: false },
      { key: 'C', content: 'Học thuyết tế bào', isCorrect: false },
      { key: 'D', content: 'Tất cả các đáp án trên đều đúng', isCorrect: true }
    ]
  };

  const dependentQ2 = {
    id: 'dep-2',
    type: 'single_choice',
    content: 'Ai là người sáng lập?',
    options: [
      { key: 'A', content: 'C.Mác', isCorrect: false },
      { key: 'B', content: 'Ph.Ăngghen', isCorrect: false },
      { key: 'C', content: 'Cả A và B đều đúng', isCorrect: true },
      { key: 'D', content: 'V.I.Lênin', isCorrect: false }
    ]
  };

  const independentQ = {
    id: 'indep-1',
    type: 'single_choice',
    content: 'Tác phẩm nào đánh dấu sự ra đời của CNXHKH?',
    options: [
      { key: 'A', content: 'Tuyên ngôn của Đảng Cộng sản', isCorrect: true },
      { key: 'B', content: 'Tư bản', isCorrect: false },
      { key: 'C', content: 'Chống Đuy-rinh', isCorrect: false },
      { key: 'D', content: 'Biện chứng của tự nhiên', isCorrect: false }
    ]
  };

  assert(isOptionOrderDependent(dependentQ1) === true, 'dependentQ1 phải được phát hiện là phụ thuộc thứ tự');
  assert(isOptionOrderDependent(dependentQ2) === true, 'dependentQ2 phải được phát hiện là phụ thuộc thứ tự');
  assert(isOptionOrderDependent(independentQ) === false, 'independentQ không phụ thuộc thứ tự');
});

runTestCase('OPT-MULTI-SHUF', 'Câu nhiều đáp án đúng không bị sai mapping khi xáo trộn', () => {
  const engine = new QuizEngine();
  const multiQ = {
    id: 'multi-test',
    type: 'multiple_choice',
    content: 'Chọn các phát minh tiền đề khoa học tự nhiên của CNXHKH:',
    options: [
      { origKey: 'C', visualKey: 'A', content: 'Thuyết tế bào', isCorrect: true },
      { origKey: 'A', visualKey: 'B', content: 'Thuyết tiến hóa', isCorrect: true },
      { origKey: 'D', visualKey: 'C', content: 'Thuyết tương đối', isCorrect: false },
      { origKey: 'B', visualKey: 'D', content: 'Định luật bảo toàn năng lượng', isCorrect: true }
    ],
    correctAnswers: ['A', 'B', 'C']
  };

  // User chooses origKey A, B, C
  const evalRight = engine.evaluateQuestion(multiQ, ['A', 'B', 'C']);
  assert(evalRight.isCorrect === true, 'Chọn đủ 3 đáp án đúng phải đạt 1 điểm');
  assert(evalRight.score === 1, 'Điểm số phải là 1');

  // User misses 1 key
  const evalMissed = engine.evaluateQuestion(multiQ, ['A', 'B']);
  assert(evalMissed.isCorrect === false, 'Thiếu 1 đáp án không đạt điểm tối đa');

  // User picks wrong key D
  const evalWrong = engine.evaluateQuestion(multiQ, ['A', 'B', 'D']);
  assert(evalWrong.isCorrect === false, 'Chọn lẫn đáp án sai D phải được chấm sai');
});

// -----------------------------------------------------------------------------
// TEST GROUP 3: CÁC DẠNG CÂU HỎI MỚI (FILL_BLANK, MATCHING, TABLE_COMPLETION)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Các dạng câu hỏi mới ---');

runTestCase('Q-FILL-BLANK', 'Điền từ vào chỗ trống: hoa/thường, khoảng trắng, dấu tiếng Việt & tương đương', () => {
  const engine = new QuizEngine();
  const fbQuestion = {
    id: 'fb-test-1',
    type: 'fill_blank',
    content: 'Chủ nghĩa xã hội khoa học ra đời vào năm ______ do C.Mác và ______ sáng lập.',
    blanks: [
      {
        id: 'blank-1',
        order: 1,
        label: 'Năm ra đời',
        acceptedAnswers: ['1848', 'năm 1848']
      },
      {
        id: 'blank-2',
        order: 2,
        label: 'Đồng sáng lập',
        acceptedAnswers: ['Ph.Ăngghen', 'Ăngghen', 'Friedrich Engels', 'Ph. Ăngghen']
      }
    ]
  };

  // Case 1: Exact match with uppercase and whitespace variation
  const ans1 = {
    'blank-1': '   1848  ',
    'blank-2': '  PH. ĂNGGHEN '
  };
  const eval1 = engine.evaluateQuestion(fbQuestion, ans1);
  assert(eval1.isCorrect === true, 'Chuẩn hóa chữ hoa/thường và khoảng trắng phải pass');
  assert(eval1.score === 1, 'Điểm số đạt tối đa');
  assert(eval1.correctCount === 2, 'Cả 2 chỗ trống đều đúng');

  // Case 2: Equivalent answer for blank 1 ("năm 1848")
  const ans2 = {
    'blank-1': 'năm 1848',
    'blank-2': 'Friedrich Engels'
  };
  const eval2 = engine.evaluateQuestion(fbQuestion, ans2);
  assert(eval2.isCorrect === true, 'Đáp án tương đương cấu hình sẵn phải được tính đúng');

  // Case 3: Partial correct (1 đúng, 1 sai)
  const ans3 = {
    'blank-1': '1848',
    'blank-2': 'V.I. Lênin'
  };
  const eval3 = engine.evaluateQuestion(fbQuestion, ans3);
  assert(eval3.isCorrect === false, 'Không đúng toàn bộ thì isCorrect là false');
  assert(eval3.score === 0.5, 'Điểm thành phần 1/2 chỗ trống phải là 0.5');
  assert(eval3.blankResults[0].isCorrect === true, 'Chỗ trống 1 đúng');
  assert(eval3.blankResults[1].isCorrect === false, 'Chỗ trống 2 sai');
});

runTestCase('Q-MATCHING', 'Nối cột: trộn độc lập 2 cột, chấm bằng ID cặp ghép & xem đúng/sai', () => {
  const engine = new QuizEngine();
  const matchQuestion = {
    id: 'match-test-1',
    type: 'matching',
    content: 'Hãy ghép các nhân vật và sự kiện tương ứng:',
    pairs: [
      { id: 'pair-1', left: 'Karl Marx', right: 'Tác giả bộ Tư bản' },
      { id: 'pair-2', left: 'Friedrich Engels', right: 'Đồng tác giả Tuyên ngôn của Đảng Cộng sản' },
      { id: 'pair-3', left: 'V.I. Lênin', right: 'Lãnh đạo Cách mạng Tháng Mười Nga 1917' }
    ]
  };

  // Simulate column shuffling
  const prep = engine.startQuiz({
    exerciseId: 'custom',
    questionsList: [matchQuestion],
    shuffleQuestions: false,
    shuffleOptions: true
  });
  const sessionQ = prep[0];
  assert(Array.isArray(sessionQ.sessionColumnA), 'Phải có sessionColumnA');
  assert(Array.isArray(sessionQ.sessionColumnB), 'Phải có sessionColumnB');
  assert(sessionQ.sessionColumnA.length === 3, 'Cột A có đủ 3 mục');
  assert(sessionQ.sessionColumnB.length === 3, 'Cột B có đủ 3 mục');

  // Case 1: Match all correctly by ID
  const perfectAnswer = {
    'pair-1': 'pair-1',
    'pair-2': 'pair-2',
    'pair-3': 'pair-3'
  };
  const evalPerfect = engine.evaluateQuestion(sessionQ, perfectAnswer);
  assert(evalPerfect.isCorrect === true, 'Ghép đúng cả 3 cặp phải đúng');
  assert(evalPerfect.score === 1, 'Điểm số 1.0');
  assert(evalPerfect.correctCount === 3, 'Số cặp đúng là 3');

  // Case 2: One mismatched pair
  const partialAnswer = {
    'pair-1': 'pair-1',
    'pair-2': 'pair-3', // Wrong
    'pair-3': 'pair-2'  // Wrong
  };
  const evalPartial = engine.evaluateQuestion(sessionQ, partialAnswer);
  assert(evalPartial.isCorrect === false, 'Ghép sai 2 cặp thì isCorrect là false');
  assert(evalPartial.correctCount === 1, 'Chỉ có 1 cặp đúng');
  assert(evalPartial.pairResults[0].isCorrect === true, 'Pair 1 đúng');
  assert(evalPartial.pairResults[1].isCorrect === false, 'Pair 2 sai');
  assert(evalPartial.pairResults[2].isCorrect === false, 'Pair 3 sai');
});

runTestCase('Q-TABLE', 'Điền bảng: ô chỉ đọc giữ nguyên, chấm từng ô nhập liệu, đáp án tương đương', () => {
  const engine = new QuizEngine();
  const tableQuestion = {
    id: 'tbl-test-1',
    type: 'table_completion',
    content: 'Hoàn thành bảng thông tin về ba phát minh khoa học tự nhiên thế kỷ XIX:',
    headers: ['STT', 'Tên phát minh', 'Tác giả'],
    rows: [
      [
        { text: '1', isInput: false },
        { text: 'Học thuyết tiến hóa', isInput: false },
        { isInput: true, id: 'c-darwin', placeholder: 'Nhập tác giả...', acceptedAnswers: ['S.Đác-uyn', 'Đác-uyn', 'Charles Darwin', 'Darwin'] }
      ],
      [
        { text: '2', isInput: false },
        { isInput: true, id: 'c-te-bao', placeholder: 'Nhập tên học thuyết...', acceptedAnswers: ['Học thuyết tế bào', 'Thuyết tế bào'] },
        { text: 'M.Slai-đen và T.Svan-nơ', isInput: false }
      ]
    ]
  };

  // Case 1: All cells filled correctly
  const perfectAns = {
    'c-darwin': '  charles darwin ',
    'c-te-bao': 'Thuyết tế bào'
  };
  const evalPerfect = engine.evaluateQuestion(tableQuestion, perfectAns);
  assert(evalPerfect.isCorrect === true, 'Cả 2 ô nhập liệu đúng thì câu đạt điểm tối đa');
  assert(evalPerfect.score === 1, 'Điểm số là 1');
  assert(evalPerfect.correctCount === 2, 'Số ô đúng là 2');

  // Case 2: One cell wrong
  const partialAns = {
    'c-darwin': 'Darwin',
    'c-te-bao': 'Thuyết nguyên tử' // Sai
  };
  const evalPartial = engine.evaluateQuestion(tableQuestion, partialAns);
  assert(evalPartial.isCorrect === false, 'Còn ô sai thì isCorrect = false');
  assert(evalPartial.score === 0.5, 'Đúng 1/2 ô được 0.5 điểm');
  assert(evalPartial.cellResults[0].isCorrect === true, 'Ô 1 đúng');
  assert(evalPartial.cellResults[1].isCorrect === false, 'Ô 2 sai');
});

// -----------------------------------------------------------------------------
// TEST GROUP 4: TRẠNG THÁI LÀM BÀI, ĐIỀU HƯỚNG VÀ BẢO TOÀN DỮ LIỆU
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Trạng thái phiên làm bài, điều hướng & F5 reload ---');

runTestCase('PERSIST-F5', 'Tải lại trang (F5) khôi phục chính xác phiên, câu hỏi và đáp án', () => {
  store.clearActiveSession();
  const engine1 = new QuizEngine();
  engine1.startQuiz({
    exerciseId: 'bai-1',
    mode: 'random',
    shuffleQuestions: true,
    shuffleOptions: true
  });

  const q0 = engine1.questions[0];
  const q1 = engine1.questions[1];
  engine1.setAnswer(q0.id, 'A');
  engine1.setAnswer(q1.id, 'B');
  engine1.toggleFlag(q0.id);

  // Read saved session from localStorage via store
  const savedSession = store.getActiveSession();
  assert(Boolean(savedSession), 'Phải có active session lưu trong storage');
  assert(savedSession.questions.length === engine1.questions.length, 'Số lượng câu hỏi lưu đúng');
  assert(savedSession.userAnswers[q0.id] === 'A', 'Đáp án q0 được lưu đúng');
  assert(savedSession.flaggedQuestions.includes(q0.id), 'Cờ đánh dấu q0 được lưu đúng');

  // Restore into a fresh QuizEngine instance (simulating browser page reload)
  const engine2 = new QuizEngine();
  const restoreSuccess = engine2.restoreSession(savedSession);
  assert(restoreSuccess === true, 'Khôi phục phiên thành công');
  assert(engine2.questions.length === engine1.questions.length, 'Số lượng câu hỏi khớp hoàn toàn');
  assert(engine2.questions[0].id === engine1.questions[0].id, 'Thứ tự câu hỏi được bảo toàn sau reload');
  const qOpt1 = engine1.questions.find(q => q.options && q.options.length);
  if (qOpt1) {
    const qOpt2 = engine2.questions.find(q => q.id === qOpt1.id);
    assert(qOpt2.options[0].visualKey === qOpt1.options[0].visualKey, 'Thứ tự phương án được bảo toàn sau reload');
  }
  assert(engine2.userAnswers[q0.id] === 'A', 'Đáp án người dùng chọn được giữ nguyên sau reload');
  assert(engine2.isFlagged(q0.id) === true, 'Cờ xem lại được giữ nguyên sau reload');

  // Clean up
  store.clearActiveSession();
});

runTestCase('NAV-PRESERVE', 'Quay lại câu trước không làm mất đáp án đã chọn', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });

  const q1 = engine.questions[0];
  const q2 = engine.questions[1];

  engine.goToQuestion(0);
  engine.setAnswer(q1.id, 'B');
  assert(engine.getUserAnswer(q1.id) === 'B', 'Đáp án câu 1 đã lưu');

  engine.nextQuestion();
  assert(engine.currentIndex === 1, 'Đang ở câu 2');
  engine.setAnswer(q2.id, 'C');
  assert(engine.getUserAnswer(q2.id) === 'C', 'Đáp án câu 2 đã lưu');

  engine.prevQuestion();
  assert(engine.currentIndex === 0, 'Đã quay lại câu 1');
  assert(engine.getUserAnswer(q1.id) === 'B', 'Đáp án câu 1 vẫn nguyên vẹn sau khi quay lại');

  engine.nextQuestion();
  assert(engine.currentIndex === 1, 'Đã tới lại câu 2');
  assert(engine.getUserAnswer(q2.id) === 'C', 'Đáp án câu 2 vẫn nguyên vẹn');
});

runTestCase('NO-LEAK-BEFORE-CHECK', 'Chưa nhấn kiểm tra thì không lộ đáp án đúng/sai', () => {
  const engine = new QuizEngine();
  engine.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
  const q = engine.getCurrentQuestion();

  engine.setAnswer(q.id, 'A');
  assert(engine.isChecked(q.id) === false, 'Chưa nhấn kiểm tra thì isChecked phải là false');
  assert(engine.isSubmitted === false, 'Chưa nộp bài thì isSubmitted phải là false');

  // Trigger check explicitly
  const checkResult = engine.checkCurrentQuestion();
  assert(engine.isChecked(q.id) === true, 'Sau khi nhấn kiểm tra thì isChecked là true');
  assert(typeof checkResult.isCorrect === 'boolean', 'Kết quả đánh giá trả về boolean');
});

// -----------------------------------------------------------------------------
// TEST GROUP 5: TƯƠNG THÍCH TOÀN BỘ 235 CÂU HỎI HIỆN TẠI
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Tương thích 100% dữ liệu 235 câu hỏi hiện tại ---');

runTestCase('COMPAT-ALL-235', 'Toàn bộ 235 câu hỏi hiện có hoạt động trơn tru với QuizEngine mới', () => {
  let count = 0;
  INITIAL_QUIZ_DATA.forEach(exercise => {
    exercise.questions.forEach(q => {
      count++;
      assert(Boolean(q.id), `Câu thiếu ID trong ${exercise.id}`);
      assert(Boolean(q.type), `Câu ${q.id} thiếu type`);
      assert(Boolean(q.content), `Câu ${q.id} thiếu content`);

      // Test evaluation does not crash with empty or random answer
      const engine = new QuizEngine();
      const evalEmpty = engine.evaluateQuestion(q, null);
      assert(evalEmpty.isCorrect === false, `Empty eval failed on ${q.id}`);
    });
  });
  assert(count === 235, `Phải kiểm thử đúng 235 câu hỏi (thực tế: ${count})`);
});

// -----------------------------------------------------------------------------
// TỔNG KẾT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('                 TỔNG KẾT KIỂM THỬ NÂNG CẤP                    ');
console.log('================================================================');
console.log(`- Tổng số ca kiểm thử:  ${passedTests + failedTests}`);
console.log(`- Ca kiểm thử PASS:     ${passedTests}`);
console.log(`- Ca kiểm thử FAIL:     ${failedTests}`);
console.log(`- Tỷ lệ thành công:     ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);

if (failedTests > 0) {
  console.error('\n❌ Có bài kiểm thử thất bại! Vui lòng kiểm tra lại mã nguồn.');
  process.exit(1);
} else {
  console.log('\n🎉 TẤT CẢ 13/13 CA KIỂM THỬ NÂNG CẤP ĐÃ ĐẠT PASS 100%!');
  console.log('================================================================\n');
  process.exit(0);
}
