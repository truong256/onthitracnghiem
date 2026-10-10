/**
 * End-to-end Comprehensive Data & Logic Validation Test Suite
 * Strictly validates all questions, types, options, answers, and data migration.
 * Exits with code 1 on ANY failure, and code 0 only on 100% pass.
 */
import { INITIAL_QUIZ_DATA } from './js/data.js';
import { migrateExercisesData } from './js/store.js';

console.log('================================================================');
console.log('       BỘ KIỂM THỬ TỰ ĐỘNG NGÂN HÀNG CÂU HỎI & LOGIC QUIZ       ');
console.log('================================================================\n');

const errors = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: BÀI HỌC & CẤU TRÚC TỔNG THỂ
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: Kiểm tra cấu trúc bài học và ID ---');
assert(INITIAL_QUIZ_DATA.length === 6, `Hệ thống phải có đủ 6 bài học (thực tế: ${INITIAL_QUIZ_DATA.length})`);

const expectedExerciseIds = ['bai-1', 'bai-2', 'bai-3', 'bai-4', 'bai-5', 'bai-6'];
const actualExerciseIds = INITIAL_QUIZ_DATA.map(e => e.id);

expectedExerciseIds.forEach(id => {
  assert(actualExerciseIds.includes(id), `Bài học thiếu ID: ${id}`);
});

const exerciseIdSet = new Set();
INITIAL_QUIZ_DATA.forEach(e => {
  assert(!exerciseIdSet.has(e.id), `Trùng lặp exercise ID: ${e.id}`);
  exerciseIdSet.add(e.id);
  assert(e.title && e.title.trim().length > 0, `Bài ${e.id} thiếu tiêu đề`);
  assert(e.description && e.description.trim().length > 0, `Bài ${e.id} thiếu mô tả`);
  assert(Array.isArray(e.questions) && e.questions.length > 0, `Bài ${e.id} không có câu hỏi`);
});

// Check Bai 6 specifically
const bai6 = INITIAL_QUIZ_DATA.find(e => e.id === 'bai-6');
if (bai6) {
  assert(bai6.questions.length === 27, `Bài 6 phải có đủ 27 câu hỏi từ Word (thực tế: ${bai6.questions.length})`);
  assert(bai6.title.includes('BÀI 6') || bai6.title.includes('GIA ĐÌNH'), `Tiêu đề Bài 6 không đúng format: ${bai6.title}`);
}

// -----------------------------------------------------------------------------
// TEST SUITE 2: KIỂM TRA TỪNG CÂU HỎI TRONG TOÀN BỘ NGÂN HÀNG
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Kiểm tra tính hợp lệ của từng câu hỏi ---');

const globalQuestionIds = new Set();
let totalQuestionsCount = 0;
let needsReviewCount = 0;
const typeCounts = {};

