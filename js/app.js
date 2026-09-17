/**
 * Main Application Orchestrator
 */
import { store } from './store.js';
import { sounds } from './audio.js';
import { QuizEngine } from './quizEngine.js';
import { DragDropEngine } from './dragDropEngine.js';
import { AdminEngine } from './adminEngine.js';

class App {
  constructor() {
    this.currentScreen = 'home';
    this.selectedExerciseId = 'bai-1';
    this.selectedMode = 'all';
    this.quizEngine = null;
    this.dragDropEngine = null;
    this.adminEngine = null;
    this.lastResultSummary = null;
    this.resultFilter = 'all';

    this.init();
  }

  init() {
    this.bindDOM();
    this.initEngines();
    this.renderHome();
    this.setupEventListeners();
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

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Home Screen Rendering ---
  renderHome() {
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

      const badgeClasses = ['ex-badge-bai1', 'ex-badge-bai2', 'ex-badge-bai3', 'ex-badge-bai4', 'ex-badge-bai5'];
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
  openModeSelector(exerciseId, exerciseTitle) {
    this.selectedExerciseId = exerciseId;
    document.getElementById('mode-modal-title').textContent = `Ôn luyện: ${exerciseTitle}`;
    this.modeModal.style.display = 'flex';
  }

  closeModeSelector() {
    this.modeModal.style.display = 'none';
  }

  startQuizSession(config) {
    try {
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
    if (q.instructionNote || q.type === 'multiple_choice') {
      const noteText = q.instructionNote || (q.type === 'multiple_choice' ? 'Sinh viên chọn 2 hoặc nhiều phương án đúng' : '');
      this.instructionBadgeContainer.innerHTML = `
        <div class="instruction-badge">
          <span class="instruction-badge-icon">i</span>
          <span>${noteText}</span>
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

  renderQuestionAnswers(question, state) {
    this.quizAnswersContainer.innerHTML = '';
    const userAnswer = state.userAnswers[question.id];
    const isChecked = state.checkedQuestions.includes(question.id) || state.isSubmitted;

    // Evaluate if checked
    let evalRes = null;
    if (isChecked) {
      evalRes = this.quizEngine.evaluateQuestion(question, userAnswer);
    }

    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      const isMulti = question.type === 'multiple_choice';
      const grid = document.createElement('div');
      grid.className = 'options-grid-container';

      const userSelectedKeys = isMulti 
        ? (Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []))
        : [userAnswer];

      (question.options || []).forEach(opt => {
        const isSelected = userSelectedKeys.includes(opt.key);
        
        const optionRow = document.createElement('div');
        optionRow.className = 'answer-option-row';

        const keyLabel = document.createElement('span');
        keyLabel.className = 'option-key-label';
        keyLabel.textContent = opt.key;

        const card = document.createElement('div');
        card.className = `answer-card ${isMulti ? 'multiple' : ''} ${isSelected ? 'selected' : ''}`;

        // Color coding if evaluated
        if (isChecked && evalRes) {
          if (opt.isCorrect) {
            card.classList.add('eval-correct');
          } else if (isSelected && !opt.isCorrect) {
            card.classList.add('eval-wrong');
          }
        }

        card.innerHTML = `
          <span class="option-input-indicator"></span>
          <span class="option-content-text">${opt.content}</span>
        `;

        card.addEventListener('click', () => {
          if (state.isSubmitted) return;

          if (isMulti) {
            let nextKeys = [...userSelectedKeys];
            if (nextKeys.includes(opt.key)) {
              nextKeys = nextKeys.filter(k => k !== opt.key);
            } else {
              nextKeys.push(opt.key);
            }
            this.quizEngine.setAnswer(question.id, nextKeys);
          } else {
            this.quizEngine.setAnswer(question.id, opt.key);
          }
        });

        optionRow.appendChild(keyLabel);
        optionRow.appendChild(card);
        grid.appendChild(optionRow);
      });

      this.quizAnswersContainer.appendChild(grid);

    } else if (question.type === 'true_false_group') {
      const container = document.createElement('div');
      container.className = 'tf-group-container';
      const currentTF = userAnswer || {};

      (question.items || []).forEach(it => {
        const userChoice = currentTF[it.order];
        const row = document.createElement('div');
        row.className = 'tf-item-row';

        if (isChecked && evalRes && evalRes.itemResults) {
          const itRes = evalRes.itemResults.find(r => r.order === it.order);
          if (itRes) {
            row.classList.add(itRes.isCorrect ? 'eval-correct' : 'eval-wrong');
          }
        }

        row.innerHTML = `
          <div class="tf-item-statement">
            <span class="tf-num">${it.order}.</span>
            <span>${it.statement}</span>
          </div>
          <div class="tf-buttons-group">
            <button class="btn-tf btn-tf-true ${userChoice === 'Đúng' ? 'selected-true' : ''}" data-ans="Đúng">Đúng</button>
            <button class="btn-tf btn-tf-false ${userChoice === 'Sai' ? 'selected-false' : ''}" data-ans="Sai">Sai</button>
          </div>
        `;

        row.querySelector('.btn-tf-true').addEventListener('click', () => {
          if (state.isSubmitted) return;
          sounds.playClick();
          const nextTF = { ...currentTF, [it.order]: 'Đúng' };
          this.quizEngine.setAnswer(question.id, nextTF);
        });

        row.querySelector('.btn-tf-false').addEventListener('click', () => {
          if (state.isSubmitted) return;
          sounds.playClick();
          const nextTF = { ...currentTF, [it.order]: 'Sai' };
          this.quizEngine.setAnswer(question.id, nextTF);
        });

        container.appendChild(row);
      });

      this.quizAnswersContainer.appendChild(container);

    } else if (question.type === 'drag_drop' || question.type === 'drag_drop_columns') {
      const ddMount = document.createElement('div');
      ddMount.id = 'dd-interactive-mount';
      this.quizAnswersContainer.appendChild(ddMount);

      this.dragDropEngine = new DragDropEngine(ddMount, (updatedState) => {
        sounds.playClick();
        this.quizEngine.setAnswer(question.id, updatedState);
      });

      this.dragDropEngine.render(question, userAnswer);
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
    const percent = summary.percentage;
    document.getElementById('result-percent-text').textContent = `${percent}%`;
    
    // Animate Circle Gauge
    const circle = document.getElementById('gauge-score-circle');
    const circumference = 2 * Math.PI * 50; // ~314.16
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    circle.className = `gauge-val ${percent < 50 ? 'score-low' : (percent < 80 ? 'score-mid' : 'score-high')}`;

    // Headline & Subhead
    const headline = document.getElementById('result-headline');
    const subhead = document.getElementById('result-subhead');
    if (percent >= 90) {
      headline.textContent = 'Xuất Sắc! Bạn Đã Nắm Rất Vững Kiến Thức';
      subhead.textContent = `Bạn đã hoàn thành ${summary.totalQuestions} câu với điểm số gần như tuyệt đối!`;
    } else if (percent >= 70) {
      headline.textContent = 'Rất Tốt! Bạn Đã Đạt Chuẩn';
      subhead.textContent = `Cố gắng ôn lại một số câu chưa chính xác bên dưới để đạt điểm tối đa nhé.`;
    } else {
      headline.textContent = 'Cần Cố Gắng Thêm!';
      subhead.textContent = `Hãy nhấn nút "Ôn lại các câu sai" bên dưới để củng cố lại các câu chưa làm đúng.`;
    }

    // Metrics
    const score10 = (summary.score / (summary.maxScore || 1) * 10).toFixed(1);
    document.getElementById('metric-score-val').textContent = `${score10}/10`;
    document.getElementById('metric-correct-val').textContent = summary.correctCount;
    document.getElementById('metric-wrong-val').textContent = summary.wrongCount;

    const mins = Math.floor(summary.timeSpentSeconds / 60);
    const secs = summary.timeSpentSeconds % 60;
    document.getElementById('metric-time-val').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Retry Wrong button state
    const btnRetryWrong = document.getElementById('btn-retry-wrong-only');
    if (summary.wrongCount > 0) {
      btnRetryWrong.style.display = 'flex';
      btnRetryWrong.textContent = `Ôn lại ${summary.wrongCount} câu làm sai`;
    } else {
      btnRetryWrong.style.display = 'none';
    }

    // Counts on filter tabs
    document.getElementById('filter-all-cnt').textContent = summary.totalQuestions;
    document.getElementById('filter-wrong-cnt').textContent = summary.wrongCount;
    document.getElementById('filter-correct-cnt').textContent = summary.correctCount;

    this.renderResultQuestionsList('all');
  }

  renderResultQuestionsList(filter = 'all') {
    this.resultFilter = filter;
    const listContainer = document.getElementById('review-items-list');
    listContainer.innerHTML = '';

    if (!this.lastResultSummary) return;

    let items = this.lastResultSummary.results;
    if (filter === 'wrong') {
      items = items.filter(it => !it.isCorrect);
    } else if (filter === 'correct') {
      items = items.filter(it => it.isCorrect);
    }

    if (items.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 24px;">Không có câu hỏi nào trong mục này.</div>`;
      return;
    }

    items.forEach((item) => {
      const q = item.question;
      const card = document.createElement('div');
      card.className = `review-item-card ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;

      let answersComparisonHtml = '';
      if (q.options) {
        answersComparisonHtml = `
          <div class="admin-options-preview" style="margin-top: 10px;">
            ${q.options.map(opt => {
              const isUserPick = Array.isArray(item.userAnswer) ? item.userAnswer.includes(opt.key) : item.userAnswer === opt.key;
              const isCorrectOpt = opt.isCorrect;
              return `
                <div class="admin-opt-item ${isCorrectOpt ? 'is-correct-opt' : ''}">
                  <span class="opt-tag">${opt.key}.</span>
                  <span class="opt-text">${opt.content}</span>
                  ${isUserPick ? '<span style="font-size: 11px; font-weight: 700; color: #2563eb; margin-left: auto;">[Bạn chọn]</span>' : ''}
                  ${isCorrectOpt ? '<span class="correct-badge">✓ Đáp án đúng</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (item.evaluation && item.evaluation.itemResults) {
        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${item.evaluation.itemResults.map(r => `
              <div style="font-size: 13.5px; display: flex; align-items: center; justify-content: space-between; background: white; padding: 6px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <span>${r.order}. ${r.statement}</span>
                <span>Bạn chọn: <strong>${r.userAnswer || 'Chưa chọn'}</strong> | Đúng: <strong style="color: #16a34a;">${r.correctAnswer}</strong></span>
              </div>
            `).join('')}
          </div>
        `;
      } else if (item.evaluation && item.evaluation.pairResults) {
        answersComparisonHtml = `
          <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            ${item.evaluation.pairResults.map(p => `
              <div style="font-size: 13.5px; background: white; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <div>${p.prompt}</div>
                <div style="margin-top: 4px; color: ${p.isCorrect ? '#16a34a' : '#dc2626'}; font-weight: 600;">
                  ➔ Ghép: [${p.userAnswer || 'Chưa ghép'}] ${p.isCorrect ? '✓ Đúng' : `➔ Đáp án đúng: [${p.correctAnswer}]`}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="review-item-header">
          <span style="font-weight: 800; font-size: 15px; color: #0f172a;">Câu ${q.sessionNumber || (item.questionIndex + 1)}:</span>
          <span class="review-status-badge ${item.isCorrect ? 'correct' : 'wrong'}">
            ${item.isCorrect ? 'Chính xác (+1 điểm)' : 'Chưa đúng (0 điểm)'}
          </span>
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${q.content}</div>
        ${answersComparisonHtml}
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
      });
    });

    document.getElementById('btn-close-mode-modal').addEventListener('click', () => {
      this.closeModeSelector();
    });

    document.getElementById('btn-start-selected-mode').addEventListener('click', () => {
      this.closeModeSelector();
      this.startQuizSession({
        exerciseId: this.selectedExerciseId,
        mode: this.selectedMode
      });
    });

    // Result Screen Buttons
    document.getElementById('btn-retry-same-quiz').addEventListener('click', () => {
      if (this.lastResultSummary && this.lastResultSummary.exercise) {
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
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
