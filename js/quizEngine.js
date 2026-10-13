/**
 * Quiz Engine: Session State, Navigation, Timer, Evaluation & Scoring
 * Supports Fisher-Yates randomization, stable-key option shuffling,
 * persistent session states, and rich question types:
 * - single_choice
 * - multiple_choice
 * - fill_blank
 * - matching
 * - table_completion
 * - true_false_group
 * - drag_drop
 * - drag_drop_columns
 */
import { store } from './store.js';
import { sounds } from './audio.js';

/**
 * Fisher-Yates array shuffling algorithm
 */
export function shuffleArray(arr) {
  if (!Array.isArray(arr)) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Checks if question or option content depends on the visual order of options
 * (e.g. "Tất cả các đáp án trên", "Cả A và B", "Ý A và C", "Không có đáp án nào đúng ở trên")
 */
export function isOptionOrderDependent(question) {
  if (!question) return false;
  const orderDependentRegex = /(tất cả|cả|các phương án|phương án|đáp án|ý)\s+(trên|dưới|a\s*,\s*b|a\s*và\s*b|b\s*và\s*c|a\s*và\s*c|cả\s*ba|cả\s*bốn)/i;

  if (orderDependentRegex.test(question.content || '')) return true;

  if (Array.isArray(question.options)) {
    for (const opt of question.options) {
      if (orderDependentRegex.test(opt.content || '')) return true;
    }
  }
  return false;
}

export class QuizEngine {
  constructor(options = {}) {
    this.options = options;
    this.exercise = null;
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = {}; // qId -> user answer
    this.flaggedQuestions = new Set();
    this.checkedQuestions = new Set(); // qId -> boolean for instant check
    this.mode = 'all'; // 'all' | 'random' | 'wrong_only' | 'quick' | 'exam'
    this.instantCheck = true; // default practice mode allows checking
    this.timeLimitSeconds = 15 * 60; // 15 mins default
    this.timeRemaining = this.timeLimitSeconds;
    this.timerInterval = null;
    this.isSubmitted = false;
    this.startTime = null;
    this.endTime = null;
    this.config = {};

    // Callbacks
    this.onStateChanged = options.onStateChanged || (() => {});
    this.onTimerTick = options.onTimerTick || (() => {});
    this.onQuizFinished = options.onQuizFinished || (() => {});
  }

  startQuiz(config = {}) {
    this.clearTimer();
    this.config = config;
    this.mode = config.mode || 'all';
    this.instantCheck = config.instantCheck !== undefined ? config.instantCheck : (this.mode !== 'exam');
    this.userAnswers = {};
    this.flaggedQuestions = new Set();
    this.checkedQuestions = new Set();
    this.currentIndex = 0;
    this.isSubmitted = false;
    this.startTime = new Date();
    this.endTime = null;

    // Load exercise questions
    let baseQuestions = [];
    if (config.questionsList && Array.isArray(config.questionsList)) {
      baseQuestions = JSON.parse(JSON.stringify(config.questionsList));
      this.exercise = config.exercise || {
        id: 'custom',
        title: 'BÀI ÔN TẬP TÙY BIẾN',
        description: `Tập hợp ${baseQuestions.length} câu hỏi tùy biến`
      };
    } else if (this.mode === 'wrong_only') {
      baseQuestions = store.getWrongQuestionObjects();
      if (baseQuestions.length === 0) {
        throw new Error('Bạn chưa có câu trả lời sai nào được lưu!');
      }
      this.exercise = {
        id: 'wrong_only',
        title: 'ÔN TẬP CÁC CÂU LÀM SAI',
        description: `Luyện tập lại ${baseQuestions.length} câu đã trả lời sai`
      };
    } else if (config.exerciseId === 'all') {
      const allEx = store.getExercises();
      baseQuestions = [];
      allEx.forEach(ex => {
        baseQuestions.push(...JSON.parse(JSON.stringify(ex.questions)));
      });
      this.exercise = {
        id: 'all',
        title: 'TẤT CẢ CÁC BÀI ÔN TẬP',
        description: `Bộ đề tổng hợp toàn bộ ${baseQuestions.length} câu hỏi`
      };
    } else {
      const ex = store.getExercise(config.exerciseId || 'bai-1');
      if (!ex) throw new Error('Không tìm thấy bài ôn tập!');
      this.exercise = ex;
      baseQuestions = JSON.parse(JSON.stringify(ex.questions));
    }

    // Filter by question type if requested
    if (config.questionFilter && config.questionFilter !== 'all') {
      const qFilter = config.questionFilter;
      baseQuestions = baseQuestions.filter(q => {
        if (qFilter === 'drag_drop') {
          return q.type === 'drag_drop' || q.type === 'drag_drop_columns';
        }
        return q.type === qFilter;
      });
      if (baseQuestions.length === 0) {
        throw new Error('Không có câu hỏi nào thuộc dạng đã chọn trong bài học này!');
      }
    }

    // Determine whether to shuffle question order
    const shouldShuffleQuestions = config.shuffleQuestions !== undefined
      ? Boolean(config.shuffleQuestions)
      : (this.mode === 'random' || this.mode === 'quick' || this.mode === 'exam');

    if (shouldShuffleQuestions) {
      baseQuestions = shuffleArray(baseQuestions);
    }

    // Slice question count if needed
    if (config.questionCount && config.questionCount > 0 && config.questionCount < baseQuestions.length) {
      baseQuestions = baseQuestions.slice(0, config.questionCount);
    } else if (this.mode === 'quick') {
      baseQuestions = baseQuestions.slice(0, config.questionCount || 10);
    }

    // Determine whether to shuffle option positions
    const shouldShuffleOptions = config.shuffleOptions !== undefined
      ? Boolean(config.shuffleOptions)
      : true;

    // Process questions: assign session index and shuffle options/columns
    this.questions = baseQuestions.map((q, idx) => {
      const qCopy = {
        ...q,
        sessionIndex: idx,
        sessionNumber: idx + 1
      };

      // Shuffling options for single/multiple choice
      if (shouldShuffleOptions && (qCopy.type === 'single_choice' || qCopy.type === 'multiple_choice')) {
        if (!isOptionOrderDependent(qCopy) && Array.isArray(qCopy.options) && qCopy.options.length > 1) {
          const optsWithOrig = qCopy.options.map((opt, oIdx) => ({
            ...opt,
            origKey: opt.origKey || opt.key || String.fromCharCode(65 + oIdx),
            id: opt.id || opt.origKey || opt.key || `opt-${oIdx + 1}`
          }));

          const shuffled = shuffleArray(optsWithOrig);
          // Assign visual keys A, B, C, D in order of display
          qCopy.options = shuffled.map((opt, oIdx) => ({
            ...opt,
            visualKey: String.fromCharCode(65 + oIdx),
            displayKey: String.fromCharCode(65 + oIdx)
          }));
        } else {
          // Keep original order, ensure visualKey matches key
          qCopy.options = (qCopy.options || []).map(opt => ({
            ...opt,
            origKey: opt.origKey || opt.key,
            visualKey: opt.key,
            displayKey: opt.key
          }));
        }
      } else if (Array.isArray(qCopy.options)) {
        qCopy.options = qCopy.options.map(opt => ({
          ...opt,
          origKey: opt.origKey || opt.key,
          visualKey: opt.key,
          displayKey: opt.key
        }));
      }

      // Shuffling columns for matching
      if (qCopy.type === 'matching' && Array.isArray(qCopy.pairs)) {
        qCopy.pairs = qCopy.pairs.map((p, pIdx) => ({
          ...p,
          id: p.id || `pair-${pIdx + 1}`
        }));
        const leftItems = qCopy.pairs.map(p => ({ id: p.id, text: p.left }));
        const rightItems = qCopy.pairs.map(p => ({ id: p.id, text: p.right }));
        qCopy.sessionColumnA = shuffleArray(leftItems);
        qCopy.sessionColumnB = shuffleArray(rightItems);
      }

      return qCopy;
    });

    // Setup Timer
    const durationMinutes = config.timeLimitMinutes || (this.mode === 'exam' ? 15 : (this.questions.length * 1.5));
    this.timeLimitSeconds = Math.round(durationMinutes * 60);
    this.timeRemaining = this.timeLimitSeconds;
    this.startTimer();

    this.persistActiveSession();
    this.notifyStateChanged();
    return this.questions;
  }

  // --- Session Persistence ---
  persistActiveSession() {
    if (this.isSubmitted) {
      store.clearActiveSession();
      return;
    }
    store.saveActiveSession({
      exercise: this.exercise,
      questions: this.questions,
      currentIndex: this.currentIndex,
      userAnswers: this.userAnswers,
      flaggedQuestions: Array.from(this.flaggedQuestions),
      checkedQuestions: Array.from(this.checkedQuestions),
      isSubmitted: this.isSubmitted,
      mode: this.mode,
      instantCheck: this.instantCheck,
      timeLimitSeconds: this.timeLimitSeconds,
      timeRemaining: this.timeRemaining,
      startTime: this.startTime ? this.startTime.toISOString() : null,
      config: this.config
    });
  }

  restoreSession(saved) {
    if (!saved || !Array.isArray(saved.questions) || saved.questions.length === 0) {
      return false;
    }
    this.clearTimer();
    this.exercise = saved.exercise;
    this.questions = saved.questions;
    this.currentIndex = saved.currentIndex || 0;
    this.userAnswers = saved.userAnswers || {};
    this.flaggedQuestions = new Set(saved.flaggedQuestions || []);
    this.checkedQuestions = new Set(saved.checkedQuestions || []);
    this.isSubmitted = Boolean(saved.isSubmitted);
    this.mode = saved.mode || 'all';
    this.instantCheck = saved.instantCheck !== undefined ? saved.instantCheck : true;
    this.timeLimitSeconds = saved.timeLimitSeconds || 900;
    this.timeRemaining = saved.timeRemaining !== undefined ? saved.timeRemaining : this.timeLimitSeconds;
    this.startTime = saved.startTime ? new Date(saved.startTime) : new Date();
    this.config = saved.config || {};

    if (!this.isSubmitted && this.timeRemaining > 0) {
      this.startTimer();
    }
    this.notifyStateChanged();
    return true;
  }

  shuffleArray(arr) {
    return shuffleArray(arr);
  }

  // --- Timer ---
  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.onTimerTick(this.getFormattedTime(), this.timeRemaining);
        if (this.timeRemaining === 0) {
          this.clearTimer();
          this.submitQuiz(true); // auto submit on timeout
        }
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getFormattedTime() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // --- Navigation ---
  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  goToQuestion(index) {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      sounds.playClick();
      this.persistActiveSession();
      this.notifyStateChanged();
    }
  }

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentIndex + 1);
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.goToQuestion(this.currentIndex - 1);
    }
  }

  // --- Answers & Flagging ---
  setAnswer(qId, answerValue) {
    if (this.isSubmitted) return;
    this.userAnswers[qId] = answerValue;
    this.persistActiveSession();
    this.notifyStateChanged();
  }

  getAnswer(qId) {
    return this.userAnswers[qId];
  }

  getUserAnswer(qId) {
    return this.getAnswer(qId);
  }

  hasAnswered(qId) {
    const ans = this.userAnswers[qId];
    if (ans === undefined || ans === null) return false;
    if (typeof ans === 'string') return ans.trim() !== '';
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') {
      const keys = Object.keys(ans);
      if (keys.length === 0) return false;
      return keys.some(k => {
        const v = ans[k];
        if (v === undefined || v === null) return false;
        if (typeof v === 'string') return v.trim() !== '';
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });
    }
    return Boolean(ans);
  }

  toggleFlag(qId) {
    sounds.playClick();
    if (this.flaggedQuestions.has(qId)) {
      this.flaggedQuestions.delete(qId);
    } else {
      this.flaggedQuestions.add(qId);
    }
    this.persistActiveSession();
    this.notifyStateChanged();
  }

  isFlagged(qId) {
    return this.flaggedQuestions.has(qId);
  }

  // --- Instant Check Mode ---
  checkCurrentQuestion() {
    if (this.isSubmitted) return null;
    const q = this.getCurrentQuestion();
    if (!q) return null;

    this.checkedQuestions.add(q.id);
    const evalResult = this.evaluateQuestion(q, this.userAnswers[q.id]);
    
    if (evalResult.isCorrect) {
      sounds.playCorrect();
      store.recordQuestionResult(q.id, true, q);
    } else {
      sounds.playWrong();
      store.recordQuestionResult(q.id, false, q);
    }

    this.persistActiveSession();
    this.notifyStateChanged();
    return evalResult;
  }

  isChecked(qId) {
    return this.checkedQuestions.has(qId);
  }

  // --- Evaluation Logic ---
  evaluateQuestion(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return { isCorrect: false, score: 0, maxScore: 1, unanswered: true, details: null };
    }

    switch (question.type) {
      case 'single_choice': {
        const correctKey = question.correctAnswers
          ? question.correctAnswers[0]
          : ((question.options || []).find(o => o.isCorrect) || {}).origKey || ((question.options || []).find(o => o.isCorrect) || {}).key;

        const selectedOpt = (question.options || []).find(o => o.origKey === userAnswer || o.key === userAnswer);
        const correctOpt = (question.options || []).find(o => o.origKey === correctKey || o.key === correctKey || o.isCorrect);

        const isCorrect = String(userAnswer).toUpperCase() === String(correctKey).toUpperCase();
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          maxScore: 1,
          correctAnswers: [correctKey],
          userAnswer,
          correctVisualKey: correctOpt ? (correctOpt.visualKey || correctOpt.displayKey || correctOpt.key) : correctKey,
          userVisualKey: selectedOpt ? (selectedOpt.visualKey || selectedOpt.displayKey || selectedOpt.key) : userAnswer,
          explanation: question.explanation || ''
        };
      }

      case 'multiple_choice': {
        const correctKeys = question.correctAnswers || (question.options || []).filter(o => o.isCorrect).map(o => o.origKey || o.key);
        const correctSet = new Set(correctKeys.map(k => String(k).toUpperCase()));
        const userSet = new Set((Array.isArray(userAnswer) ? userAnswer : [userAnswer]).map(k => String(k).toUpperCase()));

        let matched = 0;
        userSet.forEach(k => {
          if (correctSet.has(k)) matched++;
        });

        const isExact = (userSet.size === correctSet.size) && (matched === correctSet.size);
        return {
          isCorrect: isExact,
          score: isExact ? 1 : 0,
          maxScore: 1,
          correctAnswers: Array.from(correctSet),
          userAnswer: Array.from(userSet),
          explanation: question.explanation || ''
        };
      }

      case 'fill_blank': {
        const blanks = question.blanks || [];
        const totalBlanks = blanks.length;
        let correctCount = 0;
        const blankResults = [];

        blanks.forEach((b, bIdx) => {
          const bId = b.id || `blank-${bIdx + 1}`;
          const uVal = (typeof userAnswer === 'object' && userAnswer !== null)
            ? (userAnswer[bId] || '')
            : (typeof userAnswer === 'string' && bIdx === 0 ? userAnswer : '');

          const normUser = String(uVal || '').trim().replace(/\s+/g, ' ').toLowerCase();

          const accepted = Array.isArray(b.acceptedAnswers)
            ? b.acceptedAnswers
            : [String(b.acceptedAnswer || '')];
          const normAccepted = accepted.map(a => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase());

          const isItemCorrect = normUser !== '' && normAccepted.includes(normUser);
          if (isItemCorrect) correctCount++;

          blankResults.push({
            id: bId,
            order: b.order || bIdx + 1,
            userAnswer: uVal,
            acceptedAnswers: accepted,
            isCorrect: isItemCorrect
          });
        });

        const isFullyCorrect = totalBlanks > 0 && correctCount === totalBlanks;
        return {
          isCorrect: isFullyCorrect,
          score: totalBlanks > 0 ? (correctCount / totalBlanks) : 0,
          maxScore: 1,
          blankResults,
          correctCount,
          totalBlanks,
          explanation: question.explanation || ''
        };
      }

      case 'matching': {
        const pairs = question.pairs || [];
        const totalPairs = pairs.length;
        let correctCount = 0;
        const pairResults = [];

        pairs.forEach((p, pIdx) => {
          const pairId = p.id || `pair-${pIdx + 1}`;
          const uRightId = (typeof userAnswer === 'object' && userAnswer !== null) ? userAnswer[pairId] : null;

          const isItemCorrect = uRightId === pairId;
          if (isItemCorrect) correctCount++;

          const chosenRight = pairs.find(item => item.id === uRightId);
          pairResults.push({
            id: pairId,
            left: p.left,
            correctRight: p.right,
            chosenRight: chosenRight ? chosenRight.right : null,
            isCorrect: isItemCorrect
          });
        });

        const isFullyCorrect = totalPairs > 0 && correctCount === totalPairs;
        return {
          isCorrect: isFullyCorrect,
          score: totalPairs > 0 ? (correctCount / totalPairs) : 0,
          maxScore: 1,
          pairResults,
          correctCount,
          totalPairs,
          explanation: question.explanation || ''
        };
      }

      case 'table_completion': {
        const rows = question.rows || [];
        const inputCells = [];
        rows.forEach(r => {
          (r || []).forEach(cell => {
            if (cell && cell.isInput) inputCells.push(cell);
          });
        });

        const totalCells = inputCells.length;
        let correctCount = 0;
        const cellResults = [];

        inputCells.forEach((c, cIdx) => {
          const cId = c.id || `cell-${cIdx + 1}`;
          const uVal = (typeof userAnswer === 'object' && userAnswer !== null) ? (userAnswer[cId] || '') : '';
          const normUser = String(uVal || '').trim().replace(/\s+/g, ' ').toLowerCase();

          const accepted = Array.isArray(c.acceptedAnswers)
            ? c.acceptedAnswers
            : [String(c.acceptedAnswer || '')];
          const normAccepted = accepted.map(a => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase());

          const isItemCorrect = normUser !== '' && normAccepted.includes(normUser);
          if (isItemCorrect) correctCount++;

          cellResults.push({
            id: cId,
            userAnswer: uVal,
            acceptedAnswers: accepted,
            isCorrect: isItemCorrect
          });
        });

        const isFullyCorrect = totalCells > 0 && correctCount === totalCells;
        return {
          isCorrect: isFullyCorrect,
          score: totalCells > 0 ? (correctCount / totalCells) : 0,
          maxScore: 1,
          cellResults,
          correctCount,
          totalCells,
          explanation: question.explanation || ''
        };
      }

      case 'true_false_group': {
        const items = question.items || [];
        const totalItems = items.length;
        let correctItems = 0;
        const itemResults = [];

        items.forEach(it => {
          const uAns = (userAnswer && typeof userAnswer === 'object') ? userAnswer[it.order] : null;
          const isItemCorrect = uAns && (String(uAns).toLowerCase().trim() === String(it.correctAnswer).toLowerCase().trim());
          if (isItemCorrect) correctItems++;
          itemResults.push({
            order: it.order,
            statement: it.statement,
            correctAnswer: it.correctAnswer,
            userAnswer: uAns || null,
            isCorrect: Boolean(isItemCorrect)
          });
        });

        const isFullyCorrect = totalItems > 0 && correctItems === totalItems;
        return {
          isCorrect: isFullyCorrect,
          score: totalItems > 0 ? (correctItems / totalItems) : 0,
          maxScore: 1,
          itemResults,
          correctItems,
          totalItems
        };
      }

      case 'drag_drop': {
        const pairs = question.pairs || [];
        const totalPairs = pairs.length;
        let correctPairs = 0;
        const pairResults = [];

        pairs.forEach((p, idx) => {
          const targetId = p.id || `pair-${idx + 1}`;
          const uAns = (userAnswer && typeof userAnswer === 'object') ? userAnswer[targetId] : null;
          const isPairCorrect = uAns && (String(uAns).trim().toLowerCase() === String(p.correctAnswer).trim().toLowerCase());
          if (isPairCorrect) correctPairs++;
          pairResults.push({
            id: targetId,
            prompt: p.prompt,
            correctAnswer: p.correctAnswer,
            userAnswer: uAns || null,
            isCorrect: Boolean(isPairCorrect)
          });
        });

        const isFullyCorrect = totalPairs > 0 && correctPairs === totalPairs;
        return {
          isCorrect: isFullyCorrect,
          score: totalPairs > 0 ? (correctPairs / totalPairs) : 0,
          maxScore: 1,
          pairResults,
          correctPairs,
          totalPairs
        };
      }

      case 'drag_drop_columns': {
        const columns = question.columns || [];
        const totalCols = columns.length;
        let correctCols = 0;
        const colResults = [];

        columns.forEach(col => {
          const colItems = (userAnswer && typeof userAnswer === 'object' && Array.isArray(userAnswer[col.id])) ? userAnswer[col.id] : [];
          const userItems = new Set(colItems.map(s => String(s).trim().toLowerCase()));
          const correctItems = new Set((col.correctItems || []).map(s => String(s).trim().toLowerCase()));

          let matched = 0;
          userItems.forEach(it => {
            if (correctItems.has(it)) matched++;
          });

          const isColCorrect = (userItems.size === correctItems.size) && (matched === correctItems.size);
          if (isColCorrect) correctCols++;

          colResults.push({
            colId: col.id,
            title: col.title,
            correctItems: col.correctItems || [],
            userItems: colItems,
            isCorrect: isColCorrect
          });
        });

        const isFullyCorrect = totalCols > 0 && correctCols === totalCols;
        return {
          isCorrect: isFullyCorrect,
          score: totalCols > 0 ? (correctCols / totalCols) : 0,
          maxScore: 1,
          colResults,
          correctCols,
          totalCols
        };
      }

      default:
        return { isCorrect: false, score: 0, maxScore: 1 };
    }
  }

  // --- Submit Quiz ---
  submitQuiz(isTimeout = false) {
    if (this.isSubmitted) {
      return this._lastSummary || this.calculateSummary();
    }
    this.clearTimer();
    this.isSubmitted = true;
    this.endTime = new Date();

    const summary = this.calculateSummary();
    summary.isTimeout = isTimeout;
    this._lastSummary = summary;

    // Clear active session once submitted
    store.clearActiveSession();

    // Save each answered wrong/correct question into Store
    summary.results.forEach(res => {
      if (res.isAnswered) {
        store.recordQuestionResult(res.question.id, res.isCorrect, res.question);
      }
    });

    // Save attempt record
    store.saveAttempt({
      exerciseId: this.exercise ? this.exercise.id : 'unknown',
      exerciseTitle: this.exercise ? this.exercise.title : 'Bài kiểm tra',
      mode: this.mode,
      totalQuestions: summary.totalQuestions,
      answeredCount: summary.answeredCount,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      unansweredCount: summary.unansweredCount,
      score: summary.score,
      score10: summary.score10,
      maxScore: summary.maxScore,
      percentage: summary.percentage,
      timeSpentSeconds: summary.timeSpentSeconds
    });

    sounds.playFinish();
    this.notifyStateChanged();
    this.onQuizFinished(summary);
    return summary;
  }

  calculateSummary() {
    let totalScore = 0;
    const maxScore = this.questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let answeredCount = 0;
    const results = [];

    this.questions.forEach((q, idx) => {
      const isAnswered = this.hasAnswered(q.id);
      const uAns = this.userAnswers[q.id];
      const evalRes = this.evaluateQuestion(q, uAns);
      totalScore += evalRes.score;

      if (!isAnswered) {
        unansweredCount++;
      } else {
        answeredCount++;
        if (evalRes.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }

      results.push({
        questionIndex: idx,
        question: q,
        userAnswer: uAns,
        isAnswered,
        isUnanswered: !isAnswered,
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        evaluation: evalRes,
        isFlagged: this.flaggedQuestions.has(q.id)
      });
    });

    const rawScore10 = maxScore > 0 ? (totalScore / maxScore) * 10 : 0;
    const score10 = Number(rawScore10.toFixed(1));
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const timeSpentSeconds = this.startTime ? Math.max(1, Math.round((new Date() - this.startTime) / 1000)) : (this.timeLimitSeconds - this.timeRemaining);

    return {
      exercise: this.exercise,
      mode: this.mode,
      totalQuestions: this.questions.length,
      answeredCount,
      correctCount,
      wrongCount,
      unansweredCount,
      score: totalScore,
      score10,
      score10Formatted: score10.toFixed(1),
      maxScore,
      percentage,
      timeSpentSeconds,
      results
    };
  }

  notifyStateChanged() {
    this.onStateChanged({
      exercise: this.exercise,
      questions: this.questions,
      currentIndex: this.currentIndex,
      currentQuestion: this.getCurrentQuestion(),
      userAnswers: this.userAnswers,
      flaggedQuestions: Array.from(this.flaggedQuestions),
      checkedQuestions: Array.from(this.checkedQuestions),
      isSubmitted: this.isSubmitted,
      timeRemaining: this.timeRemaining,
      formattedTime: this.getFormattedTime(),
      instantCheck: this.instantCheck
    });
  }
}
