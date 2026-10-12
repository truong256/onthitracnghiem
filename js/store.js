/**
 * LocalStorage Store & Data Management
 * Handles persistent quiz state, exercises CRUD, and safe versioned data migration.
 */
import { INITIAL_QUIZ_DATA } from './data.js';

export const CURRENT_DATA_VERSION = '2.0.1-20261012';

export const STORAGE_KEYS = {
  EXERCISES: 'onthi_exercises_v1',
  DATA_VERSION: 'onthi_data_version_v2',
  BACKUP_EXERCISES: 'onthi_exercises_backup_v1',
  WRONG_QUESTIONS: 'onthi_wrong_questions_v1',
  ATTEMPTS_HISTORY: 'onthi_history_v1',
  USER_PROFILE: 'onthi_user_profile_v1',
  SETTINGS: 'onthi_settings_v1'
};

const memoryStorage = {
  _data: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

export function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch (e) {
    // blocked in some iframe/sandbox environments
  }
  return memoryStorage;
}

/**
 * Pure migration logic: merges stored exercises with initial quiz data.
 * - Preserves user-customized questions (marked with isCustomized === true or custom IDs).
 * - Updates unmodified standard questions to latest verified official data.
 * - Adds any newly added official exercises (e.g., bai-6) and newly added questions.
 * - Preserves custom exercises and custom questions created by the user.
 */
export function validateExercisesSchema(exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return { valid: false, error: 'Danh sách bài học phải là một mảng không rỗng.' };
  }
  const seenQIds = new Set();
  for (let eIdx = 0; eIdx < exercises.length; eIdx++) {
    const ex = exercises[eIdx];
    if (!ex || typeof ex !== 'object' || !ex.id || !ex.title || !Array.isArray(ex.questions)) {
      return { valid: false, error: `Bài học thứ ${eIdx + 1} thiếu thông tin id, title hoặc danh sách câu hỏi.` };
    }
    for (let qIdx = 0; qIdx < ex.questions.length; qIdx++) {
      const q = ex.questions[qIdx];
      if (!q || typeof q !== 'object' || !q.id || !q.type || !q.content) {
        return { valid: false, error: `Bài ${ex.id} có câu hỏi thứ ${qIdx + 1} thiếu id, type hoặc nội dung.` };
      }
      if (seenQIds.has(q.id)) {
        return { valid: false, error: `Trùng lặp ID câu hỏi: ${q.id} trong bài ${ex.id}` };
      }
      seenQIds.add(q.id);
      if (q.type === 'single_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2 || !Array.isArray(q.correctAnswers) || q.correctAnswers.length !== 1) {
          return { valid: false, error: `Câu ${q.id} (single_choice) thiếu options hoặc đúng 1 đáp án đúng.` };
        }
      } else if (q.type === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2 || !Array.isArray(q.correctAnswers) || q.correctAnswers.length < 2) {
          return { valid: false, error: `Câu ${q.id} (multiple_choice) thiếu options hoặc có ít hơn 2 đáp án đúng.` };
        }
      } else if (q.type === 'true_false_group') {
        if (!Array.isArray(q.items) || q.items.length < 2) {
          return { valid: false, error: `Câu ${q.id} (true_false_group) thiếu các phát biểu.` };
        }
      } else if (q.type === 'drag_drop') {
        if (!Array.isArray(q.pairs) || q.pairs.length < 2) {
          return { valid: false, error: `Câu ${q.id} (drag_drop) thiếu các cặp kéo thả.` };
        }
      } else if (q.type === 'drag_drop_columns') {
        if (!Array.isArray(q.columns) || q.columns.length < 2) {
          return { valid: false, error: `Câu ${q.id} (drag_drop_columns) thiếu các cột phân loại.` };
        }
      }
    }
  }
  return { valid: true };
}

