/**
 * LocalStorage Store & Data Management
 */
import { INITIAL_QUIZ_DATA } from './data.js';

const STORAGE_KEYS = {
  EXERCISES: 'onthi_exercises_v1',
  WRONG_QUESTIONS: 'onthi_wrong_questions_v1',
  ATTEMPTS_HISTORY: 'onthi_history_v1',
  USER_PROFILE: 'onthi_user_profile_v1',
  SETTINGS: 'onthi_settings_v1'
};

class Store {
  constructor() {
    this.init();
  }

  init() {
    const stored = localStorage.getItem(STORAGE_KEYS.EXERCISES);
    if (!stored) {
      this.resetToDefault();
    } else {
      try {
        const parsed = JSON.parse(stored);
        let changed = false;
        INITIAL_QUIZ_DATA.forEach(initEx => {
          if (!parsed.some(e => e.id === initEx.id)) {
            parsed.push(initEx);
            changed = true;
          }
        });
        if (changed) {
          this.saveExercises(parsed);
        }
      } catch (e) {
        this.resetToDefault();
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      this.saveProfile({
        name: 'Nguyễn Duy Trường',
        studentId: 'dtc245200120'
      });
    }
    if (!localStorage.getItem(STORAGE_KEYS.WRONG_QUESTIONS)) {
      localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify([]));
    }
  }

  // --- Exercises & Questions CRUD ---
  getExercises() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXERCISES);
      return data ? JSON.parse(data) : INITIAL_QUIZ_DATA;
    } catch (e) {
      console.error('Failed to load exercises from storage', e);
      return INITIAL_QUIZ_DATA;
    }
  }

  getExercise(id) {
    if (id === 'all') {
      const allExercises = this.getExercises();
      const allQuestions = [];
      let num = 1;
      allExercises.forEach(ex => {
        ex.questions.forEach(q => {
          allQuestions.push({
            ...q,
            exerciseId: ex.id,
            exerciseTitle: ex.title,
            displayNumber: num++
          });
        });
      });
      return {
        id: 'all',
        title: 'TẤT CẢ CÁC BÀI ÔN TẬP',
        description: 'Tổng hợp toàn bộ câu hỏi trắc nghiệm Chủ nghĩa Xã hội Khoa học',
        questions: allQuestions
      };
    }
    const list = this.getExercises();
    return list.find(ex => ex.id === id) || null;
  }

  saveExercises(exercises) {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
  }

  resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(INITIAL_QUIZ_DATA));
  }

  updateQuestion(exerciseId, updatedQuestion) {
    const exercises = this.getExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return false;

    const idx = ex.questions.findIndex(q => q.id === updatedQuestion.id);
    if (idx !== -1) {
      ex.questions[idx] = updatedQuestion;
    } else {
      ex.questions.push(updatedQuestion);
    }
    this.saveExercises(exercises);
    return true;
  }

  deleteQuestion(exerciseId, questionId) {
    const exercises = this.getExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return false;

    ex.questions = ex.questions.filter(q => q.id !== questionId);
    // Renumber
    ex.questions.forEach((q, idx) => {
      q.number = idx + 1;
    });
    this.saveExercises(exercises);
    return true;
  }

  addQuestion(exerciseId, newQuestion) {
    const exercises = this.getExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return false;

    const qNum = ex.questions.length + 1;
    const q = {
      ...newQuestion,
      id: `${exerciseId}-q${Date.now()}`,
      number: qNum
    };
    ex.questions.push(q);
    this.saveExercises(exercises);
    return q;
  }

  // --- Wrong Questions Collection ---
  getWrongQuestions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WRONG_QUESTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  recordQuestionResult(questionId, isCorrect, questionData = null) {
    let list = this.getWrongQuestions();
    const existingIdx = list.findIndex(item => item.id === questionId);

    if (!isCorrect) {
      if (existingIdx === -1) {
        list.push({
          id: questionId,
          failedCount: 1,
          lastFailedAt: new Date().toISOString(),
          questionData: questionData
        });
      } else {
        list[existingIdx].failedCount = (list[existingIdx].failedCount || 1) + 1;
        list[existingIdx].lastFailedAt = new Date().toISOString();
        if (questionData) list[existingIdx].questionData = questionData;
      }
    } else {
      // If answered correctly in review, we can decrement or remove
      if (existingIdx !== -1) {
        list[existingIdx].failedCount = (list[existingIdx].failedCount || 1) - 1;
        if (list[existingIdx].failedCount <= 0) {
          list.splice(existingIdx, 1);
        }
      }
    }
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  }

  removeWrongQuestion(questionId) {
    let list = this.getWrongQuestions().filter(item => item.id !== questionId);
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  }

  clearWrongQuestions() {
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify([]));
  }

  // Find question objects for wrong question mode
  getWrongQuestionObjects() {
    const wrongItems = this.getWrongQuestions();
    if (wrongItems.length === 0) return [];

    const wrongIds = new Set(wrongItems.map(w => w.id));
    const allExercises = this.getExercises();
    const result = [];

    allExercises.forEach(ex => {
      ex.questions.forEach(q => {
        if (wrongIds.has(q.id)) {
          result.push({
            ...q,
            exerciseId: ex.id,
            exerciseTitle: ex.title
          });
        }
      });
    });

    return result;
  }

  // --- Profile ---
  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : { name: 'Nguyễn Duy Trường', studentId: 'dtc245200120' };
    } catch (e) {
      return { name: 'Nguyễn Duy Trường', studentId: 'dtc245200120' };
    }
  }

  saveProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }

  // --- History & Attempts ---
  getAttempts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveAttempt(attempt) {
    const history = this.getAttempts();
    history.unshift({
      id: 'att-' + Date.now(),
      date: new Date().toISOString(),
      ...attempt
    });
    // Keep max 50 recent
    if (history.length > 50) history.length = 50;
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS_HISTORY, JSON.stringify(history));
  }

  // --- Backup & Export / Import ---
  exportAllData() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exercises: this.getExercises(),
      wrongQuestions: this.getWrongQuestions(),
      profile: this.getProfile(),
      history: this.getAttempts()
    }, null, 2);
  }

  importAllData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.exercises && Array.isArray(data.exercises)) {
        this.saveExercises(data.exercises);
      }
      if (data.wrongQuestions && Array.isArray(data.wrongQuestions)) {
        localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(data.wrongQuestions));
      }
      if (data.profile) {
        this.saveProfile(data.profile);
      }
      return { success: true, count: data.exercises ? data.exercises.length : 0 };
    } catch (e) {
      console.error('Import error', e);
      return { success: false, error: e.message };
    }
  }
}

export const store = new Store();
