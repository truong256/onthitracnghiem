/**
 * Drag & Drop Engine supporting Desktop HTML5 Drag and Mobile Tap-to-Place
 * Supports both Standard (statement -> slot) and Multi-Columns categorization modes.
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
    this.selectedChip = null; // for tap-to-place on mobile/click
    this.draggedValue = null; // for HTML5 drag
    this.draggedFrom = null; // slot id, col id, or 'pool'
  }

  render(question, savedState = null) {
    this.question = question;
    this.currentState = savedState || {}; // mapping targetId -> placedText or colId -> [items]
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
    const availablePool = pool.filter(chip => {
      const placedCount = placedValues.filter(v => v === chip).length;
      const totalInPool = pool.filter(v => v === chip).length;
      return placedCount < totalInPool;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'dd-standard-wrapper';
    if (this.selectedChip) {
      wrapper.classList.add('has-selection');
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

      const dropSlot = document.createElement('div');
      dropSlot.className = `dd-drop-slot ${placedVal ? 'filled' : 'empty'}`;
      dropSlot.dataset.targetId = targetId;

      if (placedVal) {
        const filledChip = document.createElement('div');
        filledChip.className = 'dd-chip placed';
        filledChip.draggable = !this.isReadOnly;
        filledChip.innerHTML = `
          <span class="chip-text">${escapeHtml(placedVal)}</span>
          ${!this.isReadOnly ? `<button type="button" class="chip-remove" title="Bỏ chọn (trả về danh sách)">×</button>` : ''}
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
        dropSlot.innerHTML = `<span class="dd-slot-placeholder">Kéo và thả đáp án vào đây</span>`;
      }

      if (!this.isReadOnly) {
        this.attachSlotEvents(dropSlot, targetId);
      }

      itemRow.appendChild(textSpan);
      itemRow.appendChild(dropSlot);
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
    columns.forEach(col => {
      if (!Array.isArray(this.currentState[col.id])) {
        this.currentState[col.id] = [];
      }
    });

    const placedItems = Object.values(this.currentState).flat();
    const availablePool = allItems.filter(item => {
      const placedCount = placedItems.filter(v => v === item).length;
      const totalCount = allItems.filter(v => v === item).length;
      return placedCount < totalCount;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'dd-columns-wrapper';
    if (this.selectedChip) {
      wrapper.classList.add('has-selection');
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
          Đã xếp hết tất cả các thẻ vào vị trí! Nhấp dấu × trên thẻ trong cột nếu bạn muốn xếp lại.
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

      const colHeader = document.createElement('div');
      colHeader.className = 'dd-col-header';
      colHeader.innerHTML = `
        <span class="dd-col-badge">Cột ${cIdx + 1}</span>
        <span class="dd-col-title-text">${escapeHtml(col.title)}</span>
      `;

      const colDropZone = document.createElement('div');
      colDropZone.className = 'dd-col-dropzone';
      colDropZone.dataset.colId = col.id;

      const itemsInCol = this.currentState[col.id] || [];
      if (itemsInCol.length === 0) {
        colDropZone.innerHTML = `
          <div class="dd-col-placeholder">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="dd-placeholder-icon">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4"/>
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
            </svg>
            <span>Kéo hoặc chạm thẻ để đưa vào cột này</span>
          </div>
        `;
      } else {
        itemsInCol.forEach((itemText, idx) => {
          const placedChip = document.createElement('div');
          placedChip.className = 'dd-chip placed';
          placedChip.draggable = !this.isReadOnly;
          placedChip.innerHTML = `
            <span class="chip-text">${escapeHtml(itemText)}</span>
            ${!this.isReadOnly ? `<button type="button" class="chip-remove" title="Bỏ chọn (trả về danh sách)">×</button>` : ''}
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
    if (!this.currentState[colId]) {
      this.currentState[colId] = [];
    }
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