INITIAL_QUIZ_DATA.forEach(ex => {
  const lessonQNumSet = new Set();

  ex.questions.forEach((q, idx) => {
    totalQuestionsCount++;
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;

    if (q.needsReview) {
      needsReviewCount++;
      warnings.push(`[NEEDS_REVIEW] ${q.id}: ${q.reviewReason || 'Chưa ghi rõ lý do'}`);
    }

    // 1. ID và Number
    assert(q.id && typeof q.id === 'string', `Câu hỏi vị trí ${idx + 1} bài ${ex.id} thiếu ID`);
    assert(!globalQuestionIds.has(q.id), `Trùng lặp question ID toàn cục: ${q.id}`);
    globalQuestionIds.add(q.id);

    assert(q.number === idx + 1, `Số thứ tự câu hỏi ${q.id} không khớp vị trí: ${q.number} !== ${idx + 1}`);
    assert(!lessonQNumSet.has(q.number), `Trùng số thứ tự câu hỏi trong bài ${ex.id}: ${q.number}`);
    lessonQNumSet.add(q.number);

    // 2. Nội dung cơ bản
    assert(q.header && q.header.trim().length > 0, `Câu ${q.id} thiếu header`);
    assert(q.content && q.content.trim().length > 0, `Câu ${q.id} thiếu content`);

    // 3. Kiểm tra theo từng loại câu hỏi
    const validTypes = ['single_choice', 'multiple_choice', 'true_false_group', 'drag_drop', 'drag_drop_columns'];
    assert(validTypes.includes(q.type), `Câu ${q.id} có loại không hợp lệ: ${q.type}`);

    if (q.type === 'single_choice') {
      assert(Array.isArray(q.options) && q.options.length >= 2, `Câu 1 đáp án ${q.id} phải có ít nhất 2 options (có: ${q.options?.length})`);
      const correctOpts = (q.options || []).filter(o => o.isCorrect);
      assert(correctOpts.length === 1, `Câu single_choice ${q.id} phải có đúng 1 đáp án đúng (có: ${correctOpts.length})`);
      assert(Array.isArray(q.correctAnswers) && q.correctAnswers.length === 1, `Câu ${q.id} correctAnswers phải có độ dài 1`);
      if (correctOpts.length === 1 && q.correctAnswers?.length === 1) {
        assert(correctOpts[0].key === q.correctAnswers[0], `Câu ${q.id} correctAnswers không khớp option isCorrect: ${q.correctAnswers[0]} !== ${correctOpts[0].key}`);
      }
      // Check each option content
      q.options.forEach(opt => {
        assert(opt.key && typeof opt.key === 'string', `Option trong ${q.id} thiếu key`);
        assert(opt.content && opt.content.trim().length > 0, `Option ${opt.key} trong ${q.id} bị rỗng nội dung`);
      });
    } else if (q.type === 'multiple_choice') {
      assert(Array.isArray(q.options) && q.options.length >= 2, `Câu chọn nhiều đáp án ${q.id} phải có ít nhất 2 options`);
      const correctOpts = (q.options || []).filter(o => o.isCorrect);
      assert(correctOpts.length >= 2, `Câu multiple_choice ${q.id} phải có ít nhất 2 đáp án đúng (có: ${correctOpts.length})`);
      assert(Array.isArray(q.correctAnswers) && q.correctAnswers.length === correctOpts.length, `Câu ${q.id} correctAnswers không khớp số lượng isCorrect`);
      const correctKeySet = new Set(correctOpts.map(o => o.key));
      (q.correctAnswers || []).forEach(k => {
        assert(correctKeySet.has(k), `Câu ${q.id} correctAnswers chứa key không được đánh dấu isCorrect: ${k}`);
      });
      // Check explicit note requirement if any
      const lower = (q.header + ' ' + q.content + ' ' + (q.instructionNote || '')).toLowerCase();
      if (lower.includes('chọn 2 đáp án') || lower.includes('chọn 2 phương án')) {
        assert(correctOpts.length === 2, `Câu ${q.id} yêu cầu chọn 2 đáp án nhưng có ${correctOpts.length} đáp án đúng`);
      } else if (lower.includes('chọn 3 đáp án') || lower.includes('chọn 3 phương án')) {
        assert(correctOpts.length === 3, `Câu ${q.id} yêu cầu chọn 3 đáp án nhưng có ${correctOpts.length} đáp án đúng`);
      }
    } else if (q.type === 'true_false_group') {
      assert(Array.isArray(q.items) && q.items.length >= 2, `Câu Đúng/Sai ${q.id} phải có ít nhất 2 nhận định (có: ${q.items?.length})`);
      (q.items || []).forEach((item, itemIdx) => {
        assert(item.order === itemIdx + 1, `Item order trong ${q.id} không đúng: ${item.order} !== ${itemIdx + 1}`);
        assert(item.statement && item.statement.trim().length > 0, `Phát biểu ${item.order} trong ${q.id} bị rỗng`);
        assert(item.correctAnswer === 'Đúng' || item.correctAnswer === 'Sai', `Đáp án phát biểu ${item.order} trong ${q.id} không hợp lệ: "${item.correctAnswer}"`);
      });
    } else if (q.type === 'drag_drop') {
      assert(Array.isArray(q.pairs) && q.pairs.length >= 2, `Câu kéo thả ${q.id} phải có ít nhất 2 cặp (có: ${q.pairs?.length})`);
      (q.pairs || []).forEach(p => {
        assert(p.prompt && p.prompt.trim().length > 0, `Cặp trong ${q.id} bị rỗng prompt`);
        assert(p.correctAnswer && p.correctAnswer.trim().length > 0, `Cặp trong ${q.id} bị rỗng correctAnswer`);
      });
      assert(Array.isArray(q.optionsPool) && q.optionsPool.length >= q.pairs.length, `Câu ${q.id} optionsPool không đủ thẻ đáp án`);
    } else if (q.type === 'drag_drop_columns') {
      assert(Array.isArray(q.columns) && q.columns.length === 2, `Câu phân loại cột ${q.id} phải có đúng 2 cột (có: ${q.columns?.length})`);
      let colItemsTotal = 0;
      (q.columns || []).forEach(col => {
        assert(col.title && col.title.trim().length > 0, `Cột trong ${q.id} bị rỗng tiêu đề`);
        assert(Array.isArray(col.correctItems) && col.correctItems.length > 0, `Cột "${col.title}" trong ${q.id} không có mục nào`);
        colItemsTotal += col.correctItems.length;
      });
      assert(Array.isArray(q.optionsPool) && q.optionsPool.length === colItemsTotal, `Câu ${q.id} optionsPool không khớp tổng số mục các cột`);
    }
  });
});

assert(totalQuestionsCount === 235, `Tổng số câu hỏi toàn hệ thống phải đúng 235 câu (thực tế: ${totalQuestionsCount})`);

// -----------------------------------------------------------------------------
// TEST SUITE 3: MIGRATION & LOCALSTORAGE SAFE SYNC LOGIC
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Kiểm tra an toàn đồng bộ localStorage & Migration ---');

