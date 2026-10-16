/**
 * Quiz Engine: Session State, Navigation, Timer, Evaluation & Scoring
 */
import { store } from './store.js';
import { sounds } from './audio.js';

// Fisher–Yates on a copy; duplicate cards and distractors must be preserved.
function shuffleValues(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Create session-only answer order. Keep correctness attached to content/target IDs.
export function shuffleQuestionOptions(question, random = Math.random) {
  const copy = JSON.parse(JSON.stringify(question));
  if (copy.type === 'true_false_group') {
    copy.items = shuffleValues(copy.items || [], random).map((item, index) => ({
      ...item,
      order: index + 1
    }));
    return copy;
  }
  if (copy.type === 'drag_drop') {
    copy.optionsPool = shuffleValues(copy.optionsPool || (copy.pairs || []).map(pair => pair.correctAnswer), random);
    return copy;
  }
  if (copy.type === 'drag_drop_columns') {
    const pool = copy.allItems || copy.optionsPool || (copy.columns || []).flatMap(column => column.correctItems || []);
    copy.optionsPool = shuffleValues(pool, random);
    // The renderer prioritizes legacy allItems, so it must use the same order.
    if (copy.allItems) copy.allItems = [...copy.optionsPool];
    return copy;
  }
  if (!['single_choice', 'multiple_choice'].includes(copy.type) || !Array.isArray(copy.options)) return copy;

  const correctKeys = new Set(copy.correctAnswers || copy.options.filter(option => option.isCorrect).map(option => option.key));
  const options = shuffleValues(copy.options, random);
  copy.options = options.map((option, index) => ({
    ...option,
    key: String.fromCharCode(65 + index),
    isCorrect: correctKeys.has(option.key)
  }));
  copy.correctAnswers = copy.options.filter(option => option.isCorrect).map(option => option.key);
  return copy;
}

export class QuizEngine {
  constructor(options = {}) {
    this.options = options;
    this.random = options.random || Math.random;
    this.exercise = null;
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = {}; // qId -> user answer
    this.flaggedQuestions = new Set();
    this.checkedQuestions = new Set(); // qId -> boolean for instant check
    this.mode = 'all'; // 'all' | 'random' | 'wrong_only' | 'quick' | 'exam'
    this.instantCheck = true; // default practice mode allows checking immediately
    this.timeLimitSeconds = 15 * 60; // 15 mins default
    this.timeRemaining = this.timeLimitSeconds;
    this.timerInterval = null;
    this.isSubmitted = false;
    this.startTime = null;
    this.endTime = null;

    // Callbacks
    this.onStateChanged = options.onStateChanged || (() => {});
    this.onTimerTick = options.onTimerTick || (() => {});
    this.onQuizFinished = options.onQuizFinished || (() => {});
  }

  startQuiz(config = {}) {
    this.clearTimer();
    this.mode = config.mode || 'all';
    this.instantCheck = this.mode !== 'exam' && config.instantCheck !== false;
    this.userAnswers = {};
    this.flaggedQuestions = new Set();
    this.checkedQuestions = new Set();
    this.currentIndex = 0;
    this.isSubmitted = false;
    this.startTime = new Date();
    this.endTime = null;

    // Load exercise questions
    let baseQuestions = [];
    if (this.mode === 'wrong_only') {
      baseQuestions = store.getWrongQuestionObjects();
      if (baseQuestions.length === 0) {
        throw new Error('Bạn chưa có câu trả lời sai nào được lưu!');
      }
      this.exercise = {
        id: 'wrong_only',
        title: 'ÔN TẬP CÁC CÂU LÀM SAI',
        description: `Luyện tập lại ${baseQuestions.length} câu đã trả lời sai`
      };
    } else {
      const ex = store.getExercise(config.exerciseId || 'bai-1');
      if (!ex) throw new Error('Không tìm thấy bài ôn tập!');
      this.exercise = ex;
      baseQuestions = JSON.parse(JSON.stringify(ex.questions));
    }

    // Apply mode filtering / shuffling
    if (this.mode === 'random') {
      baseQuestions = this.shuffleArray(baseQuestions);
      if (config.questionCount && config.questionCount < baseQuestions.length) {
        baseQuestions = baseQuestions.slice(0, config.questionCount);
      }
    } else if (this.mode === 'quick') {
      baseQuestions = this.shuffleArray(baseQuestions).slice(0, config.questionCount || 10);
    } else if (this.mode === 'exam') {
      baseQuestions = this.shuffleArray(baseQuestions);
      if (config.questionCount && config.questionCount < baseQuestions.length) {
        baseQuestions = baseQuestions.slice(0, config.questionCount);
      }
    }

    // Every mode shuffles choices, true/false statements and drag cards once at session start.
    // Ordered practice still preserves question order; navigation never reshuffles.
    baseQuestions = baseQuestions.map(q => shuffleQuestionOptions(q, this.random));

    // Set numbers
    this.questions = baseQuestions.map((q, idx) => ({
      ...q,
      sessionIndex: idx,
      sessionNumber: idx + 1
    }));

    // Setup Timer
    const durationMinutes = config.timeLimitMinutes || (this.mode === 'exam' ? 15 : (this.questions.length * 1.5));
    this.timeLimitSeconds = Math.round(durationMinutes * 60);
    this.timeRemaining = this.timeLimitSeconds;
    this.startTimer();

    this.notifyStateChanged();
    return this.questions;
  }

  shuffleArray(arr) {
    return shuffleValues(arr, this.random);
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
    if (this.isSubmitted || this.checkedQuestions.has(qId)) return;
    this.userAnswers[qId] = answerValue;
    // When answer changes, if instant check wasn't triggered, notify
    this.notifyStateChanged();
  }

  getAnswer(qId) {
    return this.userAnswers[qId];
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
    this.notifyStateChanged();
  }

  isFlagged(qId) {
    return this.flaggedQuestions.has(qId);
  }

  // --- Instant Check Mode ---
  checkCurrentQuestion() {
    if (this.isSubmitted || !this.instantCheck) return null;
    const q = this.getCurrentQuestion();
    if (!q || !this.hasAnswered(q.id) || this.checkedQuestions.has(q.id)) return null;

    this.checkedQuestions.add(q.id);
    const evalResult = this.evaluateQuestion(q, this.userAnswers[q.id]);
    
    if (evalResult.isCorrect) {
      sounds.playCorrect();
      store.recordQuestionResult(q.id, true, q);
    } else {
      sounds.playWrong();
      store.recordQuestionResult(q.id, false, q);
    }

    this.notifyStateChanged();
    return evalResult;
  }

  isChecked(qId) {
    return this.checkedQuestions.has(qId);
  }

  // --- Evaluation Logic ---
  evaluateQuestion(question, userAnswer) {
    if (!userAnswer) {
      return { isCorrect: false, score: 0, maxScore: 1, unanswered: true, details: null };
    }

    switch (question.type) {
      case 'single_choice': {
        const correctKey = question.correctAnswers ? question.correctAnswers[0] : (question.options.find(o => o.isCorrect) || {}).key;
        const isCorrect = String(userAnswer).toUpperCase() === String(correctKey).toUpperCase();
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          maxScore: 1,
          correctAnswers: [correctKey],
          userAnswer
        };
      }

      case 'multiple_choice': {
        const correctSet = new Set((question.correctAnswers || question.options.filter(o => o.isCorrect).map(o => o.key)).map(k => String(k).toUpperCase()));
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
          userAnswer: Array.from(userSet)
        };
      }

      case 'true_false_group': {
        // Items: [{ order, statement, correctAnswer: 'Đúng'|'Sai' }]
        // UserAnswer: { 1: 'Đúng', 2: 'Sai', ... }
        const items = question.items || [];
        let totalItems = items.length;
        let correctItems = 0;
        const itemResults = [];

        items.forEach(it => {
          const uAns = userAnswer[it.order];
          const isItemCorrect = uAns && (uAns.toLowerCase().trim() === it.correctAnswer.toLowerCase().trim());
          if (isItemCorrect) correctItems++;
          itemResults.push({
            order: it.order,
            statement: it.statement,
            correctAnswer: it.correctAnswer,
            userAnswer: uAns || null,
            isCorrect: isItemCorrect
          });
        });

        const isFullyCorrect = correctItems === totalItems;
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
        // Pairs: [{ id, prompt, correctAnswer }]
        // UserAnswer: { targetId: 'placedText' }
        const pairs = question.pairs || [];
        let totalPairs = pairs.length;
        let correctPairs = 0;
        const pairResults = [];

        pairs.forEach((p, idx) => {
          const targetId = p.id || `pair-${idx + 1}`;
          const uAns = userAnswer[targetId];
          const isPairCorrect = uAns && (uAns.trim().toLowerCase() === p.correctAnswer.trim().toLowerCase());
          if (isPairCorrect) correctPairs++;
          pairResults.push({
            id: targetId,
            prompt: p.prompt,
            correctAnswer: p.correctAnswer,
            userAnswer: uAns || null,
            isCorrect: isPairCorrect
          });
        });

        const isFullyCorrect = correctPairs === totalPairs;
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
        // Columns: [{ id, title, correctItems: [...] }]
        // UserAnswer: { colId: ['item1', 'item2'] }
        const columns = question.columns || [];
        let totalCols = columns.length;
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

        const isFullyCorrect = correctCols === totalCols;
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

    // Save each answered wrong/correct question into Store (unanswered questions are not recorded as wrong)
    summary.results.forEach(res => {
      if (res.isAnswered && !this.checkedQuestions.has(res.question.id)) {
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
    let maxScore = this.questions.length;
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
