/**
 * Drag & Drop Engine supporting Desktop HTML5 Drag and Mobile Tap-to-Place
 * Supports both Standard (statement -> slot) and Multi-Columns categorization modes.
 * Supports instant check evaluation & answer feedback.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class DragDropEngine {
  constructor(containerEl, onAnswerChanged, options = {}) {
    this.container = containerEl;
    this.onAnswerChanged = onAnswerChanged;
    this.isReadOnly = Boolean(options.isReadOnly);
    this.isChecked = Boolean(options.isChecked);
    this.evalRes = options.evalRes || null;
    this.selectedChip = null; // for tap-to-place on mobile/click
    this.draggedValue = null; // for HTML5 drag
    this.draggedFrom = null; // slot id, col id, or 'pool'
  }

  render(question, savedState = null) {
    this.question = question;
    this.currentState = savedState ? JSON.parse(JSON.stringify(savedState)) : {}; // render never mutates saved answers
    this.container.innerHTML = '';

    if (question.type === 'drag_drop_columns') {
      this.renderColumnsMode();
    } else {
      this.renderStandardMode();
    }
  }

  // --- STANDARD MODE: Statement with blank slots on left, chips on right ---
  renderStandardMode() {
    const q = this.question;
    const pairs = q.pairs || [];
    const pool = [...(q.optionsPool || pairs.map(p => p.correctAnswer))];
    
    // Determine which chips are currently placed
    const placedValues = Object.values(this.currentState).filter(Boolean);
    const remainingPlaced = [...placedValues];
    const availablePool = pool.filter(chip => {
      const index = remainingPlaced.indexOf(chip);
      if (index === -1) return true;
      remainingPlaced.splice(index, 1);
      return false;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'dd-standard-wrapper';
    if (this.selectedChip) {
      wrapper.classList.add('has-selection');
    }

    // If checked/evaluated: show top summary banner
    if (this.isChecked && this.evalRes) {
      const banner = document.createElement('div');
      const isAllCorrect = this.evalRes.isCorrect;
      const correctCount = this.evalRes.correctPairs !== undefined 
        ? this.evalRes.correctPairs 
        : (this.evalRes.pairResults ? this.evalRes.pairResults.filter(p => p.isCorrect).length : 0);
      
      banner.className = `dd-eval-banner ${isAllCorrect ? 'eval-correct' : 'eval-wrong'}`;
      banner.innerHTML = `
        <div class="dd-eval-banner-header">
          <span class="dd-eval-icon">${isAllCorrect ? '✓' : '✗'}</span>
          <span class="dd-eval-title">${isAllCorrect ? 'Chính xác hoàn toàn!' : 'Chưa chính xác!'}</span>
          <span class="dd-eval-score">(Ghép đúng ${correctCount}/${pairs.length} vị trí)</span>
        </div>
        ${!isAllCorrect ? `<div class="dd-eval-note">Các vị trí chưa chính xác đã được đánh dấu đỏ kèm đáp án đúng đối chiếu bên dưới.</div>` : ''}
      `;
      wrapper.appendChild(banner);
    }

    // 1. TOP: Draggable Chips Pool (Below question, above statements)
    const poolCol = document.createElement('div');
    poolCol.className = 'dd-pool-col';

    const poolHeader = document.createElement('div');
    poolHeader.className = 'dd-pool-header';
    poolHeader.innerHTML = `<span>Các thẻ đáp án (Kéo hoặc chạm để chọn):</span>`;
    poolCol.appendChild(poolHeader);

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'dd-chips-container';

    if (availablePool.length === 0) {
      chipsContainer.innerHTML = `<div class="dd-empty-pool"><span style="color: #16a34a; font-weight: 700; margin-right: 6px;">✓</span>Đã xếp hết tất cả các thẻ vào vị trí!</div>`;
    } else {
      availablePool.forEach((chipText) => {
        const chip = document.createElement('div');
        const isSelected = this.selectedChip === chipText;
        chip.className = `dd-chip ${isSelected ? 'selected' : ''}`;
        chip.draggable = !this.isReadOnly;
        chip.dataset.value = chipText;
        chip.innerHTML = `<span class="chip-text">${escapeHtml(chipText)}</span>`;

        if (!this.isReadOnly) {
          this.attachChipDragEvents(chip, chipText, 'pool');
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChipSelection(chipText);
          });
        }

        chipsContainer.appendChild(chip);
      });
    }

    poolCol.appendChild(chipsContainer);
    if (!this.isReadOnly) {
      this.attachPoolDropEvents(poolCol);
    }

    // 2. BOTTOM: Statements list with drop slots
    const statementsCol = document.createElement('div');
    statementsCol.className = 'dd-statements-col';

    pairs.forEach((pair, idx) => {
      const targetId = pair.id || `pair-${idx + 1}`;
      const placedVal = this.currentState[targetId] || null;

      const itemRow = document.createElement('div');
      itemRow.className = 'dd-statement-row';

      const textSpan = document.createElement('span');
      textSpan.className = 'dd-statement-text';
      textSpan.textContent = pair.prompt;

      const slotWrapper = document.createElement('div');
      slotWrapper.className = 'dd-slot-wrapper';

      const dropSlot = document.createElement('div');
      dropSlot.className = `dd-drop-slot ${placedVal ? 'filled' : 'empty'}`;
      dropSlot.dataset.targetId = targetId;

      // Evaluation state for this pair
      let isPairCorrect = false;
      let hasEval = false;
      if (this.isChecked && this.evalRes && Array.isArray(this.evalRes.pairResults)) {
        hasEval = true;
        const pairRes = this.evalRes.pairResults.find(p => p.id === targetId);
        isPairCorrect = pairRes ? pairRes.isCorrect : false;
        dropSlot.classList.add(isPairCorrect ? 'eval-correct' : 'eval-wrong');
      }

      if (placedVal) {
        const filledChip = document.createElement('div');
        filledChip.className = 'dd-chip placed';
        if (hasEval) {
          filledChip.classList.add(isPairCorrect ? 'eval-correct' : 'eval-wrong');
        }
        filledChip.draggable = !this.isReadOnly;
        
        let chipActionHtml = '';
        if (hasEval) {
          chipActionHtml = `<span class="chip-eval-tag ${isPairCorrect ? 'correct' : 'wrong'}">${isPairCorrect ? '✓ Đúng' : '✗ Sai'}</span>`;
        } else if (!this.isReadOnly) {
          chipActionHtml = `<button type="button" class="chip-remove" title="Bỏ chọn (trả về danh sách)">×</button>`;
        }

        filledChip.innerHTML = `
          <span class="chip-text">${escapeHtml(placedVal)}</span>
          ${chipActionHtml}
        `;
        
        if (!this.isReadOnly) {
          const removeBtn = filledChip.querySelector('.chip-remove');
          if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.removePlacedItem(targetId);
            });
          }
          this.attachChipDragEvents(filledChip, placedVal, targetId);
        }
        dropSlot.appendChild(filledChip);
      } else {
        if (hasEval) {
          dropSlot.innerHTML = `<span style="color: #dc2626; font-size: 13px; font-weight: 600;">(Chưa ghép thẻ)</span>`;
        } else {
          dropSlot.innerHTML = `<span class="dd-slot-placeholder">Kéo và thả đáp án vào đây</span>`;
        }
      }

      if (!this.isReadOnly) {
        this.attachSlotEvents(dropSlot, targetId);
      }

      slotWrapper.appendChild(dropSlot);

      // Show correct answer feedback if evaluated and not correct
      if (hasEval && !isPairCorrect) {
        const hintDiv = document.createElement('div');
        hintDiv.className = 'dd-pair-correct-feedback';
        hintDiv.innerHTML = `
          <span class="dd-feedback-arrow">➔</span>
          <span class="dd-feedback-label">Đáp án đúng:</span>
          <span class="dd-feedback-val">${escapeHtml(pair.correctAnswer)}</span>
        `;
        slotWrapper.appendChild(hintDiv);
      }

      itemRow.appendChild(textSpan);
      itemRow.appendChild(slotWrapper);
      statementsCol.appendChild(itemRow);
    });

    wrapper.appendChild(poolCol);
    wrapper.appendChild(statementsCol);
    this.container.appendChild(wrapper);
  }

  // --- COLUMNS MODE: Categorize into multiple columns ---
  renderColumnsMode() {
    const q = this.question;
    const columns = q.columns || [];
    const allItems = [...(q.allItems || q.optionsPool || (q.columns ? q.columns.flatMap(c => c.correctItems || []) : []))];

    // Current state format for columns: { 'col-1': ['item1', 'item2'], 'col-2': ['item3'] }
    if (typeof this.currentState !== 'object' || Array.isArray(this.currentState)) {
      this.currentState = {};
    }
    const placedItems = Object.values(this.currentState).flat();
    const remainingPlaced = [...placedItems];
    const availablePool = allItems.filter(item => {
      const index = remainingPlaced.indexOf(item);
      if (index === -1) return true;
      remainingPlaced.splice(index, 1);
      return false;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'dd-columns-wrapper';
    if (this.selectedChip) {
      wrapper.classList.add('has-selection');
    }

    // If checked/evaluated: show top summary banner
    if (this.isChecked && this.evalRes) {
      const banner = document.createElement('div');
      const isAllCorrect = this.evalRes.isCorrect;
      const correctCount = this.evalRes.correctCols !== undefined 
        ? this.evalRes.correctCols 
        : (this.evalRes.colResults ? this.evalRes.colResults.filter(c => c.isCorrect).length : 0);
      
      banner.className = `dd-eval-banner ${isAllCorrect ? 'eval-correct' : 'eval-wrong'}`;
      banner.innerHTML = `
        <div class="dd-eval-banner-header">
          <span class="dd-eval-icon">${isAllCorrect ? '✓' : '✗'}</span>
          <span class="dd-eval-title">${isAllCorrect ? 'Chính xác hoàn toàn!' : 'Chưa chính xác!'}</span>
          <span class="dd-eval-score">(Phân loại đúng ${correctCount}/${columns.length} cột)</span>
        </div>
        ${!isAllCorrect ? `<div class="dd-eval-note">Xem chi tiết phân loại và các mục còn thiếu ở từng cột bên dưới.</div>` : ''}
      `;
      wrapper.appendChild(banner);
    }

    // Top: Draggable Chips Pool Section
    const poolContainer = document.createElement('div');
    poolContainer.className = 'dd-col-pool-section';

    const poolHeader = document.createElement('div');
    poolHeader.className = 'dd-col-pool-header';
    poolHeader.innerHTML = `
      <div class="dd-pool-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        <span>Danh sách các thẻ cần phân loại:</span>
      </div>
      <div class="dd-pool-hint">Kéo thả hoặc nhấp chọn thẻ rồi chọn cột tương ứng</div>
    `;

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'dd-chips-container dd-pool-chips';

    if (availablePool.length === 0) {
      chipsContainer.innerHTML = `
        <div class="dd-empty-pool">
          <span style="color: #16a34a; font-weight: 700; margin-right: 6px;">✓</span>
          Đã xếp hết tất cả các thẻ vào vị trí!
        </div>
      `;
    } else {
      availablePool.forEach((itemText) => {
        const chip = document.createElement('div');
        const isSelected = this.selectedChip === itemText;
        chip.className = `dd-chip ${isSelected ? 'selected' : ''}`;
        chip.draggable = !this.isReadOnly;
        chip.dataset.value = itemText;
        chip.innerHTML = `<span class="chip-text">${escapeHtml(itemText)}</span>`;

        if (!this.isReadOnly) {
          this.attachChipDragEvents(chip, itemText, 'pool');
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChipSelection(itemText);
          });
        }

        chipsContainer.appendChild(chip);
      });
    }

    poolContainer.appendChild(poolHeader);
    poolContainer.appendChild(chipsContainer);
    if (!this.isReadOnly) {
      this.attachPoolDropEvents(poolContainer);
    }

    // Columns container
    const colsGrid = document.createElement('div');
    colsGrid.className = 'dd-columns-grid';

    columns.forEach((col, cIdx) => {
      const colBox = document.createElement('div');
      colBox.className = 'dd-col-box';
      colBox.dataset.colId = col.id;

      let isColCorrect = false;
      let hasColEval = false;
      if (this.isChecked && this.evalRes && Array.isArray(this.evalRes.colResults)) {
        hasColEval = true;
        const colRes = this.evalRes.colResults.find(c => c.colId === col.id);
        isColCorrect = colRes ? colRes.isCorrect : false;
        colBox.classList.add(isColCorrect ? 'eval-correct' : 'eval-wrong');
      }

      const colHeader = document.createElement('div');
      colHeader.className = 'dd-col-header';
      colHeader.innerHTML = `
        <span class="dd-col-badge">Cột ${cIdx + 1}</span>
        <span class="dd-col-title-text">${escapeHtml(col.title)}</span>
        ${hasColEval ? `
          <span class="dd-col-eval-status ${isColCorrect ? 'correct' : 'wrong'}">
            ${isColCorrect ? '✓ Đúng' : '✗ Chưa đúng'}
          </span>
        ` : ''}
      `;

      const colDropZone = document.createElement('div');
      colDropZone.className = 'dd-col-dropzone';
      colDropZone.dataset.colId = col.id;

      const itemsInCol = this.currentState[col.id] || [];
      if (itemsInCol.length === 0) {
        if (hasColEval) {
          colDropZone.innerHTML = `
            <div class="dd-col-placeholder" style="border-color: #fca5a5; background: #fef2f2; color: #b91c1c;">
              <span>(Cột này đang bỏ trống, chưa có thẻ nào)</span>
            </div>
          `;
        } else {
          colDropZone.innerHTML = `
            <div class="dd-col-placeholder">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="dd-placeholder-icon">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4"/>
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
              </svg>
              <span>Kéo hoặc chạm thẻ để đưa vào cột này</span>
            </div>
          `;
        }
      } else {
        itemsInCol.forEach((itemText, idx) => {
          const placedChip = document.createElement('div');
          placedChip.className = 'dd-chip placed';
          
          let isItemInCol = false;
          if (hasColEval) {
            isItemInCol = (col.correctItems || []).some(ci => ci.trim().toLowerCase() === itemText.trim().toLowerCase());
            placedChip.classList.add(isItemInCol ? 'eval-correct' : 'eval-wrong');
          }

          placedChip.draggable = !this.isReadOnly;
          
          let chipTagHtml = '';
          if (hasColEval) {
            chipTagHtml = `<span class="chip-eval-tag ${isItemInCol ? 'correct' : 'wrong'}">${isItemInCol ? '✓ Đúng' : '✗ Sai cột'}</span>`;
          } else if (!this.isReadOnly) {
            chipTagHtml = `<button type="button" class="chip-remove" title="Bỏ chọn (trả về danh sách)">×</button>`;
          }

          placedChip.innerHTML = `
            <span class="chip-text">${escapeHtml(itemText)}</span>
            ${chipTagHtml}
          `;

          if (!this.isReadOnly) {
            const removeBtn = placedChip.querySelector('.chip-remove');
            if (removeBtn) {
              removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeColumnItem(col.id, idx);
              });
            }
            this.attachChipDragEvents(placedChip, itemText, col.id);
          }

          colDropZone.appendChild(placedChip);
        });
      }

      // If evaluated and column not completely correct, show missing items
      if (hasColEval && !isColCorrect) {
        const missingItems = (col.correctItems || []).filter(ci => 
          !itemsInCol.some(it => it.trim().toLowerCase() === ci.trim().toLowerCase())
        );
        if (missingItems.length > 0) {
          const missingBox = document.createElement('div');
          missingBox.className = 'dd-col-missing-box';
          missingBox.innerHTML = `
            <div class="dd-missing-header">Mục đúng của cột này còn thiếu:</div>
            <div class="dd-missing-list">
              ${missingItems.map(m => `
                <div class="dd-chip-missing">
                  <span class="missing-bullet">+</span>
                  <span>${escapeHtml(m)}</span>
                </div>
              `).join('')}
            </div>
          `;
          colDropZone.appendChild(missingBox);
        }
      }

      if (!this.isReadOnly) {
        this.attachColumnDropEvents(colDropZone, col.id);

        // Clicking anywhere on colBox (including header) places the selected chip
        colBox.addEventListener('click', (e) => {
          if (e.target.closest('.chip-remove')) return;
          if (this.selectedChip) {
            this.addItemToColumn(col.id, this.selectedChip);
            this.selectedChip = null;
          }
        });
      }

      colBox.appendChild(colHeader);
      colBox.appendChild(colDropZone);
      colsGrid.appendChild(colBox);
    });

    // Deselect chip if user clicks outside
    wrapper.addEventListener('click', (e) => {
      if (!e.target.closest('.dd-chip') && !e.target.closest('.dd-col-box') && !e.target.closest('.dd-drop-slot')) {
        if (this.selectedChip) {
          this.selectedChip = null;
          this.render(this.question, this.currentState);
        }
      }
    });

    wrapper.appendChild(poolContainer);
    wrapper.appendChild(colsGrid);
    this.container.appendChild(wrapper);
  }

  // --- EVENTS & HANDLERS ---
  attachChipDragEvents(chipEl, textValue, sourceLocation) {
    chipEl.addEventListener('dragstart', (e) => {
      this.draggedValue = textValue;
      this.draggedFrom = sourceLocation;
      e.dataTransfer.setData('text/plain', textValue);
      e.dataTransfer.effectAllowed = 'move';
      chipEl.classList.add('dragging');
    });

    chipEl.addEventListener('dragend', () => {
      chipEl.classList.remove('dragging');
      this.draggedValue = null;
      this.draggedFrom = null;
    });
  }

  attachSlotEvents(slotEl, targetId) {
    slotEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slotEl.classList.add('drag-hover');
    });

    slotEl.addEventListener('dragleave', (e) => {
      if (!slotEl.contains(e.relatedTarget)) {
        slotEl.classList.remove('drag-hover');
      }
    });

    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      slotEl.classList.remove('drag-hover');
      const val = e.dataTransfer.getData('text/plain') || this.draggedValue;
      if (val) {
        this.placeItemInSlot(targetId, val);
      }
    });

    // Tap to place support
    slotEl.addEventListener('click', (e) => {
      if (e.target.closest('.chip-remove')) return;
      if (this.selectedChip) {
        this.placeItemInSlot(targetId, this.selectedChip);
        this.selectedChip = null;
      }
    });
  }

  attachColumnDropEvents(dropZoneEl, colId) {
    dropZoneEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZoneEl.classList.add('drag-hover');
    });

    dropZoneEl.addEventListener('dragleave', (e) => {
      if (!dropZoneEl.contains(e.relatedTarget)) {
        dropZoneEl.classList.remove('drag-hover');
      }
    });

    dropZoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZoneEl.classList.remove('drag-hover');
      const val = e.dataTransfer.getData('text/plain') || this.draggedValue;
      if (val) {
        this.addItemToColumn(colId, val);
      }
    });

    // Tap to place support
    dropZoneEl.addEventListener('click', (e) => {
      if (e.target.closest('.chip-remove')) return;
      if (this.selectedChip) {
        this.addItemToColumn(colId, this.selectedChip);
        this.selectedChip = null;
      }
    });
  }

  attachPoolDropEvents(poolEl) {
    poolEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      poolEl.classList.add('drag-hover');
    });

    poolEl.addEventListener('dragleave', (e) => {
      if (!poolEl.contains(e.relatedTarget)) {
        poolEl.classList.remove('drag-hover');
      }
    });

    poolEl.addEventListener('drop', (e) => {
      e.preventDefault();
      poolEl.classList.remove('drag-hover');
      const val = e.dataTransfer.getData('text/plain') || this.draggedValue;
      if (val && this.draggedFrom && this.draggedFrom !== 'pool') {
        if (this.question.type === 'drag_drop_columns') {
          this.removeColumnItemByValue(this.draggedFrom, val);
        } else {
          this.removePlacedItem(this.draggedFrom);
        }
      }
    });
  }

  toggleChipSelection(chipText) {
    if (this.selectedChip === chipText) {
      this.selectedChip = null;
    } else {
      this.selectedChip = chipText;
    }
    this.render(this.question, this.currentState);
  }

  placeItemInSlot(targetId, value) {
    // If chip came from another slot, clear that slot
    if (this.draggedFrom && this.draggedFrom !== 'pool' && this.draggedFrom !== targetId) {
      delete this.currentState[this.draggedFrom];
    }
    this.currentState[targetId] = value;
    this.render(this.question, this.currentState);
    if (this.onAnswerChanged) {
      this.onAnswerChanged(this.currentState);
    }
  }

  removePlacedItem(targetId) {
    delete this.currentState[targetId];
    this.render(this.question, this.currentState);
    if (this.onAnswerChanged) {
      this.onAnswerChanged(this.currentState);
    }
  }

  addItemToColumn(colId, value) {
    // Initialize column arrays only when the user actually changes an answer.
    (this.question.columns || []).forEach(col => {
      if (!Array.isArray(this.currentState[col.id])) this.currentState[col.id] = [];
    });
    // Remove from other columns if it was moved
    Object.keys(this.currentState).forEach(cId => {
      this.currentState[cId] = this.currentState[cId].filter(v => v !== value);
    });

    this.currentState[colId].push(value);
    this.render(this.question, this.currentState);
    if (this.onAnswerChanged) {
      this.onAnswerChanged(this.currentState);
    }
  }

  removeColumnItem(colId, index) {
    if (this.currentState[colId]) {
      this.currentState[colId].splice(index, 1);
      this.render(this.question, this.currentState);
      if (this.onAnswerChanged) {
        this.onAnswerChanged(this.currentState);
      }
    }
  }

  removeColumnItemByValue(colId, val) {
    if (this.currentState[colId]) {
      this.currentState[colId] = this.currentState[colId].filter(v => v !== val);
      this.render(this.question, this.currentState);
      if (this.onAnswerChanged) {
        this.onAnswerChanged(this.currentState);
      }
    }
  }

  getState() {
    return this.currentState;
  }
}