// Mock old user storage (5 lessons, 178 questions, with 1 custom edited question and 1 custom added question)
const mockOldStoredExercises = INITIAL_QUIZ_DATA.slice(0, 5).map(ex => {
  return {
    id: ex.id,
    title: ex.title,
    description: ex.description,
    questions: ex.questions.slice(0, ex.id === 'bai-4' ? 28 : (ex.id === 'bai-5' ? 33 : (ex.id === 'bai-3' ? 36 : ex.questions.length)))
  };
});

// Simulate user customizing bai-1-q2 in Admin
const customEditedQ = {
  ...mockOldStoredExercises[0].questions[1],
  content: 'NỘI DUNG ĐÃ ĐƯỢC ADMIN TÙY BIẾN RIÊNG',
  isCustomized: true,
  customEditedAt: '2026-10-09T10:00:00Z'
};
mockOldStoredExercises[0].questions[1] = customEditedQ;

// Simulate user adding a custom question
const customAddedQ = {
  id: 'bai-1-custom-9999999',
  number: 999,
  type: 'single_choice',
  header: 'Câu Tự Tạo:',
  content: 'Câu hỏi do người dùng tự tạo',
  options: [
    { key: 'A', content: 'Đúng', isCorrect: true },
    { key: 'B', content: 'Sai', isCorrect: false }
  ],
  correctAnswers: ['A'],
  isCustomized: true
};
mockOldStoredExercises[0].questions.push(customAddedQ);

// Run migration
const migrationResult = migrateExercisesData(mockOldStoredExercises, INITIAL_QUIZ_DATA);

assert(migrationResult.length === 6, `Migration phải trả về đủ 6 bài (thực tế: ${migrationResult.length})`);

const migratedBai6 = migrationResult.find(e => e.id === 'bai-6');
assert(Boolean(migratedBai6), 'Bài 6 phải xuất hiện sau migration');
assert(migratedBai6?.questions.length === 27, `Bài 6 sau migration phải có đủ 27 câu (thực tế: ${migratedBai6?.questions.length})`);

const migratedBai1 = migrationResult.find(e => e.id === 'bai-1');
const preservedEdited = migratedBai1?.questions.find(q => q.id === 'bai-1-q2');
assert(preservedEdited?.content === 'NỘI DUNG ĐÃ ĐƯỢC ADMIN TÙY BIẾN RIÊNG', 'Migration KHÔNG được ghi đè câu hỏi người dùng đã chủ động sửa qua Admin');
assert(preservedEdited?.isCustomized === true, 'Cờ isCustomized của câu sửa phải được giữ nguyên');

const preservedAdded = migratedBai1?.questions.find(q => q.id === 'bai-1-custom-9999999');
assert(Boolean(preservedAdded), 'Migration KHÔNG được xóa câu hỏi tự tạo của người dùng');

// Unmodified question in Bai 1 (e.g. bai-1-q7) must be updated to verified answer 'B'
const migratedBai1Q7 = migratedBai1?.questions.find(q => q.id === 'bai-1-q7');
assert(migratedBai1Q7?.correctAnswers[0] === 'B', `Câu 7 Bài 1 phải được cập nhật đáp án B sau migration (thực tế: ${migratedBai1Q7?.correctAnswers[0]})`);

// Bai 4 and Bai 5 must receive all expanded questions
const migratedBai4 = migrationResult.find(e => e.id === 'bai-4');
assert(migratedBai4?.questions.length === 45, `Bài 4 sau migration phải nhận đủ 45 câu hỏi (thực tế: ${migratedBai4?.questions.length})`);

const migratedBai5 = migrationResult.find(e => e.id === 'bai-5');
assert(migratedBai5?.questions.length === 42, `Bài 5 sau migration phải nhận đủ 42 câu hỏi (thực tế: ${migratedBai5?.questions.length})`);

// -----------------------------------------------------------------------------
// BÁO CÁO TỔNG KẾT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('                 KẾT QUẢ KIỂM THỬ TOÀN DIỆN                    ');
console.log('================================================================');
console.log(`- Tổng số bài học:       ${INITIAL_QUIZ_DATA.length}`);
console.log(`- Tổng số câu hỏi:       ${totalQuestionsCount}`);
console.log(`- Phân loại câu hỏi:`);
Object.entries(typeCounts).forEach(([t, count]) => {
  console.log(`    + ${t.padEnd(20)}: ${count} câu`);
});
console.log(`- Câu cần duyệt (needsReview): ${needsReviewCount}`);

if (warnings.length > 0) {
  console.log('\nCác lưu ý (Warnings):');
  warnings.forEach(w => console.log('  ⚠️ ' + w));
}

if (errors.length > 0) {
  console.error(`\n❌ THẤT BẠI: Phát hiện ${errors.length} lỗi trong kiểm thử:`);
  errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
  console.error('\nChương trình thoát với mã lỗi 1.');
  process.exit(1);
} else {
  console.log('\n✅ TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ PASS 100%! HỆ THỐNG ĐẠT CHUẨN QA!');
  console.log('================================================================\n');
  process.exit(0);
}