export function migrateExercisesData(storedExercises, officialExercises) {
  if (!Array.isArray(storedExercises) || storedExercises.length === 0) {
    return JSON.parse(JSON.stringify(officialExercises));
  }

  const result = [];
  const storedMap = new Map();
  storedExercises.forEach(ex => {
    if (ex && ex.id) storedMap.set(ex.id, ex);
  });

  // 1. Process all official exercises
  officialExercises.forEach(officialEx => {
    const storedEx = storedMap.get(officialEx.id);
    if (!storedEx) {
      // Exercise does not exist in user storage yet (e.g. bai-6) -> Add fresh
      result.push(JSON.parse(JSON.stringify(officialEx)));
      return;
    }

    // Exercise exists: merge questions
    const storedQuestionsMap = new Map();
    const customUserQuestions = [];

    (storedEx.questions || []).forEach(q => {
      if (!q || !q.id) return;
      storedQuestionsMap.set(q.id, q);
      // Check if this was a custom user-created question (not part of standard template)
      const isOfficialId = officialEx.questions.some(oq => oq.id === q.id);
      if (!isOfficialId || q.isCustomized) {
        if (!isOfficialId) {
          customUserQuestions.push(q);
        }
      }
    });

    const mergedQuestions = [];

    // Map each official question
    officialEx.questions.forEach((officialQ, idx) => {
      const storedQ = storedQuestionsMap.get(officialQ.id);
      if (storedQ && storedQ.isCustomized === true) {
        // User explicitly modified this question in Admin -> preserve user version
        mergedQuestions.push({
          ...storedQ,
          number: idx + 1
        });
      } else {
        // Unmodified standard question -> update to latest verified official question
        mergedQuestions.push({
          ...JSON.parse(JSON.stringify(officialQ)),
          number: idx + 1
        });
      }
    });

    // Append any user-created custom questions at the end
    customUserQuestions.forEach(customQ => {
      mergedQuestions.push({
        ...customQ,
        number: mergedQuestions.length + 1
      });
    });

    result.push({
      id: officialEx.id,
      title: officialEx.title,
      description: officialEx.description,
      questions: mergedQuestions
    });

    // Remove from map to track remaining custom exercises
    storedMap.delete(officialEx.id);
  });

  // 2. Preserve any purely custom exercises added by user
  storedMap.forEach(customEx => {
    result.push(customEx);
  });

  return result;
}

class Store {
  constructor() {
    this.init();
  }

