/**
 * Main Application Orchestrator
 */
import { store } from './store.js';
import { sounds } from './audio.js';
import { QuizEngine } from './quizEngine.js';
import { DragDropEngine } from './dragDropEngine.js';
import { AdminEngine } from './adminEngine.js';
import { StatsEngine } from './statsEngine.js';

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class App {
  constructor() {
    this.currentScreen = 'home';
    this.selectedExerciseId = 'bai-1';
    this.selectedMode = 'all';
    this.quizEngine = null;
    this.dragDropEngine = null;
    this.adminEngine = null;
    this.statsEngine = null;
    this.lastResultSummary = null;
    this.resultFilter = 'all';

    this.init();
  }

  init() {
    this.bindDOM();
    this.initEngines();
    this.renderHome();
    this.setupEventListeners();

    // Check for active unsubmitted session and restore
    try {
      const active = store.getActiveSession();
      if (active && Array.isArray(active.questions) && active.questions.length > 0 && !active.isSubmitted) {
        if (this.quizEngine.restoreSession(active)) {
          this.switchScreen('quiz');
        }
      }
    } catch (err) {
      console.warn('Failed to restore active quiz session:', err);
    }
  }

  bindDOM() {
    // Screens
    this.screens = {
      home: document.getElementById('screen-home'),
      quiz: document.getElementById('screen-quiz'),
      result: document.getElementById('screen-result'),
      admin: document.getElementById('screen-admin')
    };

    // Header & Global
    this.topSubmitBtn = document.getElementById('btn-top-submit');
    this.btnGotoHome = document.getElementById('btn-goto-home');
    this.btnGotoAdmin = document.getElementById('btn-goto-admin');
    this.digitalClockEl = document.getElementById('digital-lcd-clock');
    this.digitalClockDigits = document.getElementById('digital-clock-digits');

    // Quiz Elements
    this.currentQNumEl = document.getElementById('current-q-number');
    this.currentQTextEl = document.getElementById('current-q-text');
    this.flagReviewContainer = document.getElementById('flag-review-container');
    this.flagCheckbox = document.getElementById('flag-checkbox');
    this.instructionBadgeContainer = document.getElementById('instruction-badge-container');
    this.quizAnswersContainer = document.getElementById('quiz-answers-container');
    this.bottomBannerTitle = document.getElementById('bottom-banner-title');
    this.bottomBannerSub = document.getElementById('bottom-banner-sub');
    this.paginationBubblesList = document.getElementById('pagination-bubbles-list');
    this.btnPrevQ = document.getElementById('btn-prev-q');
    this.btnNextQ = document.getElementById('btn-next-q');
    this.btnCheckInstant = document.getElementById('btn-check-instant');
    this.btnOpenDrawer = document.getElementById('btn-open-drawer');

    // Modals
    this.modeModal = document.getElementById('mode-modal-overlay');
    this.drawerModal = document.getElementById('drawer-modal-overlay');
    this.drawerGrid = document.getElementById('drawer-questions-grid');
  }

  initEngines() {
    // Quiz Engine
    this.quizEngine = new QuizEngine({
      onStateChanged: (state) => this.onQuizStateChanged(state),
      onTimerTick: (formattedTime, secondsLeft) => this.onTimerTick(formattedTime, secondsLeft),
      onQuizFinished: (summary) => this.onQuizFinished(summary)
    });

    // Admin CMS Engine
    this.adminEngine = new AdminEngine(
      document.getElementById('admin-cms-mount'),
      () => {
        this.renderHome();
      }
    );

    // Stats & Presence Engine
    this.statsEngine = new StatsEngine();
    this.statsEngine.init().catch((err) => {
      console.warn('StatsEngine initialization notice:', err);
    });
  }

  switchScreen(screenName) {
    this.currentScreen = screenName;
    Object.keys(this.screens).forEach(key => {
      if (key === screenName) {
        this.screens[key].classList.add('active');
      } else {
        this.screens[key].classList.remove('active');
      }
    });

    // Adjust top bar controls & clean white background based on screen
    if (screenName === 'quiz') {
      document.body.classList.add('quiz-mode');
      this.topSubmitBtn.style.display = 'flex';
      this.digitalClockEl.style.display = 'flex';
    } else {
      document.body.classList.remove('quiz-mode');
      this.topSubmitBtn.style.display = 'none';
      this.digitalClockEl.style.display = 'none';
    }

    if (screenName === 'admin') {
      this.adminEngine.render();
    } else if (screenName === 'home') {
      this.renderHome();
    }

    // Sync active screen to presence engine (takingQuiz tracking)
    if (this.statsEngine) {
      this.statsEngine.setScreen(screenName);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Home Screen Rendering ---
  renderHome() {
    if (this.statsEngine) {
      this.statsEngine.updateUI();
    }
    const exercises = store.getExercises();
    const wrongItems = store.getWrongQuestions();
    const totalWrong = wrongItems.length;

    // Calculate total questions
    let totalQuestions = 0;
    exercises.forEach(ex => totalQuestions += ex.questions.length);

    const grid = document.getElementById('exercises-list-grid');
    grid.innerHTML = '';

    // Exercise Cards
    exercises.forEach((ex, idx) => {
      const card = document.createElement('div');
      card.className = 'exercise-card';

      const badgeClasses = ['ex-badge-bai1', 'ex-badge-bai2', 'ex-badge-bai3', 'ex-badge-bai4', 'ex-badge-bai5', 'ex-badge-bai6'];
      const tagClass = badgeClasses[idx] || 'ex-badge-bai1';
      card.innerHTML = `
        <div>
          <div class="ex-card-avatar-pill">${idx + 1}</div>
          <span class="ex-badge-tag ${tagClass}">Bài Học ${idx + 1}</span>
          <h3 class="ex-card-title">${ex.title}</h3>
          <p class="ex-card-desc">${ex.description}</p>
        </div>
        <div>
          <div class="ex-meta-info">
            <span>${ex.questions.length} câu hỏi</span>
            <span>15-45 phút</span>
            <span>Đa dạng câu hỏi</span>
          </div>
          <button class="ex-action-btn btn-start-ex" data-id="${ex.id}">
            Bắt Đầu Ôn Luyện
          </button>
        </div>
      `;

      card.querySelector('.btn-start-ex').addEventListener('click', () => {
        this.openModeSelector(ex.id, ex.title);
      });

      grid.appendChild(card);
    });

    // "50 câu ngẫu nhiên" Card
    const random50Card = document.createElement('div');
    random50Card.className = 'exercise-card card-random-50';
    random50Card.innerHTML = `
      <div>
        <div class="ex-card-avatar-pill ex-avatar-random50">50</div>
        <span class="ex-badge-tag ex-badge-random50">🎯 ĐỀ THI CHUẨN 50 CÂU</span>
        <h3 class="ex-card-title">LÀM 50 CÂU NGẪU NHIÊN</h3>
        <p class="ex-card-desc">Tự động chọn lọc 50 câu hỏi ngẫu nhiên từ toàn bộ 6 bài học, trộn đề và đảo phương án đáp án chuẩn theo cấu trúc kỳ thi kết thúc học phần.</p>
      </div>
      <div>
        <div class="ex-meta-info">
          <span>⚡ 50 câu chọn lọc</span>
          <span>🎲 Trộn ngẫu nhiên</span>
          <span>⏱️ 45 phút / Tự do</span>
        </div>
        <div class="ex-card-actions-double">
          <button class="ex-action-btn btn-start-random50-practice" title="Bắt đầu luyện tập 50 câu tự do có kiểm tra đáp án tức thì">
            Luyện Tự Do (50 câu)
          </button>
          <button class="ex-action-btn btn-start-random50-exam" title="Thi thử 50 câu có bấm giờ 45 phút chuẩn phòng thi">
            Thi Thử (45 Phút)
          </button>
        </div>
        <button class="btn-config-random50" title="Tùy biến bộ lọc dạng câu hỏi hoặc chế độ">
          ⚙️ Tùy biến bộ lọc &amp; cấu hình
        </button>
      </div>
    `;

    random50Card.querySelector('.btn-start-random50-practice').addEventListener('click', () => {
      this.startQuizSession({
        exerciseId: 'random_50',
        mode: 'random_50',
        shuffleQuestions: true,
        shuffleOptions: true,
        questionCount: 50,
        instantCheck: true
      });
    });

    random50Card.querySelector('.btn-start-random50-exam').addEventListener('click', () => {
      this.startQuizSession({
        exerciseId: 'random_50',
        mode: 'exam',
        isRandom50: true,
        shuffleQuestions: true,
        shuffleOptions: true,
        questionCount: 50,
        instantCheck: false,
        timeLimitMinutes: 45
      });
    });

    random50Card.querySelector('.btn-config-random50').addEventListener('click', () => {
      this.openModeSelector('random_50', '50 CÂU HỎI NGẪU NHIÊN', 50, 'random_50');
    });

    grid.appendChild(random50Card);

    // "Tất cả các bài" (All questions) Card
    const allCard = document.createElement('div');
    allCard.className = 'exercise-card';
    allCard.innerHTML = `
      <div>
        <div class="ex-card-avatar-pill">ALL</div>
        <span class="ex-badge-tag ex-badge-all">TỔNG HỢP TOÀN BỘ</span>
        <h3 class="ex-card-title">TẤT CẢ CÁC BÀI ÔN TẬP</h3>
        <p class="ex-card-desc">Luyện tập toàn bộ ${totalQuestions} câu hỏi trắc nghiệm của tất cả các bài để chuẩn bị tốt nhất cho kỳ thi.</p>
      </div>
      <div>
        <div class="ex-meta-info">
          <span>${totalQuestions} câu hỏi</span>
          <span>Đề tổng hợp</span>
          <span>Phản xạ nhanh</span>
        </div>
        <button class="ex-action-btn btn-start-all" data-id="all">
          Luyện Toàn Bộ Bộ Đề
        </button>
      </div>
    `;
    allCard.querySelector('.btn-start-all').addEventListener('click', () => {
      this.openModeSelector('all', 'TẤT CẢ CÁC BÀI ÔN TẬP');
    });
    grid.appendChild(allCard);

    // "Ôn câu làm sai" Card
    const wrongCard = document.createElement('div');
    wrongCard.className = 'exercise-card';
    wrongCard.innerHTML = `
      <div>
        <div class="ex-card-avatar-pill">ERR</div>
        <span class="ex-badge-tag ex-badge-wrong">LUYỆN CÂU SAI</span>
        <h3 class="ex-card-title">ÔN TẬP CÁC CÂU LÀM SAI</h3>
        <p class="ex-card-desc">Hệ thống tự động ghi nhớ các câu trả lời sai. Luyện lại cho đến khi không còn câu nào sai.</p>
      </div>
      <div>
        <div class="ex-meta-info">
          <span>${totalWrong} câu cần sửa</span>
          <span>Lưu tự động</span>
          <span>Xóa khi đúng</span>
        </div>
        <button class="ex-action-btn btn-wrong-mode ${totalWrong === 0 ? 'disabled' : ''}" id="btn-start-wrong-mode" ${totalWrong === 0 ? 'disabled' : ''}>
          ${totalWrong > 0 ? `Ôn Luyện ${totalWrong} Câu Sai` : 'Chưa Có Câu Sai'}
        </button>
      </div>
    `;

    if (totalWrong > 0) {
      wrongCard.querySelector('#btn-start-wrong-mode').addEventListener('click', () => {
        this.startQuizSession({ exerciseId: 'wrong_only', mode: 'wrong_only' });
      });
    }
    grid.appendChild(wrongCard);
  }

  // --- Mode Selector Modal ---
  openModeSelector(exerciseId, exerciseTitle, defaultCount = null, defaultMode = null) {
    this.selectedExerciseId = exerciseId;
    document.getElementById('mode-modal-title').textContent = `Ôn luyện: ${exerciseTitle}`;

    if (defaultCount) {
      const selCount = document.getElementById('cfg-question-count');
      if (selCount) selCount.value = String(defaultCount);
    }

    if (defaultMode) {
      this.selectedMode = defaultMode;
      document.querySelectorAll('.mode-option-card').forEach(c => {
        if (c.dataset.mode === defaultMode) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      const chkShuffleQ = document.getElementById('cfg-shuffle-questions');
      const chkShuffleOpt = document.getElementById('cfg-shuffle-options');
      if (chkShuffleQ) chkShuffleQ.checked = true;
      if (chkShuffleOpt) chkShuffleOpt.checked = true;
    }

    this.modeModal.style.display = 'flex';
  }

  closeModeSelector() {
    this.modeModal.style.display = 'none';
  }

  startQuizSession(config) {
    try {
      this.lastQuizConfig = { ...config };
      this.quizEngine.startQuiz(config);
      this.switchScreen('quiz');
      sounds.playClick();
    } catch (e) {
      alert(e.message);
    }
  }

  // --- Quiz Screen Rendering & Handlers ---
  onTimerTick(formattedTime, secondsLeft) {
    this.digitalClockDigits.textContent = formattedTime;
    if (secondsLeft <= 120 && secondsLeft > 0) {
      this.digitalClockEl.classList.add('warning');
    } else {
      this.digitalClockEl.classList.remove('warning');
    }
  }

  onQuizStateChanged(state) {
    const q = state.currentQuestion;
    if (!q) return;

    // 0. Update Quiz Progress Bar
    const totalQ = state.questions.length;
    const answeredCount = state.questions.filter(question => this.quizEngine.hasAnswered(question.id)).length;
    const percentProgress = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
    const progressTextEl = document.getElementById('quiz-progress-text');
    const progressFillEl = document.getElementById('quiz-progress-fill');
    const answeredBadgeEl = document.getElementById('quiz-answered-badge');

    if (progressTextEl) progressTextEl.textContent = `Tiến độ làm bài: ${answeredCount} / ${totalQ} câu (${percentProgress}%)`;
    if (progressFillEl) progressFillEl.style.width = `${percentProgress}%`;
    if (answeredBadgeEl) answeredBadgeEl.textContent = `Đã trả lời: ${answeredCount} câu`;

    // 1. Update Top Banner / Exercise info
    const isExam = state.instantCheck === false;
    this.bottomBannerTitle.textContent = state.exercise ? state.exercise.title : 'KIỂM TRA 15 PHÚT';
    this.bottomBannerSub.textContent = isExam ? 'Chế độ thi thử có tính giờ' : 'Chủ nghĩa xã hội khoa học';

    // 2. Update Question Header
    this.currentQNumEl.textContent = `Câu ${q.sessionNumber || (state.currentIndex + 1)}:`;
    const cleanContent = q.content.replace(/^câu\s+\d+[:.]?\s*/i, '');
    this.currentQTextEl.textContent = cleanContent;

    // Flag checkbox
    const isFlagged = state.flaggedQuestions.includes(q.id);
    this.flagCheckbox.checked = isFlagged;
    if (isFlagged) {
      this.flagReviewContainer.classList.add('flagged');
    } else {
      this.flagReviewContainer.classList.remove('flagged');
    }

    // Instruction Badge
    let noteText = q.instructionNote || '';
    if (!noteText) {
      if (q.type === 'multiple_choice') noteText = 'Sinh viên chọn 2 hoặc nhiều phương án đúng';
      else if (q.type === 'single_choice') noteText = 'Chọn 1 phương án đúng nhất (A, B, C hoặc D)';
      else if (q.type === 'fill_blank') noteText = 'Điền từ hoặc cụm từ thích hợp vào ô trống';
      else if (q.type === 'matching') noteText = 'Nối nội dung ở Cột A với đáp án tương ứng ở Cột B';
      else if (q.type === 'table_completion') noteText = 'Nhập câu trả lời chính xác vào các ô trống trong bảng';
      else if (q.type === 'true_false_group') noteText = 'Đánh giá Đúng hoặc Sai cho từng nhận định';
    }
    if (noteText) {
      this.instructionBadgeContainer.innerHTML = `
        <div class="instruction-badge">
          <span class="instruction-badge-icon">i</span>
          <span>${escapeHtml(noteText)}</span>
        </div>
      `;
    } else {
      this.instructionBadgeContainer.innerHTML = '';
    }

    // 3. Render Answers area based on Type
    this.renderQuestionAnswers(q, state);

    // 4. Update Instant Check Button
    if (state.instantCheck && !state.isSubmitted) {
      this.btnCheckInstant.style.display = 'block';
      const isChecked = state.checkedQuestions.includes(q.id);
      if (isChecked) {
        this.btnCheckInstant.textContent = 'Đã kiểm tra';
        this.btnCheckInstant.disabled = true;
        this.btnCheckInstant.style.opacity = '0.7';
      } else {
        this.btnCheckInstant.textContent = 'Kiểm tra đáp án';
        this.btnCheckInstant.disabled = !this.quizEngine.hasAnswered(q.id);
        this.btnCheckInstant.style.opacity = '1';
      }
    } else {
      this.btnCheckInstant.style.display = 'none';
    }

    // 5. Update Navigation Buttons
    this.btnPrevQ.disabled = state.currentIndex === 0;
    this.btnPrevQ.style.opacity = state.currentIndex === 0 ? '0.5' : '1';

    if (state.currentIndex === state.questions.length - 1) {
      this.btnNextQ.textContent = 'Nộp bài';
    } else {
      this.btnNextQ.textContent = 'Câu hỏi tiếp theo';
    }

    // 6. Update Pagination Number Bubbles
    this.renderPaginationBubbles(state);
  }

  renderExplanationBox(explanation) {
    if (!explanation) return;
    const box = document.createElement('div');
    box.className = 'quiz-explanation-box';
    box.innerHTML = `
      <div class="explanation-title">
        <span class="explanation-icon">💡</span>
        <span>Lời Giải &amp; Ghi Chú Kiến Thức:</span>
      </div>
      <div class="explanation-text">${escapeHtml(explanation)}</div>
    `;
    this.quizAnswersContainer.appendChild(box);
  }

  renderQuestionAnswers(question, state) {
    this.quizAnswersContainer.innerHTML = '';
    const userAnswer = state.userAnswers[question.id];
    const isChecked = state.checkedQuestions.includes(question.id) || state.isSubmitted;

    // Evaluate if checked
    let evalRes = null;
    if (isChecked) {
      evalRes = this.quizEngine.evaluateQuestion(question, userAnswer);
    }

    if (question.type === 'single_choice') {
      const grid = document.createElement('div');
      grid.className = 'options-grid-container';

      (question.options || []).forEach(opt => {
        const optKey = opt.origKey || opt.key;
        const isSelected = userAnswer === optKey;
        
        const optionRow = document.createElement('div');
        optionRow.className = 'answer-option-row';

        const keyLabel = document.createElement('span');
        keyLabel.className = 'option-key-label';
        keyLabel.textContent = opt.visualKey || opt.displayKey || opt.key;

        const card = document.createElement('div');
        card.className = `answer-card ${isSelected ? 'selected' : ''}`;

        // Color coding if evaluated
        if (isChecked && evalRes) {
          const isCorrectOpt = Boolean(opt.isCorrect || (evalRes.correctAnswers && evalRes.correctAnswers.includes(optKey)));
          if (isCorrectOpt) {
            card.classList.add('eval-correct');
          } else if (isSelected && !isCorrectOpt) {
            card.classList.add('eval-wrong');
          }
        }

        let feedbackBadge = '';
        if (isChecked && evalRes) {
          const isCorrectOpt = Boolean(opt.isCorrect || (evalRes.correctAnswers && evalRes.correctAnswers.includes(optKey)));
          if (isCorrectOpt) {
            feedbackBadge = '<span style="margin-left: auto; font-size: 12px; font-weight: 700; color: #16a34a; white-space: nowrap;">✓ Đáp án đúng</span>';
          } else if (isSelected) {
            feedbackBadge = '<span style="margin-left: auto; font-size: 12px; font-weight: 700; color: #dc2626; white-space: nowrap;">✗ Lựa chọn sai</span>';
          }
        }

        card.innerHTML = `
          <span class="option-input-indicator"></span>
          <span class="option-content-text">${escapeHtml(opt.content)}</span>
          ${feedbackBadge}
        `;

        card.addEventListener('click', () => {
          if (state.isSubmitted || isChecked) return;
          this.quizEngine.setAnswer(question.id, optKey);
          sounds.playClick();
        });

        optionRow.appendChild(keyLabel);
        optionRow.appendChild(card);
        grid.appendChild(optionRow);
      });

      this.quizAnswersContainer.appendChild(grid);

      if (isChecked && question.explanation) {
        this.renderExplanationBox(question.explanation);
      }

    } else if (question.type === 'multiple_choice') {
      const grid = document.createElement('div');
      grid.className = 'options-grid-container';

      const userSelectedKeys = Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []);

      (question.options || []).forEach(opt => {
        const optKey = opt.origKey || opt.key;
        const isSelected = userSelectedKeys.includes(optKey);
        
        const optionRow = document.createElement('div');
        optionRow.className = 'answer-option-row';

        const keyLabel = document.createElement('span');
        keyLabel.className = 'option-key-label';
        keyLabel.textContent = opt.visualKey || opt.displayKey || opt.key;

        const card = document.createElement('div');
        card.className = `answer-card multiple ${isSelected ? 'selected' : ''}`;

        // Color coding if evaluated
        if (isChecked && evalRes) {
          const isCorrectOpt = Boolean(opt.isCorrect || (evalRes.correctAnswers && evalRes.correctAnswers.includes(optKey)));
          if (isCorrectOpt && isSelected) {
            card.classList.add('eval-correct');
          } else if (!isCorrectOpt && isSelected) {
            card.classList.add('eval-wrong');
          } else if (isCorrectOpt && !isSelected) {
            card.classList.add('eval-missed');
          }
        }

        let extraTag = '';
        if (isChecked && evalRes) {
          const isCorrectOpt = Boolean(opt.isCorrect || (evalRes.correctAnswers && evalRes.correctAnswers.includes(optKey)));
          if (isCorrectOpt && isSelected) {
            extraTag = '<span style="margin-left: auto; font-size: 12px; font-weight: 700; color: #16a34a; white-space: nowrap;">✓ Chọn đúng</span>';
          } else if (!isCorrectOpt && isSelected) {
            extraTag = '<span style="margin-left: auto; font-size: 12px; font-weight: 700; color: #dc2626; white-space: nowrap;">✗ Chọn sai</span>';
          } else if (isCorrectOpt && !isSelected) {
            extraTag = '<span style="margin-left: auto; font-size: 12px; font-weight: 700; color: #15803d; white-space: nowrap;">✓ Đáp án đúng bị bỏ sót</span>';
          }
        }

        card.innerHTML = `
          <span class="option-input-indicator"></span>
          <span class="option-content-text">${escapeHtml(opt.content)}</span>
          ${extraTag}
        `;

        card.addEventListener('click', () => {
          if (state.isSubmitted || isChecked) return;
          sounds.playClick();
          let nextKeys = [...userSelectedKeys];
          if (nextKeys.includes(optKey)) {
            nextKeys = nextKeys.filter(k => k !== optKey);
          } else {
            nextKeys.push(optKey);
          }
          this.quizEngine.setAnswer(question.id, nextKeys);
        });

        optionRow.appendChild(keyLabel);
        optionRow.appendChild(card);
        grid.appendChild(optionRow);
      });

      this.quizAnswersContainer.appendChild(grid);

      // Status counter if not submitted
      if (state.instantCheck && !state.isSubmitted && !isChecked) {
        const targetCount = question.correctAnswers ? question.correctAnswers.length : (question.options || []).filter(o => o.isCorrect).length;
        const actionBar = document.createElement('div');
        actionBar.className = 'mc-action-bar';
        actionBar.innerHTML = `
          <div class="mc-status-counter">
            <span>Đã chọn: <strong>${userSelectedKeys.length}</strong> ${targetCount ? `/ <strong>${targetCount}</strong>` : ''} phương án</span>
          </div>
        `;
        this.quizAnswersContainer.appendChild(actionBar);
      }

      // If evaluated, show clear banner
      if (isChecked && evalRes) {
        const banner = document.createElement('div');
        banner.className = `mc-eval-banner ${evalRes.isCorrect ? 'correct' : 'wrong'}`;
        if (evalRes.isCorrect) {
          banner.innerHTML = `<span>✓ Chính xác! Bạn đã chọn đúng ${userSelectedKeys.length}/${userSelectedKeys.length} đáp án (+1 điểm)</span>`;
        } else {
          banner.innerHTML = `<span>✗ Chưa chính xác. Đáp án đúng là: <strong>${(evalRes.correctAnswers || []).join(', ')}</strong></span>`;
        }
        this.quizAnswersContainer.appendChild(banner);

        if (question.explanation) {
          this.renderExplanationBox(question.explanation);
        }
      }

    } else if (question.type === 'fill_blank') {
      const fbContainer = document.createElement('div');
      fbContainer.className = 'fill-blank-container';

      const blanks = (question.blanks && question.blanks.length > 0) ? question.blanks : [{
        id: 'blank-1',
        order: 1,
        label: 'Câu trả lời điền khuyết',
        placeholder: 'Nhập câu trả lời...',
        acceptedAnswers: question.acceptedAnswers || []
      }];

      const currentAnswers = (typeof userAnswer === 'object' && userAnswer !== null)
        ? userAnswer
        : { [blanks[0].id]: (typeof userAnswer === 'string' ? userAnswer : '') };

      blanks.forEach((b, bIdx) => {
        const bId = b.id || `blank-${bIdx + 1}`;
        const userVal = currentAnswers[bId] || '';
        const bResult = (isChecked && evalRes && Array.isArray(evalRes.blankResults))
          ? evalRes.blankResults.find(r => r.id === bId)
          : null;

        const field = document.createElement('div');
        field.className = 'fill-blank-field';

        let statusClass = '';
        let feedbackHtml = '';
        if (bResult) {
          if (bResult.isCorrect) {
            statusClass = 'is-correct';
            feedbackHtml = `<span class="fill-blank-feedback correct">✓ Chính xác (+${(1 / blanks.length).toFixed(2).replace(/\.?0+$/, '')} điểm)</span>`;
          } else {
            statusClass = 'is-wrong';
            const acceptedList = (bResult.acceptedAnswers || []).join(' / ');
            feedbackHtml = `<span class="fill-blank-feedback wrong">✗ Chưa đúng (Đáp án đúng: <strong>${escapeHtml(acceptedList)}</strong>)</span>`;
          }
        }

        field.innerHTML = `
          <label class="fill-blank-label">
            <span class="blank-badge">${b.order || (bIdx + 1)}</span>
            <span>${escapeHtml(b.label || `Chỗ trống (${b.order || (bIdx + 1)})`)}</span>
          </label>
          <div class="fill-blank-input-group">
            <input type="text" class="fill-blank-input ${statusClass}" data-blank-id="${bId}" value="${escapeHtml(userVal)}" placeholder="${escapeHtml(b.placeholder || 'Nhập từ hoặc cụm từ...')}" ${isChecked ? 'readonly' : ''} />
            ${feedbackHtml}
          </div>
        `;

        const inputEl = field.querySelector('input');
        inputEl.addEventListener('input', (e) => {
          if (state.isSubmitted || isChecked) return;
          const updated = { ...currentAnswers, [bId]: e.target.value };
          this.quizEngine.setAnswer(question.id, updated);
        });

        fbContainer.appendChild(field);
      });

      this.quizAnswersContainer.appendChild(fbContainer);

      if (isChecked && evalRes) {
        const banner = document.createElement('div');
        banner.className = `mc-eval-banner ${evalRes.isCorrect ? 'correct' : 'wrong'}`;
        if (evalRes.isCorrect) {
          banner.innerHTML = `<span>✓ Chính xác! Bạn đã điền đúng toàn bộ chỗ trống (+1 điểm)</span>`;
        } else {
          banner.innerHTML = `<span>✗ Điền đúng: <strong>${evalRes.correctCount || 0}/${evalRes.totalBlanks || blanks.length}</strong> chỗ trống</span>`;
        }
        this.quizAnswersContainer.appendChild(banner);

        if (question.explanation) {
          this.renderExplanationBox(question.explanation);
        }
      }

    } else if (question.type === 'matching') {
      const matchingContainer = document.createElement('div');
      matchingContainer.className = 'matching-container';

      const pairs = question.pairs || [];
      const colA = question.sessionColumnA || pairs.map((p, idx) => ({ id: p.id || `pair-${idx + 1}`, text: p.left }));
      const colB = question.sessionColumnB || pairs.map((p, idx) => ({ id: p.id || `pair-${idx + 1}`, text: p.right }));

      const currentMatches = (typeof userAnswer === 'object' && userAnswer !== null) ? userAnswer : {};

      const instructions = document.createElement('div');
      instructions.className = 'matching-helper-text';
      instructions.textContent = '💡 Chọn nội dung ghép đôi phù hợp từ Cột B cho từng mục ở Cột A:';
      matchingContainer.appendChild(instructions);

      const listGrid = document.createElement('div');
      listGrid.className = 'matching-pairs-list';

      colA.forEach((itemA, aIdx) => {
        const pairId = itemA.id;
        const selectedBId = currentMatches[pairId] || '';
        const pairResult = (isChecked && evalRes && Array.isArray(evalRes.pairResults))
          ? evalRes.pairResults.find(r => r.id === pairId)
          : null;

        const row = document.createElement('div');
        row.className = 'matching-row-card';

        let statusClass = '';
        let feedbackHtml = '';
        if (pairResult) {
          if (pairResult.isCorrect) {
            statusClass = 'eval-correct';
            feedbackHtml = `<span class="matching-feedback correct">✓ Ghép đúng</span>`;
          } else {
            statusClass = 'eval-wrong';
            feedbackHtml = `<span class="matching-feedback wrong">✗ Sai (Đáp án đúng: <strong>${escapeHtml(pairResult.correctRight)}</strong>)</span>`;
          }
        }

        const optionsHtml = colB.map((itemB, bIdx) => {
          const letter = String.fromCharCode(65 + bIdx);
          const isSelected = selectedBId === itemB.id;
          return `<option value="${escapeHtml(itemB.id)}" ${isSelected ? 'selected' : ''}>[${letter}] ${escapeHtml(itemB.text)}</option>`;
        }).join('');

        row.innerHTML = `
          <div class="matching-left-item ${statusClass}">
            <div class="matching-index-badge">${aIdx + 1}</div>
            <div class="matching-left-text">${escapeHtml(itemA.text)}</div>
          </div>
          <div class="matching-connect-arrow">➔</div>
          <div class="matching-right-selector">
            <select class="matching-select ${statusClass}" data-pair-id="${escapeHtml(pairId)}" ${isChecked ? 'disabled' : ''}>
              <option value="">-- Chọn đáp án ghép tương ứng --</option>
              ${optionsHtml}
            </select>
            ${feedbackHtml}
          </div>
        `;

        const selectEl = row.querySelector('.matching-select');
        selectEl.addEventListener('change', (e) => {
          if (state.isSubmitted || isChecked) return;
          sounds.playClick();
          const nextMatches = { ...currentMatches, [pairId]: e.target.value };
          this.quizEngine.setAnswer(question.id, nextMatches);
        });

        listGrid.appendChild(row);
      });

      matchingContainer.appendChild(listGrid);
      this.quizAnswersContainer.appendChild(matchingContainer);

      if (isChecked && evalRes) {
        const banner = document.createElement('div');
        banner.className = `mc-eval-banner ${evalRes.isCorrect ? 'correct' : 'wrong'}`;
        if (evalRes.isCorrect) {
          banner.innerHTML = `<span>✓ Chính xác! Bạn đã ghép đúng tất cả các cặp (+1 điểm)</span>`;
        } else {
          banner.innerHTML = `<span>✗ Ghép đúng: <strong>${evalRes.correctCount || 0}/${evalRes.totalPairs || pairs.length}</strong> cặp</span>`;
        }
        this.quizAnswersContainer.appendChild(banner);

        if (question.explanation) {
          this.renderExplanationBox(question.explanation);
        }
      }

    } else if (question.type === 'table_completion') {
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-completion-wrapper';

      const headers = question.headers || ['Tiêu chí', 'Nội dung'];
      const rows = question.rows || [];
      const currentTableAns = (typeof userAnswer === 'object' && userAnswer !== null) ? userAnswer : {};

      const table = document.createElement('table');
      table.className = 'table-completion-grid';

      // Thead
      const thead = document.createElement('thead');
      const headerTr = document.createElement('tr');
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerTr.appendChild(th);
      });
      thead.appendChild(headerTr);
      table.appendChild(thead);

      // Tbody
      const tbody = document.createElement('tbody');
      rows.forEach((rowCells, rIdx) => {
        const tr = document.createElement('tr');
        (rowCells || []).forEach((cell, cIdx) => {
          const td = document.createElement('td');
          if (cell && cell.isInput) {
            td.className = 'cell-input-wrapper';
            const cellId = cell.id || `cell-${rIdx + 1}-${cIdx + 1}`;
            const cellVal = currentTableAns[cellId] || '';
            const cellResult = (isChecked && evalRes && Array.isArray(evalRes.cellResults))
              ? evalRes.cellResults.find(r => r.id === cellId)
              : null;

            let inputClass = '';
            let fbHtml = '';
            if (cellResult) {
              if (cellResult.isCorrect) {
                inputClass = 'is-correct';
                fbHtml = `<div class="cell-feedback correct">✓ Đúng</div>`;
              } else {
                inputClass = 'is-wrong';
                const acceptedList = (cellResult.acceptedAnswers || []).join(' / ');
                fbHtml = `<div class="cell-feedback wrong">✗ Sai (Đ/A: ${escapeHtml(acceptedList)})</div>`;
              }
            }

            td.innerHTML = `
              <input type="text" class="table-cell-input ${inputClass}" data-cell-id="${escapeHtml(cellId)}" value="${escapeHtml(cellVal)}" placeholder="${escapeHtml(cell.placeholder || 'Nhập câu trả lời...')}" ${isChecked ? 'readonly' : ''} />
              ${fbHtml}
            `;

            const inputEl = td.querySelector('input');
            inputEl.addEventListener('input', (e) => {
              if (state.isSubmitted || isChecked) return;
              const nextTableAns = { ...currentTableAns, [cellId]: e.target.value };
              this.quizEngine.setAnswer(question.id, nextTableAns);
            });
          } else {
            td.className = 'cell-readonly';
            td.textContent = cell ? (cell.text || cell.content || '') : '';
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      this.quizAnswersContainer.appendChild(tableWrapper);

      if (isChecked && evalRes) {
        const banner = document.createElement('div');
        banner.className = `mc-eval-banner ${evalRes.isCorrect ? 'correct' : 'wrong'}`;
        if (evalRes.isCorrect) {
          banner.innerHTML = `<span>✓ Chính xác! Bạn đã điền đúng toàn bộ các ô trong bảng (+1 điểm)</span>`;
        } else {
          banner.innerHTML = `<span>✗ Điền đúng: <strong>${evalRes.correctCount || 0}/${evalRes.totalCells || 1}</strong> ô</span>`;
        }
        this.quizAnswersContainer.appendChild(banner);

        if (question.explanation) {
          this.renderExplanationBox(question.explanation);
        }
      }

    } else if (question.type === 'true_false_group') {
      const container = document.createElement('div');
      container.className = 'tf-group-container';
      const currentTF = userAnswer || {};
      const totalItemsCount = (question.items || []).length;
      let answeredItemsCount = 0;

      (question.items || []).forEach(it => {
        const userChoice = currentTF[it.order];
        const isItemAnswered = Boolean(userChoice);
        if (isItemAnswered) answeredItemsCount++;

        const row = document.createElement('div');
        row.className = 'tf-item-row';

        const shouldShowItemEval = (isChecked && evalRes);

        let tfFeedbackHtml = '';
        let btnTrueClass = '';
        let btnFalseClass = '';

        if (userChoice === 'Đúng') {
          btnTrueClass = 'selected-true';
        } else if (userChoice === 'Sai') {
          btnFalseClass = 'selected-false';
        }

        if (shouldShowItemEval) {
          const correctAns = (it.correctAnswer || '').trim();
          const isItemCorrect = userChoice && (userChoice.trim().toLowerCase() === correctAns.toLowerCase());

          if (isItemAnswered) {
            row.classList.add(isItemCorrect ? 'eval-correct' : 'eval-wrong');
            if (isItemCorrect) {
              tfFeedbackHtml = `<span class="tf-eval-tag correct">✓ Đúng</span>`;
              if (userChoice === 'Đúng') btnTrueClass = 'eval-btn-correct';
              if (userChoice === 'Sai') btnFalseClass = 'eval-btn-correct';
            } else {
              tfFeedbackHtml = `<span class="tf-eval-tag wrong">✗ Sai (Đáp án đúng: ${escapeHtml(correctAns)})</span>`;
              if (userChoice === 'Đúng') {
                btnTrueClass = 'eval-btn-wrong';
                btnFalseClass = 'eval-btn-hint';
              } else {
                btnFalseClass = 'eval-btn-wrong';
                btnTrueClass = 'eval-btn-hint';
              }
            }
          } else if (isChecked) {
            row.classList.add('eval-wrong');
            tfFeedbackHtml = `<span class="tf-eval-tag wrong">✗ Chưa chọn (Đáp án đúng: ${escapeHtml(correctAns)})</span>`;
            if (correctAns.toLowerCase() === 'đúng') btnTrueClass = 'eval-btn-hint';
            if (correctAns.toLowerCase() === 'sai') btnFalseClass = 'eval-btn-hint';
          }
        }

        row.innerHTML = `
          <div class="tf-item-statement">
            <span class="tf-num">${it.order}.</span>
            <span>${escapeHtml(it.statement)}</span>
            ${tfFeedbackHtml ? `<div>${tfFeedbackHtml}</div>` : ''}
          </div>
          <div class="tf-buttons-group">
            <button class="btn-tf btn-tf-true ${btnTrueClass}" data-ans="Đúng">
              ${btnTrueClass === 'eval-btn-correct' ? '✓ Đúng' : (btnTrueClass === 'eval-btn-wrong' ? '✗ Đúng' : 'Đúng')}
            </button>
            <button class="btn-tf btn-tf-false ${btnFalseClass}" data-ans="Sai">
              ${btnFalseClass === 'eval-btn-correct' ? '✓ Sai' : (btnFalseClass === 'eval-btn-wrong' ? '✗ Sai' : 'Sai')}
            </button>
          </div>
        `;

        row.querySelector('.btn-tf-true').addEventListener('click', () => {
          if (state.isSubmitted || isChecked) return;
          sounds.playClick();
          const nextTF = { ...currentTF, [it.order]: 'Đúng' };
          this.quizEngine.setAnswer(question.id, nextTF);
        });

        row.querySelector('.btn-tf-false').addEventListener('click', () => {
          if (state.isSubmitted || isChecked) return;
          sounds.playClick();
          const nextTF = { ...currentTF, [it.order]: 'Sai' };
          this.quizEngine.setAnswer(question.id, nextTF);
        });

        container.appendChild(row);
      });

      this.quizAnswersContainer.appendChild(container);

      // Inline action bar for True/False in Practice Mode
      if (state.instantCheck && !state.isSubmitted && !isChecked) {
        const actionBar = document.createElement('div');
        actionBar.className = 'mc-action-bar';

        const counter = document.createElement('div');
        counter.className = 'mc-status-counter';
        counter.innerHTML = `<span>Đã đánh giá: <strong>${answeredItemsCount}</strong> / <strong>${totalItemsCount}</strong> nhận định</span>`;

        actionBar.appendChild(counter);
        this.quizAnswersContainer.appendChild(actionBar);
      }

      // If evaluated, show clear banner
      if (isChecked && evalRes) {
        const banner = document.createElement('div');
        banner.className = `mc-eval-banner ${evalRes.isCorrect ? 'correct' : 'wrong'}`;
        if (evalRes.isCorrect) {
          banner.innerHTML = `<span>✓ Chính xác! Bạn đã đánh giá đúng tất cả ${evalRes.totalItems || totalItemsCount}/${evalRes.totalItems || totalItemsCount} nhận định (+1 điểm)</span>`;
        } else {
          banner.innerHTML = `<span>✗ Chưa chính xác. Đã đánh giá đúng: <strong>${evalRes.correctItems || 0}/${evalRes.totalItems || totalItemsCount}</strong> nhận định</span>`;
        }
        this.quizAnswersContainer.appendChild(banner);

        if (question.explanation) {
          this.renderExplanationBox(question.explanation);
        }
      }

    } else if (question.type === 'drag_drop' || question.type === 'drag_drop_columns') {
      const ddMount = document.createElement('div');
      ddMount.id = 'dd-interactive-mount';
      this.quizAnswersContainer.appendChild(ddMount);

      const isLocked = state.isSubmitted || state.checkedQuestions.includes(question.id);
      this.dragDropEngine = new DragDropEngine(ddMount, (updatedState) => {
        if (isLocked) return;
        sounds.playClick();
        this.quizEngine.setAnswer(question.id, updatedState);
      }, {
        isReadOnly: isLocked,
        isChecked: isChecked,
        evalRes: isChecked ? evalRes : null
      });

      this.dragDropEngine.render(question, userAnswer);

      if (isChecked && question.explanation) {
        this.renderExplanationBox(question.explanation);
      }
    }
  }

  renderPaginationBubbles(state) {
    this.paginationBubblesList.innerHTML = '';
    
    state.questions.forEach((q, idx) => {
      const bubble = document.createElement('div');
      bubble.className = 'q-bubble';
      bubble.textContent = q.sessionNumber || (idx + 1);

      if (idx === state.currentIndex) {
        bubble.classList.add('active');
      }

      if (state.flaggedQuestions.includes(q.id)) {
        bubble.classList.add('flagged');
      }

      if (this.quizEngine.hasAnswered(q.id)) {
        bubble.classList.add('answered');
      }

      if (state.isSubmitted || state.checkedQuestions.includes(q.id)) {
        const evalRes = this.quizEngine.evaluateQuestion(q, state.userAnswers[q.id]);
        if (evalRes.isCorrect) {
          bubble.classList.add('correct');
        } else {
          bubble.classList.add('wrong');
        }
      }

      bubble.addEventListener('click', () => {
        this.quizEngine.goToQuestion(idx);
      });

      this.paginationBubblesList.appendChild(bubble);
    });

    // Auto-scroll active bubble into view
    const activeBubble = this.paginationBubblesList.querySelector('.q-bubble.active');
    if (activeBubble) {
      activeBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // --- Result Screen Rendering ---
  onQuizFinished(summary) {
    this.lastResultSummary = summary;
    this.switchScreen('result');

    // Score & Percentage
    const percent = Number(summary.percentage) || 0;
    const percentEl = document.getElementById('result-percent-text');
    if (percentEl) percentEl.textContent = `${percent}%`;
    
    // Animate Circle Gauge safely using SVG setAttribute (prevent SVGAnimatedString readonly crash)
    try {
      const circle = document.getElementById('gauge-score-circle');
      if (circle) {
        const circumference = 2 * Math.PI * 50; // ~314.16
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        const scoreClass = percent < 50 ? 'score-low' : (percent < 80 ? 'score-mid' : 'score-high');
        circle.setAttribute('class', `gauge-val ${scoreClass}`);
      }
    } catch (err) {
      console.warn('SVG Gauge animation warning:', err);
    }

    // Headline & Subhead (do not say "Xuất sắc" if score is low or questions mostly left blank)
    const headline = document.getElementById('result-headline');
    const subhead = document.getElementById('result-subhead');
    const answered = summary.answeredCount || 0;
    const total = summary.totalQuestions || 1;
    const score10Str = summary.score10Formatted || (summary.score10 !== undefined ? Number(summary.score10).toFixed(1) : ((summary.score / total) * 10).toFixed(1));

    if (headline && subhead) {
      if (percent >= 80 && answered >= total * 0.8) {
        headline.textContent = 'Xuất Sắc! Bạn Đã Nắm Rất Vững Kiến Thức';
        subhead.textContent = `Bạn đã hoàn thành ${total} câu với điểm số ${score10Str}/10 (${percent}%).`;
      } else if (percent >= 50 && answered >= total * 0.5) {
        headline.textContent = 'Khá Tốt! Bạn Đã Đạt Chuẩn';
        subhead.textContent = `Bạn đạt ${score10Str}/10. Hãy ôn lại một số câu chưa chính xác hoặc chưa làm bên dưới.`;
      } else {
        headline.textContent = 'Cần Cố Gắng Thêm!';
        subhead.textContent = `Bạn đạt ${score10Str}/10. Có ${summary.correctCount} câu đúng, ${summary.wrongCount} câu sai và ${summary.unansweredCount} câu chưa trả lời.`;
      }
    }

    // Set all metrics safely
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('metric-score-val', `${score10Str}/10`);
    setEl('metric-total-val', summary.totalQuestions);
    setEl('metric-answered-val', summary.answeredCount);
    setEl('metric-correct-val', summary.correctCount);
    setEl('metric-wrong-val', summary.wrongCount);
    setEl('metric-unanswered-val', summary.unansweredCount);

    const timeSpent = summary.timeSpentSeconds || 0;
    const mins = Math.floor(timeSpent / 60);
    const secs = timeSpent % 60;
    setEl('metric-time-val', `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

    // Retry Wrong button state (only shown if there are actual wrong answers)
    const btnRetryWrong = document.getElementById('btn-retry-wrong-only');
    if (btnRetryWrong) {
      if (summary.wrongCount > 0) {
        btnRetryWrong.style.display = 'flex';
        btnRetryWrong.textContent = `Ôn lại ${summary.wrongCount} câu làm sai`;
      } else {
        btnRetryWrong.style.display = 'none';
      }
    }

    // Counts on filter tabs
    setEl('filter-all-cnt', summary.totalQuestions);
    setEl('filter-correct-cnt', summary.correctCount);
    setEl('filter-wrong-cnt', summary.wrongCount);
    setEl('filter-unanswered-cnt', summary.unansweredCount);

    // Reset filter tab UI to 'all'
    document.querySelectorAll('.review-filter-btn').forEach(b => {
      if (b.dataset.filter === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });

    this.renderResultQuestionsList('all');
  }

  renderResultQuestionsList(filter = 'all') {
    this.resultFilter = filter;
    const listContainer = document.getElementById('review-items-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (!this.lastResultSummary || !Array.isArray(this.lastResultSummary.results)) {
      listContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 24px;">Chưa có dữ liệu bài làm.</div>`;
      return;
    }

    let items = this.lastResultSummary.results;
    if (filter === 'wrong') {
      items = items.filter(it => it.isAnswered && !it.isCorrect);
    } else if (filter === 'correct') {
      items = items.filter(it => it.isCorrect);
    } else if (filter === 'unanswered') {
      items = items.filter(it => it.isUnanswered);
    }

    if (items.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 24px; font-size: 14px;">Không có câu hỏi nào trong mục này.</div>`;
      return;
    }

    items.forEach((item) => {
      const q = item.question;
      const isUnanswered = Boolean(item.isUnanswered);
      const isCorrect = Boolean(item.isCorrect);

      const card = document.createElement('div');
      const cardStateClass = isUnanswered ? 'is-unanswered' : (isCorrect ? 'is-correct' : 'is-wrong');
      card.className = `review-item-card ${cardStateClass}`;

      let statusBadge = '';
      if (isUnanswered) {
        statusBadge = '<span class="review-status-badge unanswered">Chưa trả lời (0 điểm)</span>';
      } else if (isCorrect) {
        const scoreDisplay = Number(item.score).toFixed(1).replace(/\.0$/, '');
        statusBadge = `<span class="review-status-badge correct">Chính xác (+${scoreDisplay} điểm)</span>`;
      } else {
        statusBadge = '<span class="review-status-badge wrong">Trả lời sai (0 điểm)</span>';
      }

      let answersComparisonHtml = '';
      if (q.options) {
        answersComparisonHtml = `
          <div class="admin-options-preview" style="margin-top: 10px;">
            ${q.options.map(opt => {
              const optKey = opt.origKey || opt.key;
              const isUserPick = !isUnanswered && item.userAnswer && (Array.isArray(item.userAnswer) ? (item.userAnswer.includes(optKey) || item.userAnswer.includes(opt.key)) : (item.userAnswer === optKey || item.userAnswer === opt.key));
              const isCorrectOpt = opt.isCorrect;
              const displayTag = opt.visualKey || opt.displayKey || opt.key;
              return `
                <div class="admin-opt-item ${isCorrectOpt ? 'is-correct-opt' : ''}">
                  <span class="opt-tag">${displayTag}.</span>
                  <span class="opt-text">${escapeHtml(opt.content)}</span>
                  ${isUserPick ? '<span style="font-size: 11px; font-weight: 700; color: #2563eb; margin-left: auto;">[Bạn chọn]</span>' : ''}
                  ${isCorrectOpt ? '<span class="correct-badge">✓ Đáp án đúng</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
          ${isUnanswered ? '<div style="margin-top: 8px; font-size: 13px; color: #64748b; font-style: italic;">Bạn đã bỏ trống câu này (chưa chọn phương án nào).</div>' : ''}
        `;
      } else if (q.type === 'fill_blank' || q.blanks) {
        const blanks = q.blanks || [{ id: 'blank-1', order: 1, label: 'Chỗ trống', acceptedAnswers: q.acceptedAnswers || [] }];
        const userAnsObj = (typeof item.userAnswer === 'object' && item.userAnswer !== null) ? item.userAnswer : { 'blank-1': (typeof item.userAnswer === 'string' ? item.userAnswer : '') };
        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            ${blanks.map((b, bIdx) => {
              const bId = b.id || `blank-${bIdx + 1}`;
              const uVal = isUnanswered ? '' : (userAnsObj[bId] || '');
              const accepted = b.acceptedAnswers || (b.acceptedAnswer ? [b.acceptedAnswer] : []);
              const normUser = String(uVal || '').trim().replace(/\s+/g, ' ').toLowerCase();
              const normAccepted = accepted.map(a => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase());
              const isItemCorrect = normUser !== '' && normAccepted.includes(normUser);
              return `
                <div style="font-size: 13.5px; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div style="font-weight: 600; color: #334155;">Chỗ trống ${b.order || (bIdx + 1)}: ${escapeHtml(b.label || '')}</div>
                  <div style="margin-top: 4px; font-size: 13px;">
                    Bạn điền: <strong style="color: ${isItemCorrect ? '#16a34a' : (uVal ? '#dc2626' : '#64748b')}">${escapeHtml(uVal || 'Bỏ trống')}</strong>
                    ${isItemCorrect ? '<span style="color: #16a34a; font-weight: 700; margin-left: 6px;">✓ Đúng</span>' : `<span style="color: #dc2626; font-weight: 700; margin-left: 6px;">✗ Sai</span> (Đáp án đúng: <strong style="color: #16a34a;">${escapeHtml(accepted.join(' / '))}</strong>)`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (q.type === 'matching') {
        const pairs = q.pairs || [];
        const uAnsObj = (typeof item.userAnswer === 'object' && item.userAnswer !== null) ? item.userAnswer : {};
        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            ${pairs.map((p, idx) => {
              const pairId = p.id || `pair-${idx + 1}`;
              const matchedRightId = uAnsObj[pairId];
              const matchedRight = pairs.find(it => (it.id || `pair-${idx + 1}`) === matchedRightId);
              const isPairCorrect = matchedRightId === pairId;
              return `
                <div style="font-size: 13.5px; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div style="font-weight: 600; color: #334155;">${idx + 1}. ${escapeHtml(p.left)}</div>
                  <div style="margin-top: 4px; font-size: 13px;">
                    Ghép: <strong style="color: ${isPairCorrect ? '#16a34a' : (matchedRight ? '#dc2626' : '#64748b')}">${escapeHtml(matchedRight ? matchedRight.right : 'Chưa ghép')}</strong>
                    ${isPairCorrect ? '<span style="color: #16a34a; font-weight: 700; margin-left: 6px;">✓ Đúng</span>' : `<span style="color: #dc2626; font-weight: 700; margin-left: 6px;">✗ Sai</span> (Đúng: <strong style="color: #16a34a;">${escapeHtml(p.right)}</strong>)`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (q.type === 'table_completion' || q.rows) {
        const rows = q.rows || [];
        const uAnsObj = (typeof item.userAnswer === 'object' && item.userAnswer !== null) ? item.userAnswer : {};
        const inputCells = [];
        rows.forEach((r, rIdx) => {
          (r || []).forEach((c, cIdx) => {
            if (c && c.isInput) {
              inputCells.push({ ...c, id: c.id || `cell-${rIdx + 1}-${cIdx + 1}` });
            }
          });
        });
        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
            ${inputCells.map(c => {
              const uVal = isUnanswered ? '' : (uAnsObj[c.id] || '');
              const accepted = c.acceptedAnswers || (c.acceptedAnswer ? [c.acceptedAnswer] : []);
              const normUser = String(uVal || '').trim().replace(/\s+/g, ' ').toLowerCase();
              const normAccepted = accepted.map(a => String(a || '').trim().replace(/\s+/g, ' ').toLowerCase());
              const isCellCorrect = normUser !== '' && normAccepted.includes(normUser);
              return `
                <div style="font-size: 13.5px; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  <div style="font-weight: 600; color: #334155;">${escapeHtml(c.placeholder || c.id)}</div>
                  <div style="margin-top: 4px; font-size: 13px;">
                    Bạn điền: <strong style="color: ${isCellCorrect ? '#16a34a' : (uVal ? '#dc2626' : '#64748b')}">${escapeHtml(uVal || 'Bỏ trống')}</strong>
                    ${isCellCorrect ? '<span style="color: #16a34a; font-weight: 700; margin-left: 6px;">✓ Đúng</span>' : `<span style="color: #dc2626; font-weight: 700; margin-left: 6px;">✗ Sai</span> (Đúng: <strong style="color: #16a34a;">${escapeHtml(accepted.join(' / '))}</strong>)`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (q.items) {
        const itemResults = item.evaluation?.itemResults || q.items.map(it => ({
          order: it.order,
          statement: it.statement,
          correctAnswer: it.correctAnswer,
          userAnswer: isUnanswered ? null : (item.userAnswer ? item.userAnswer[it.order] : null),
          isCorrect: isUnanswered ? false : (item.userAnswer && item.userAnswer[it.order] === it.correctAnswer)
        }));

        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${itemResults.map(r => `
              <div style="font-size: 13.5px; display: flex; align-items: center; justify-content: space-between; background: white; padding: 6px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <span>${r.order}. ${escapeHtml(r.statement)}</span>
                <span>Bạn chọn: <strong>${escapeHtml(r.userAnswer || 'Chưa chọn')}</strong> | Đúng: <strong style="color: #16a34a;">${escapeHtml(r.correctAnswer)}</strong></span>
              </div>
            `).join('')}
          </div>
          ${isUnanswered ? '<div style="margin-top: 8px; font-size: 13px; color: #64748b; font-style: italic;">Bạn đã bỏ trống câu này (chưa đánh giá nhận định nào).</div>' : ''}
        `;
      } else if (q.pairs) {
        const pairResults = item.evaluation?.pairResults || q.pairs.map((p, idx) => ({
          id: p.id || `pair-${idx + 1}`,
          prompt: p.prompt,
          correctAnswer: p.correctAnswer,
          userAnswer: isUnanswered ? null : (item.userAnswer ? item.userAnswer[p.id || `pair-${idx + 1}`] : null),
          isCorrect: isUnanswered ? false : (item.userAnswer && item.userAnswer[p.id || `pair-${idx + 1}`] === p.correctAnswer)
        }));

        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${pairResults.map(p => `
              <div style="font-size: 13.5px; background: white; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <div>${escapeHtml(p.prompt)}</div>
                <div style="margin-top: 4px; color: ${p.isCorrect ? '#16a34a' : (p.userAnswer ? '#dc2626' : '#64748b')}; font-weight: 600;">
                  ➔ Ghép: [${escapeHtml(p.userAnswer || 'Chưa ghép')}] ${p.isCorrect ? '✓ Đúng' : `➔ Đáp án đúng: [${escapeHtml(p.correctAnswer)}]`}
                </div>
              </div>
            `).join('')}
          </div>
          ${isUnanswered ? '<div style="margin-top: 8px; font-size: 13px; color: #64748b; font-style: italic;">Bạn đã bỏ trống câu này (chưa ghép thẻ nào).</div>' : ''}
        `;
      } else if (q.columns) {
        const colResults = item.evaluation?.colResults || q.columns.map(col => ({
          colId: col.id,
          title: col.title,
          correctItems: col.correctItems || [],
          userItems: isUnanswered ? [] : ((item.userAnswer && item.userAnswer[col.id]) || []),
          isCorrect: false
        }));

        answersComparisonHtml = `
          <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
            ${colResults.map(col => `
              <div style="font-size: 13.5px; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 700; margin-bottom: 6px; color: ${col.isCorrect ? '#16a34a' : '#dc2626'};">
                  ${escapeHtml(col.title)} ${col.isCorrect ? '✓ Đúng' : (isUnanswered ? '' : '✗ Chưa đúng')}
                </div>
                <div style="font-size: 12.5px; color: #475569; margin-bottom: 4px;">
                  Bạn chọn: <strong>${col.userItems && col.userItems.length ? escapeHtml(col.userItems.join(', ')) : 'Chưa xếp mục nào'}</strong>
                </div>
                <div style="font-size: 12.5px; color: #16a34a;">
                  Đáp án đúng: <strong>${escapeHtml((col.correctItems || []).join(', '))}</strong>
                </div>
              </div>
            `).join('')}
          </div>
          ${isUnanswered ? '<div style="margin-top: 8px; font-size: 13px; color: #64748b; font-style: italic;">Bạn đã bỏ trống câu này (chưa phân loại mục nào).</div>' : ''}
        `;
      }

      let explanationHtml = '';
      if (q.explanation) {
        explanationHtml = `
          <div style="margin-top: 10px; padding: 10px 14px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; font-size: 13.5px; color: #1e3a8a;">
            <strong>💡 Lời giải &amp; Ghi chú:</strong> ${escapeHtml(q.explanation)}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="review-item-header">
          <span style="font-weight: 800; font-size: 15px; color: #0f172a;">Câu ${q.sessionNumber || (item.questionIndex + 1)}:</span>
          ${statusBadge}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${escapeHtml(q.content)}</div>
        ${answersComparisonHtml}
        ${explanationHtml}
      `;

      listContainer.appendChild(card);
    });
  }

  // --- Question Drawer Grid ---
  openDrawer() {
    this.drawerGrid.innerHTML = '';
    const state = {
      questions: this.quizEngine.questions,
      currentIndex: this.quizEngine.currentIndex,
      flaggedQuestions: Array.from(this.quizEngine.flaggedQuestions),
      checkedQuestions: Array.from(this.quizEngine.checkedQuestions),
      userAnswers: this.quizEngine.userAnswers,
      isSubmitted: this.quizEngine.isSubmitted
    };

    state.questions.forEach((q, idx) => {
      const bubble = document.createElement('div');
      bubble.className = 'q-bubble';
      bubble.textContent = q.sessionNumber || (idx + 1);

      if (idx === state.currentIndex) bubble.classList.add('active');
      if (state.flaggedQuestions.includes(q.id)) bubble.classList.add('flagged');
      if (this.quizEngine.hasAnswered(q.id)) bubble.classList.add('answered');

      bubble.addEventListener('click', () => {
        this.quizEngine.goToQuestion(idx);
        this.closeDrawer();
      });

      this.drawerGrid.appendChild(bubble);
    });

    this.drawerModal.style.display = 'flex';
  }

  closeDrawer() {
    this.drawerModal.style.display = 'none';
  }

  // --- Event Listeners Setup ---
  setupEventListeners() {
    // Top Bar Buttons
    this.btnGotoHome.addEventListener('click', () => {
      if (this.currentScreen === 'quiz' && !this.quizEngine.isSubmitted) {
        if (!confirm('Bạn có chắc muốn thoát bài ôn luyện hiện tại và quay về trang chủ?')) {
          return;
        }
        store.clearActiveSession();
        this.quizEngine.clearTimer();
      }
      this.switchScreen('home');
    });

    this.btnGotoAdmin.addEventListener('click', () => {
      if (this.currentScreen === 'quiz' && !this.quizEngine.isSubmitted) {
        if (!confirm('Bạn có chắc muốn tạm dừng bài làm để mở trang quản trị?')) {
          return;
        }
      }
      this.switchScreen('admin');
    });

    this.topSubmitBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn nộp bài kiểm tra ngay bây giờ?')) {
        this.quizEngine.submitQuiz(false);
      }
    });

    // Quiz Flag checkbox
    this.flagReviewContainer.addEventListener('click', () => {
      const q = this.quizEngine.getCurrentQuestion();
      if (q) {
        this.quizEngine.toggleFlag(q.id);
      }
    });

    // Quiz Navigation Buttons
    this.btnPrevQ.addEventListener('click', () => {
      this.quizEngine.prevQuestion();
    });

    this.btnNextQ.addEventListener('click', () => {
      if (this.quizEngine.currentIndex === this.quizEngine.questions.length - 1) {
        if (confirm('Bạn đã đến câu cuối cùng. Bạn có muốn nộp bài kiểm tra ngay không?')) {
          this.quizEngine.submitQuiz(false);
        }
      } else {
        this.quizEngine.nextQuestion();
      }
    });

    this.btnCheckInstant.addEventListener('click', () => {
      this.quizEngine.checkCurrentQuestion();
    });

    this.btnOpenDrawer.addEventListener('click', () => {
      this.openDrawer();
    });

    document.getElementById('btn-close-drawer').addEventListener('click', () => {
      this.closeDrawer();
    });

    // Mode Selector Modal Card options
    document.querySelectorAll('.mode-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.dataset.mode;
        sounds.playClick();

        const chkShuffleQ = document.getElementById('cfg-shuffle-questions');
        const chkShuffleOpt = document.getElementById('cfg-shuffle-options');
        const selCount = document.getElementById('cfg-question-count');

        if (this.selectedMode === 'random') {
          if (chkShuffleQ) chkShuffleQ.checked = true;
          if (chkShuffleOpt) chkShuffleOpt.checked = true;
        } else if (this.selectedMode === 'random_50') {
          if (chkShuffleQ) chkShuffleQ.checked = true;
          if (chkShuffleOpt) chkShuffleOpt.checked = true;
          if (selCount) selCount.value = '50';
        } else if (this.selectedMode === 'quick') {
          if (chkShuffleQ) chkShuffleQ.checked = true;
          if (selCount) selCount.value = '10';
        } else if (this.selectedMode === 'exam') {
          if (chkShuffleQ) chkShuffleQ.checked = true;
          if (chkShuffleOpt) chkShuffleOpt.checked = true;
        }
      });
    });

    document.getElementById('btn-close-mode-modal').addEventListener('click', () => {
      this.closeModeSelector();
    });

    document.getElementById('btn-start-selected-mode').addEventListener('click', () => {
      this.closeModeSelector();
      const shuffleQuestions = document.getElementById('cfg-shuffle-questions')?.checked ?? true;
      const shuffleOptions = document.getElementById('cfg-shuffle-options')?.checked ?? true;
      const questionFilter = document.getElementById('cfg-question-filter')?.value || 'all';
      const questionCount = document.getElementById('cfg-question-count')?.value || 'all';

      const isRandom50 = this.selectedMode === 'random_50' || questionCount === '50';

      this.startQuizSession({
        exerciseId: isRandom50 && this.selectedExerciseId !== 'random_50' && this.selectedExerciseId !== 'all'
          ? this.selectedExerciseId
          : (isRandom50 ? 'random_50' : this.selectedExerciseId),
        mode: this.selectedMode,
        isRandom50,
        shuffleQuestions,
        shuffleOptions,
        questionFilter,
        questionCount: isRandom50 && questionCount === 'all' ? 50 : questionCount
      });
    });

    // Result Screen Buttons
    document.getElementById('btn-retry-same-quiz').addEventListener('click', () => {
      if (this.lastQuizConfig) {
        this.startQuizSession(this.lastQuizConfig);
      } else if (this.lastResultSummary && this.lastResultSummary.exercise) {
        this.startQuizSession({
          exerciseId: this.lastResultSummary.exercise.id,
          mode: this.lastResultSummary.mode
        });
      } else {
        this.switchScreen('home');
      }
    });

    document.getElementById('btn-retry-wrong-only').addEventListener('click', () => {
      this.startQuizSession({
        exerciseId: 'wrong_only',
        mode: 'wrong_only'
      });
    });

    document.getElementById('btn-result-back-home').addEventListener('click', () => {
      this.switchScreen('home');
    });

    // Result filter tabs
    document.querySelectorAll('.review-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.review-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sounds.playClick();
        this.renderResultQuestionsList(btn.dataset.filter);
      });
    });
  }
}

// Instantiate on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
  });
}
