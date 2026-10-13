/**
 * Admin Management Engine (CMS)
 * Manage questions, edit red answers, fix needs_review questions, add/delete, export/import JSON
 */
import { store } from './store.js';
import { INITIAL_QUIZ_DATA } from './data.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class AdminEngine {
  constructor(containerEl, onDataUpdated) {
    this.container = containerEl;
    this.onDataUpdated = onDataUpdated || (() => {});
    this.currentExerciseId = 'bai-1';
    this.filterNeedsReview = false;
    this.searchKeyword = '';
    this.editingQuestion = null;
  }

  render() {
    this.container.innerHTML = '';

    const exercises = store.getExercises();
    const currentEx = exercises.find(e => e.id === this.currentExerciseId) || exercises[0];

    // Filter questions
    let questions = currentEx ? currentEx.questions : [];
    if (this.filterNeedsReview) {
      questions = questions.filter(q => q.needsReview);
    }
    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      questions = questions.filter(q => 
        q.content.toLowerCase().includes(kw) || 
        q.header.toLowerCase().includes(kw) ||
        (q.options && q.options.some(o => o.content.toLowerCase().includes(kw)))
      );
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'admin-cms-wrapper';

    // Header Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'admin-toolbar';
    toolbar.innerHTML = `
      <div class="admin-toolbar-left">
        <h2 class="admin-title">Quản Trị & Chỉnh Sửa Ngân Hàng Câu Hỏi</h2>
        <p class="admin-desc">Chỉnh sửa nội dung, phương án, đáp án đúng (tô đỏ), thêm/xóa câu hỏi và quản lý dữ liệu ôn luyện.</p>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn-admin btn-backup" id="btn-export-json">Xuất JSON</button>
        <label class="btn-admin btn-restore" for="input-import-json">
          Nhập JSON
          <input type="file" id="input-import-json" accept=".json" style="display:none;">
        </label>
        <button class="btn-admin btn-danger" id="btn-reset-default">Khôi Phục Gốc (Docx)</button>
      </div>
    `;

    // Filters and Exercise Selector
    const filtersBar = document.createElement('div');
    filtersBar.className = 'admin-filters-bar';

    let exerciseTabsHtml = exercises.map(ex => {
      const reviewCount = ex.questions.filter(q => q.needsReview).length;
      return `
        <button class="admin-tab-btn ${ex.id === this.currentExerciseId ? 'active' : ''}" data-ex-id="${ex.id}">
          ${ex.title} (${ex.questions.length} câu)
          ${reviewCount > 0 ? `<span class="review-badge-pill">${reviewCount} cần duyệt</span>` : ''}
        </button>
      `;
    }).join('');

    filtersBar.innerHTML = `
      <div class="admin-exercise-tabs">
        ${exerciseTabsHtml}
      </div>
      <div class="admin-search-group">
        <input type="text" id="admin-search-input" class="admin-search-input" placeholder="Tìm kiếm câu hỏi..." value="${this.searchKeyword}">
        <label class="admin-checkbox-label">
          <input type="checkbox" id="admin-filter-review" ${this.filterNeedsReview ? 'checked' : ''}>
          <span>Chỉ xem câu cần duyệt (needs_review)</span>
        </label>
        <button class="btn-admin btn-primary" id="btn-add-new-q">+ Thêm câu hỏi mới</button>
      </div>
    `;

    // Questions List Table / Cards
    const listSection = document.createElement('div');
    listSection.className = 'admin-questions-list';

    if (questions.length === 0) {
      listSection.innerHTML = `
        <div class="admin-empty-state">
          <p>Không tìm thấy câu hỏi nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      `;
    } else {
      questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `admin-q-card ${q.needsReview ? 'needs-review' : ''}`;
        
        let typeLabel = 'Trắc nghiệm 1 đáp án';
        if (q.type === 'multiple_choice') typeLabel = 'Chọn nhiều đáp án';
        else if (q.type === 'fill_blank') typeLabel = 'Điền từ vào chỗ trống';
        else if (q.type === 'matching') typeLabel = 'Nối cột khái niệm';
        else if (q.type === 'table_completion') typeLabel = 'Điền đáp án vào bảng';
        else if (q.type === 'true_false_group') typeLabel = 'Đúng / Sai theo nhóm';
        else if (q.type === 'drag_drop') typeLabel = 'Kéo thả điền khuyết';
        else if (q.type === 'drag_drop_columns') typeLabel = 'Kéo thả phân loại cột';

        let answersPreviewHtml = '';
        if (q.options) {
          answersPreviewHtml = `
            <div class="admin-options-preview">
              ${q.options.map(opt => `
                <div class="admin-opt-item ${opt.isCorrect ? 'is-correct-opt' : ''}">
                  <span class="opt-tag">${opt.key}.</span>
                  <span class="opt-text">${escapeHtml(opt.content)}</span>
                  ${opt.isCorrect ? '<span class="correct-badge">✓ Đáp án đúng (Đỏ)</span>' : ''}
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.type === 'fill_blank' || q.blanks) {
          answersPreviewHtml = `
            <div class="admin-tf-preview">
              ${(q.blanks || []).map(b => `
                <div class="admin-tf-row">
                  <span class="tf-num">${b.order}.</span>
                  <span class="tf-stmt">${escapeHtml(b.label || 'Chỗ trống')}</span>
                  <span class="tf-ans ans-true">${escapeHtml((b.acceptedAnswers || []).join(', '))}</span>
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.type === 'matching') {
          answersPreviewHtml = `
            <div class="admin-dd-preview">
              ${(q.pairs || []).map(p => `
                <div class="admin-dd-row">
                  <span class="dd-p-prompt">${escapeHtml(p.left)}</span>
                  <span class="dd-p-ans">➔ [${escapeHtml(p.right)}]</span>
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.type === 'table_completion' || q.rows) {
          answersPreviewHtml = `
            <div class="admin-dd-preview">
              ${(q.rows || []).map(r => `
                <div class="admin-dd-row">
                  <span class="dd-p-prompt">${escapeHtml(r[0] ? r[0].text : '')}</span>
                  <span class="dd-p-ans">➔ [${escapeHtml(r[1] && r[1].acceptedAnswers ? r[1].acceptedAnswers.join(', ') : '')}]</span>
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.items) {
          answersPreviewHtml = `
            <div class="admin-tf-preview">
              ${q.items.map(it => `
                <div class="admin-tf-row">
                  <span class="tf-num">${it.order}.</span>
                  <span class="tf-stmt">${escapeHtml(it.statement)}</span>
                  <span class="tf-ans ${it.correctAnswer === 'Đúng' ? 'ans-true' : 'ans-false'}">${it.correctAnswer}</span>
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.pairs) {
          answersPreviewHtml = `
            <div class="admin-dd-preview">
              ${q.pairs.map(p => `
                <div class="admin-dd-row">
                  <span class="dd-p-prompt">${escapeHtml(p.prompt)}</span>
                  <span class="dd-p-ans">➔ [${escapeHtml(p.correctAnswer)}]</span>
                </div>
              `).join('')}
            </div>
          `;
        } else if (q.columns) {
          answersPreviewHtml = `
            <div class="admin-dd-cols-preview">
              ${q.columns.map(c => `
                <div class="dd-col-preview-item">
                  <strong>${escapeHtml(c.title)}</strong>
                  <ul>${(c.correctItems || []).map(ci => `<li>${escapeHtml(ci)}</li>`).join('')}</ul>
                </div>
              `).join('')}
            </div>
          `;
        }

        card.innerHTML = `
          <div class="admin-q-header">
            <div class="admin-q-meta">
              <span class="q-num-badge">Câu ${q.number}</span>
              <span class="q-type-badge">${typeLabel}</span>
              ${q.needsReview ? '<span class="q-alert-badge">Cần kiểm tra</span>' : ''}
            </div>
            <div class="admin-q-btns">
              <button class="btn-q-action btn-edit-q" data-id="${q.id}">Sửa</button>
              <button class="btn-q-action btn-delete-q" data-id="${q.id}">Xóa</button>
            </div>
          </div>
          <div class="admin-q-body">
            <h4 class="admin-q-content">${escapeHtml(q.content)}</h4>
            ${q.instructionNote ? `<div class="admin-q-note">${escapeHtml(q.instructionNote)}</div>` : ''}
            ${answersPreviewHtml}
          </div>
        `;

        card.querySelector('.btn-edit-q').addEventListener('click', () => {
          this.openEditModal(currentEx.id, q);
        });

        card.querySelector('.btn-delete-q').addEventListener('click', () => {
          if (confirm(`Bạn có chắc muốn xóa Câu ${q.number} không?`)) {
            store.deleteQuestion(currentEx.id, q.id);
            this.render();
            this.onDataUpdated();
          }
        });

        listSection.appendChild(card);
      });
    }

    wrapper.appendChild(toolbar);
    wrapper.appendChild(filtersBar);
    wrapper.appendChild(listSection);
    this.container.appendChild(wrapper);

    // Event Listeners for Filters & Actions
    filtersBar.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentExerciseId = btn.dataset.exId;
        this.render();
      });
    });

    const searchInput = filtersBar.querySelector('#admin-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchKeyword = e.target.value;
      this.render();
    });

    const filterReviewCheckbox = filtersBar.querySelector('#admin-filter-review');
    filterReviewCheckbox.addEventListener('change', (e) => {
      this.filterNeedsReview = e.target.checked;
      this.render();
    });

    toolbar.querySelector('#btn-export-json').addEventListener('click', () => {
      this.exportJsonFile();
    });

    toolbar.querySelector('#input-import-json').addEventListener('change', (e) => {
      this.importJsonFile(e.target.files[0]);
    });

    toolbar.querySelector('#btn-reset-default').addEventListener('click', () => {
      if (confirm('Khôi phục lại toàn bộ dữ liệu gốc từ các file docx? Mọi thay đổi chỉnh sửa thủ công sẽ được reset.')) {
        store.resetToDefault();
        this.render();
        this.onDataUpdated();
        alert('Đã khôi phục thành công toàn bộ dữ liệu câu hỏi gốc!');
      }
    });

    filtersBar.querySelector('#btn-add-new-q').addEventListener('click', () => {
      this.openAddNewModal(currentEx.id);
    });
  }

  // --- Modal for Adding / Editing Question ---
  openEditModal(exerciseId, question) {
    this.renderEditModal(exerciseId, question, false);
  }

  openAddNewModal(exerciseId) {
    const defaultNewQ = {
      id: `${exerciseId}-q${Date.now()}`,
      number: 99,
      type: 'single_choice',
      header: 'Câu hỏi mới:',
      content: '',
      instructionNote: '',
      options: [
        { key: 'A', content: '', isCorrect: true },
        { key: 'B', content: '', isCorrect: false },
        { key: 'C', content: '', isCorrect: false },
        { key: 'D', content: '', isCorrect: false }
      ],
      correctAnswers: ['A'],
      needsReview: false
    };
    this.renderEditModal(exerciseId, defaultNewQ, true);
  }

  renderEditModal(exerciseId, questionData, isNew = false) {
    const existingModal = document.getElementById('admin-edit-modal');
    if (existingModal) existingModal.remove();

    const q = JSON.parse(JSON.stringify(questionData));

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'admin-edit-modal';
    modalOverlay.className = 'admin-modal-overlay';

    modalOverlay.innerHTML = `
      <div class="admin-modal-dialog">
        <div class="admin-modal-header">
          <h3>${isNew ? 'Thêm Câu Hỏi Mới' : `Chỉnh Sửa Câu ${q.number}`}</h3>
          <button class="modal-close-btn" id="btn-close-edit-modal">×</button>
        </div>
        <div class="admin-modal-body">
          <div class="form-group">
            <label>Dạng câu hỏi:</label>
            <select id="edit-q-type" class="admin-select">
              <option value="single_choice" ${q.type === 'single_choice' ? 'selected' : ''}>Trắc nghiệm 1 đáp án đúng</option>
              <option value="multiple_choice" ${q.type === 'multiple_choice' ? 'selected' : ''}>Trắc nghiệm chọn nhiều đáp án</option>
              <option value="fill_blank" ${q.type === 'fill_blank' ? 'selected' : ''}>Điền từ vào chỗ trống</option>
              <option value="matching" ${q.type === 'matching' ? 'selected' : ''}>Nối cột khái niệm</option>
              <option value="table_completion" ${q.type === 'table_completion' ? 'selected' : ''}>Điền đáp án vào bảng</option>
              <option value="true_false_group" ${q.type === 'true_false_group' ? 'selected' : ''}>Đúng / Sai theo từng phát biểu</option>
              <option value="drag_drop" ${q.type === 'drag_drop' ? 'selected' : ''}>Kéo thả điền khuyết</option>
              <option value="drag_drop_columns" ${q.type === 'drag_drop_columns' ? 'selected' : ''}>Kéo thả phân loại cột</option>
            </select>
          </div>

          <div class="form-group">
            <label>Nội dung câu hỏi:</label>
            <textarea id="edit-q-content" class="admin-textarea" rows="3">${q.content}</textarea>
          </div>

          <div class="form-group">
            <label>Lời giải &amp; Ghi chú kiến thức:</label>
            <textarea id="edit-q-explanation" class="admin-textarea" rows="2" placeholder="Nhập lời giải hoặc kiến thức trọng tâm...">${q.explanation || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Gợi ý / Ghi chú (Ví dụ: "Sinh viên chọn 2 phương án đúng nhất"):</label>
            <input type="text" id="edit-q-note" class="admin-input" value="${q.instructionNote || ''}">
          </div>

          <div id="edit-options-container" class="form-group">
            <!-- Dynamic options fields based on type -->
          </div>

          <div class="form-group form-checkbox">
            <label>
              <input type="checkbox" id="edit-q-needs-review" ${q.needsReview ? 'checked' : ''}>
              <span>Đánh dấu cần kiểm tra lại (needs_review)</span>
            </label>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-secondary" id="btn-cancel-edit">Hủy bỏ</button>
          <button class="btn-admin btn-primary" id="btn-save-q">Lưu thay đổi</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const optionsContainer = modalOverlay.querySelector('#edit-options-container');
    const typeSelect = modalOverlay.querySelector('#edit-q-type');

    const updateOptionsUI = (type) => {
      if (type === 'single_choice' || type === 'multiple_choice') {
        const opts = q.options && q.options.length ? q.options : [
          { key: 'A', content: '', isCorrect: true },
          { key: 'B', content: '', isCorrect: false },
          { key: 'C', content: '', isCorrect: false },
          { key: 'D', content: '', isCorrect: false }
        ];

        optionsContainer.innerHTML = `
          <label>Các phương án & Đáp án đúng (Tô đỏ trong tài liệu):</label>
          <div class="edit-options-list">
            ${opts.map((opt, i) => `
              <div class="edit-opt-row">
                <span class="opt-label">${opt.key}</span>
                <input type="text" class="admin-input edit-opt-text" data-index="${i}" value="${opt.content.replace(/"/g, '&quot;')}" placeholder="Nội dung phương án ${opt.key}">
                <label class="correct-toggle-label">
                  <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}" name="correct-opt" class="edit-opt-correct" data-index="${i}" ${opt.isCorrect ? 'checked' : ''}>
                  <span>Đúng (Đỏ)</span>
                </label>
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'true_false_group') {
        const items = q.items && q.items.length ? q.items : [
          { order: 1, statement: '', correctAnswer: 'Đúng' },
          { order: 2, statement: '', correctAnswer: 'Đúng' },
          { order: 3, statement: '', correctAnswer: 'Sai' },
          { order: 4, statement: '', correctAnswer: 'Sai' }
        ];

        optionsContainer.innerHTML = `
          <label>Các phát biểu và lựa chọn Đúng / Sai:</label>
          <div class="edit-tf-list">
            ${items.map((it, i) => `
              <div class="edit-tf-row">
                <span class="tf-label">${it.order}.</span>
                <input type="text" class="admin-input edit-tf-stmt" data-index="${i}" value="${it.statement.replace(/"/g, '&quot;')}" placeholder="Nhận định ${it.order}">
                <select class="admin-select edit-tf-ans" data-index="${i}">
                  <option value="Đúng" ${it.correctAnswer === 'Đúng' ? 'selected' : ''}>Đúng</option>
                  <option value="Sai" ${it.correctAnswer === 'Sai' ? 'selected' : ''}>Sai</option>
                </select>
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'drag_drop') {
        const pairs = q.pairs && q.pairs.length ? q.pairs : [
          { id: 'pair-1', prompt: '', correctAnswer: '' },
          { id: 'pair-2', prompt: '', correctAnswer: '' },
          { id: 'pair-3', prompt: '', correctAnswer: '' }
        ];

        optionsContainer.innerHTML = `
          <label>Cặp phát biểu và từ điền đúng:</label>
          <div class="edit-dd-list">
            ${pairs.map((p, i) => `
              <div class="edit-dd-row">
                <input type="text" class="admin-input edit-dd-prompt" data-index="${i}" value="${p.prompt.replace(/"/g, '&quot;')}" placeholder="Phát biểu ${i+1} có chỗ trống _____">
                <span class="dd-arrow">➔</span>
                <input type="text" class="admin-input edit-dd-ans" data-index="${i}" value="${p.correctAnswer.replace(/"/g, '&quot;')}" placeholder="Đáp án đúng">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'fill_blank') {
        const blanks = (q.blanks && q.blanks.length) ? q.blanks : [
          { id: 'blank-1', order: 1, label: 'Chỗ trống 1', acceptedAnswers: ['1848'] }
        ];
        optionsContainer.innerHTML = `
          <label>Các chỗ trống & Đáp án đúng tương đương (ngăn cách bằng dấu phẩy):</label>
          <div class="edit-fb-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${blanks.map((b, i) => `
              <div class="edit-fb-row" style="display: flex; gap: 8px; align-items: center;">
                <span class="tf-label">${i+1}.</span>
                <input type="text" class="admin-input edit-fb-label" data-index="${i}" value="${(b.label || '').replace(/"/g, '&quot;')}" placeholder="Mô tả chỗ trống">
                <input type="text" class="admin-input edit-fb-answers" data-index="${i}" value="${((b.acceptedAnswers || []).join(', ')).replace(/"/g, '&quot;')}" placeholder="Đáp án đúng (ví dụ: 1848, năm 1848)">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'matching') {
        const pairs = (q.pairs && q.pairs.length) ? q.pairs : [
          { id: 'pair-1', left: 'Karl Marx', right: 'Tác phẩm Tuyên ngôn của Đảng Cộng sản' },
          { id: 'pair-2', left: 'Friedrich Engels', right: 'Đồng tác giả với Karl Marx' },
          { id: 'pair-3', left: 'Năm 1848', right: 'Năm ra đời của CNXHKH' }
        ];
        optionsContainer.innerHTML = `
          <label>Các cặp ghép đôi (Cột A ➔ Cột B):</label>
          <div class="edit-matching-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${pairs.map((p, i) => `
              <div class="edit-matching-row" style="display: flex; gap: 8px; align-items: center;">
                <input type="text" class="admin-input edit-match-left" data-index="${i}" value="${(p.left || '').replace(/"/g, '&quot;')}" placeholder="Cột A (Ví dụ: Karl Marx)">
                <span class="dd-arrow">➔</span>
                <input type="text" class="admin-input edit-match-right" data-index="${i}" value="${(p.right || '').replace(/"/g, '&quot;')}" placeholder="Cột B (Ví dụ: Tác phẩm Tuyên ngôn)">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'table_completion') {
        const headers = q.headers || ['Nội dung', 'Câu trả lời'];
        const rows = q.rows || [
          [{ text: 'Năm ra đời CNXH khoa học', isInput: false }, { isInput: true, id: 'cell-1', placeholder: 'Năm ra đời', acceptedAnswers: ['1848', 'năm 1848'] }],
          [{ text: 'Hai nhà sáng lập', isInput: false }, { isInput: true, id: 'cell-2', placeholder: 'Hai nhà sáng lập', acceptedAnswers: ['C.Mác và Ph.Ăngghen', 'Mác và Ăngghen'] }]
        ];
        const flatCells = [];
        rows.forEach((r, rIdx) => {
          (r || []).forEach((c, cIdx) => {
            if (c && c.isInput) {
              flatCells.push({ ...c, row: rIdx + 1, col: cIdx + 1 });
            }
          });
        });
        optionsContainer.innerHTML = `
          <label>Tiêu đề các cột bảng (ngăn cách bởi dấu phẩy):</label>
          <input type="text" class="admin-input edit-tbl-headers" value="${headers.join(', ').replace(/"/g, '&quot;')}" style="margin-bottom: 8px;">
          <label>Các ô cần điền trong bảng:</label>
          <div class="edit-tbl-cells-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${flatCells.map((c, i) => `
              <div class="edit-tbl-cell-row" style="display: flex; gap: 8px; align-items: center;">
                <span class="tf-label">Ô [${c.row},${c.col}]</span>
                <input type="text" class="admin-input edit-tbl-prompt" data-index="${i}" value="${(c.placeholder || c.id || '').replace(/"/g, '&quot;')}" placeholder="Mô tả ô">
                <input type="text" class="admin-input edit-tbl-answers" data-index="${i}" value="${((c.acceptedAnswers || []).join(', ')).replace(/"/g, '&quot;')}" placeholder="Đáp án đúng (ngăn cách phẩy)">
              </div>
            `).join('')}
          </div>
        `;
      } else if (type === 'drag_drop_columns') {
        const cols = q.columns && q.columns.length === 2 ? q.columns : [
          { id: 'col-1', title: 'Cột 1', correctItems: [] },
          { id: 'col-2', title: 'Cột 2', correctItems: [] }
        ];

        optionsContainer.innerHTML = `
          <label>Phân loại 2 cột (Nhập các mục của mỗi cột, mỗi dòng 1 mục):</label>
          <div class="edit-cols-list" style="display: flex; gap: 12px; margin-top: 8px;">
            ${cols.map((c, i) => `
              <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <input type="text" class="admin-input edit-col-title" data-index="${i}" value="${c.title.replace(/"/g, '&quot;')}" placeholder="Tiêu đề Cột ${i+1}">
                <textarea class="admin-textarea edit-col-items" data-index="${i}" rows="5" placeholder="Các mục đúng (mỗi dòng 1 mục)">${(c.correctItems || []).join('\n')}</textarea>
              </div>
            `).join('')}
          </div>
        `;
      }
    };

    updateOptionsUI(q.type);

    typeSelect.addEventListener('change', (e) => {
      q.type = e.target.value;
      updateOptionsUI(q.type);
    });

    // Close buttons
    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#btn-close-edit-modal').addEventListener('click', closeModal);
    modalOverlay.querySelector('#btn-cancel-edit').addEventListener('click', closeModal);

    // Save action
    modalOverlay.querySelector('#btn-save-q').addEventListener('click', () => {
      q.type = modalOverlay.querySelector('#edit-q-type').value;
      q.content = modalOverlay.querySelector('#edit-q-content').value.trim();
      q.instructionNote = modalOverlay.querySelector('#edit-q-note').value.trim();
      q.needsReview = modalOverlay.querySelector('#edit-q-needs-review').checked;

      if (q.type === 'single_choice' || q.type === 'multiple_choice') {
        const optInputs = modalOverlay.querySelectorAll('.edit-opt-text');
        const correctInputs = modalOverlay.querySelectorAll('.edit-opt-correct');
        const keys = ['A', 'B', 'C', 'D'];
        q.options = [];
        q.correctAnswers = [];

        optInputs.forEach((inp, idx) => {
          const isCorrect = correctInputs[idx].checked;
          const k = keys[idx] || String.fromCharCode(65 + idx);
          q.options.push({
            key: k,
            content: inp.value.trim(),
            isCorrect: isCorrect
          });
          if (isCorrect) q.correctAnswers.push(k);
        });
      } else if (q.type === 'true_false_group') {
        const stmtInputs = modalOverlay.querySelectorAll('.edit-tf-stmt');
        const ansSelects = modalOverlay.querySelectorAll('.edit-tf-ans');
        q.items = [];
        stmtInputs.forEach((inp, idx) => {
          q.items.push({
            order: idx + 1,
            statement: inp.value.trim(),
            correctAnswer: ansSelects[idx].value
          });
        });
      } else if (q.type === 'drag_drop') {
        const promptInputs = modalOverlay.querySelectorAll('.edit-dd-prompt');
        const ansInputs = modalOverlay.querySelectorAll('.edit-dd-ans');
        q.pairs = [];
        promptInputs.forEach((inp, idx) => {
          q.pairs.push({
            id: `pair-${idx + 1}`,
            prompt: inp.value.trim(),
            correctAnswer: ansInputs[idx].value.trim()
          });
        });
        q.optionsPool = q.pairs.map(p => p.correctAnswer);
      } else if (q.type === 'drag_drop_columns') {
        const titleInputs = modalOverlay.querySelectorAll('.edit-col-title');
        const itemsAreas = modalOverlay.querySelectorAll('.edit-col-items');
        q.columns = [];
        let allPool = [];
        titleInputs.forEach((inp, idx) => {
          const rawItems = itemsAreas[idx].value.split('\n').map(s => s.trim()).filter(Boolean);
          q.columns.push({
            id: `col-${idx + 1}`,
            title: inp.value.trim() || `Cột ${idx + 1}`,
            correctItems: rawItems
          });
          allPool = allPool.concat(rawItems);
        });
        q.optionsPool = allPool;
      } else if (q.type === 'fill_blank') {
        const labels = modalOverlay.querySelectorAll('.edit-fb-label');
        const ansList = modalOverlay.querySelectorAll('.edit-fb-answers');
        q.blanks = [];
        labels.forEach((inp, idx) => {
          const accepted = ansList[idx].value.split(',').map(s => s.trim()).filter(Boolean);
          q.blanks.push({
            id: `blank-${idx + 1}`,
            order: idx + 1,
            label: inp.value.trim() || `Chỗ trống ${idx + 1}`,
            acceptedAnswers: accepted.length ? accepted : ['']
          });
        });
      } else if (q.type === 'matching') {
        const lefts = modalOverlay.querySelectorAll('.edit-match-left');
        const rights = modalOverlay.querySelectorAll('.edit-match-right');
        q.pairs = [];
        lefts.forEach((inp, idx) => {
          q.pairs.push({
            id: `pair-${idx + 1}`,
            left: inp.value.trim(),
            right: rights[idx].value.trim()
          });
        });
      } else if (q.type === 'table_completion') {
        const headersInp = modalOverlay.querySelector('.edit-tbl-headers');
        const promptInps = modalOverlay.querySelectorAll('.edit-tbl-prompt');
        const ansInps = modalOverlay.querySelectorAll('.edit-tbl-answers');
        q.headers = headersInp ? headersInp.value.split(',').map(s => s.trim()).filter(Boolean) : ['Nội dung', 'Câu trả lời'];
        q.rows = [];
        promptInps.forEach((pInp, idx) => {
          const accepted = ansInps[idx].value.split(',').map(s => s.trim()).filter(Boolean);
          q.rows.push([
            { text: pInp.value.trim() || `Nội dung ${idx + 1}`, isInput: false },
            { isInput: true, id: `cell-${idx + 1}`, placeholder: 'Nhập câu trả lời...', acceptedAnswers: accepted.length ? accepted : [''] }
          ]);
        });
      }

      const explanationInp = modalOverlay.querySelector('#edit-q-explanation');
      if (explanationInp) {
        q.explanation = explanationInp.value.trim();
      }

      if (isNew) {
        store.addQuestion(exerciseId, q);
      } else {
        store.updateQuestion(exerciseId, q);
      }

      closeModal();
      this.render();
      this.onDataUpdated();
      alert('Đã lưu câu hỏi thành công!');
    });
  }

  // --- Export / Import JSON ---
  exportJsonFile() {
    const dataStr = store.exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngan_hang_cau_hoi_on_thi_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = store.importAllData(e.target.result);
      if (res.success) {
        alert('Nhập dữ liệu thành công!');
        this.render();
        this.onDataUpdated();
      } else {
        alert('Lỗi nhập dữ liệu: ' + res.error);
      }
    };
    reader.readAsText(file);
  }
}