  init() {
    const storage = getStorage();
    const stored = storage.getItem(STORAGE_KEYS.EXERCISES);
    const storedVersion = storage.getItem(STORAGE_KEYS.DATA_VERSION);

    if (!stored) {
      this.resetToDefault();
      storage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    } else {
      try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Dữ liệu storedExercises không phải là mảng hợp lệ');
        }
        if (storedVersion !== CURRENT_DATA_VERSION) {
          // Backup existing data before migration so nothing is ever lost
          try {
            storage.setItem(STORAGE_KEYS.BACKUP_EXERCISES, JSON.stringify(parsed));
          } catch (e) {
            console.warn('Backup write failed (storage limit)', e);
          }

          // Perform safe migration
          const migrated = migrateExercisesData(parsed, INITIAL_QUIZ_DATA);
          this.saveExercises(migrated);
          storage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
        } else {
          // Same version: ensure any missing lesson is present
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
        }
      } catch (e) {
        console.error('Failed to parse stored exercises, resetting to verified default', e);
        this.resetToDefault();
        storage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
      }
    }

    if (!storage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      this.saveProfile({
        name: 'Nguyễn Duy Trường',
        studentId: 'dtc245200120'
      });
    }

    if (!storage.getItem(STORAGE_KEYS.WRONG_QUESTIONS)) {
      storage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify([]));
    }
  }

  // --- Exercises & Questions CRUD ---
  getExercises() {
    try {
      const storage = getStorage();
      const data = storage.getItem(STORAGE_KEYS.EXERCISES);
      if (!data) return INITIAL_QUIZ_DATA;
      const parsed = JSON.parse(data);
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_QUIZ_DATA;
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
        (ex.questions || []).forEach(q => {
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
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
  }

  resetToDefault() {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(INITIAL_QUIZ_DATA));
  }

  updateQuestion(exerciseId, updatedQuestion) {
    const exercises = this.getExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return false;

    // Mark as user-customized to prevent automated sync from overwriting user edits
    const questionToSave = {
      ...updatedQuestion,
      isCustomized: true,
      customEditedAt: new Date().toISOString()
    };

    const idx = ex.questions.findIndex(q => q.id === questionToSave.id);
    if (idx !== -1) {
      ex.questions[idx] = questionToSave;
    } else {
      ex.questions.push(questionToSave);
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
      id: `${exerciseId}-custom-${Date.now()}`,
      number: qNum,
      isCustomized: true,
      customEditedAt: new Date().toISOString()
    };
    ex.questions.push(q);
    this.saveExercises(exercises);
    return q;
  }

  // --- Wrong Questions Collection ---
  getWrongQuestions() {
    try {
      const storage = getStorage();
      const data = storage.getItem(STORAGE_KEYS.WRONG_QUESTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  recordQuestionResult(questionId, isCorrect, questionData = null) {
    const storage = getStorage();
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
      // If answered correctly in review, decrement or remove
      if (existingIdx !== -1) {
        list[existingIdx].failedCount = (list[existingIdx].failedCount || 1) - 1;
        if (list[existingIdx].failedCount <= 0) {
          list.splice(existingIdx, 1);
        }
      }
    }
    storage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  }

  removeWrongQuestion(questionId) {
    const storage = getStorage();
    let list = this.getWrongQuestions().filter(item => item.id !== questionId);
    storage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  }

  clearWrongQuestions() {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify([]));
  }

  // Find question objects for wrong question mode
  getWrongQuestionObjects() {
    const wrongItems = this.getWrongQuestions();
    if (wrongItems.length === 0) return [];

    const wrongIds = new Set(wrongItems.map(w => w.id));
    const allExercises = this.getExercises();
    const result = [];

    allExercises.forEach(ex => {
      (ex.questions || []).forEach(q => {
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
      const storage = getStorage();
      const data = storage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : { name: 'Nguyễn Duy Trường', studentId: 'dtc245200120' };
    } catch (e) {
      return { name: 'Nguyễn Duy Trường', studentId: 'dtc245200120' };
    }
  }

  saveProfile(profile) {
    const storage = getStorage();
    storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }

  // --- History & Attempts ---
  getAttempts() {
    try {
      const storage = getStorage();
      const data = storage.getItem(STORAGE_KEYS.ATTEMPTS_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveAttempt(attempt) {
    const storage = getStorage();
    const history = this.getAttempts();
    history.unshift({
      id: 'att-' + Date.now(),
      date: new Date().toISOString(),
      ...attempt
    });
    // Keep max 50 recent
    if (history.length > 50) history.length = 50;
    storage.setItem(STORAGE_KEYS.ATTEMPTS_HISTORY, JSON.stringify(history));
  }

  // --- Backup & Restore ---
  getBackupExercises() {
    try {
      const storage = getStorage();
      const backupStr = storage.getItem(STORAGE_KEYS.BACKUP_EXERCISES);
      return backupStr ? JSON.parse(backupStr) : null;
    } catch (e) {
      return null;
    }
  }

  restoreBackupExercises() {
    const backup = this.getBackupExercises();
    if (backup && Array.isArray(backup)) {
      this.saveExercises(backup);
      return true;
    }
    return false;
  }

  // --- Backup & Export / Import ---
  exportAllData() {
    return JSON.stringify({
      version: CURRENT_DATA_VERSION,
      exportedAt: new Date().toISOString(),
      exercises: this.getExercises(),
      wrongQuestions: this.getWrongQuestions(),
      profile: this.getProfile(),
      history: this.getAttempts()
    }, null, 2);
  }

  importAllData(jsonString) {
    const storage = getStorage();
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'Dữ liệu file JSON trống hoặc không hợp lệ.' };
      }
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Nội dung file JSON phải là một đối tượng.' };
      }
      if (!data.exercises || !Array.isArray(data.exercises)) {
        return { success: false, error: 'File JSON thiếu danh sách bài học (trường "exercises").' };
      }

      // Strict schema validation
      const validation = validateExercisesSchema(data.exercises);
      if (!validation.valid) {
        return { success: false, error: `Cấu trúc dữ liệu không hợp lệ: ${validation.error}` };
      }

      // Safe saving only after schema verified
      this.saveExercises(data.exercises);
      if (data.wrongQuestions && Array.isArray(data.wrongQuestions)) {
        storage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(data.wrongQuestions));
      }
      if (data.profile && typeof data.profile === 'object' && data.profile.name) {
        this.saveProfile(data.profile);
      }
      return { success: true, count: data.exercises.length };
    } catch (e) {
      console.warn('Import parse error:', e.message);
      return { success: false, error: 'Lỗi phân tích JSON: ' + e.message };
    }
  }
}

export const store = new Store();
