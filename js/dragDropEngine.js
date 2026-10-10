/**
 * Drag & Drop Engine supporting Desktop HTML5 Drag and Mobile Tap-to-Place
 */

export class DragDropEngine {
  constructor(containerEl, onAnswerChanged) {
    this.container = containerEl;
    this.onAnswerChanged = onAnswerChanged;
    this.selectedChip = null; // for tap-to-place on mobile/click
    this.draggedValue = null; // for HTML5 drag
    this.draggedFrom = null; // slot id or 'pool'
  }

  render(question, savedState = null) {
    this.question = question;
    this.currentState = savedState || {}; // mapping targetId -> placedText
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
      chipsContainer.innerHTML = `<div class="dd-empty-pool">Đã xếp hết tất cả các thẻ vào vị trí!</div>`;
    } else {
      availablePool.forEach((chipText) => {
        const chip = document.createElement('div');
        chip.className = `dd-chip ${this.selectedChip === chipText ? 'selected' : ''}`;
        chip.draggable = true;
        chip.dataset.value = chipText;
        chip.innerHTML = `<span class="chip-text">${chipText}</span>`;

        this.attachChipDragEvents(chip, chipText, 'pool');
        
        // Tap to select (mobile / click support)
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleChipSelection(chipText);
        });

        chipsContainer.appendChild(chip);
      });
    }

    poolCol.appendChild(chipsContainer);

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
        filledChip.draggable = true;
        filledChip.innerHTML = `<span class="chip-text">${placedVal}</span><span class="chip-remove" title="Bỏ chọn">×</span>`;
        
        filledChip.querySelector('.chip-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          this.removePlacedItem(targetId);
        });

        // Allow dragging back out
        this.attachChipDragEvents(filledChip, placedVal, targetId);
        dropSlot.appendChild(filledChip);
      } else {
        dropSlot.innerHTML = `<span class="dd-slot-placeholder">Kéo và thả đáp án vào đây</span>`;
      }

      this.attachSlotEvents(dropSlot, targetId);

      itemRow.appendChild(textSpan);
      itemRow.appendChild(dropSlot);
      statementsCol.appendChild(itemRow);
    });

    // Append chips pool at top, statements below
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

    // Top: Draggable Chips Pool
    const poolContainer = document.createElement('div');
    poolContainer.className = 'dd-col-pool-section';

    const poolHeader = document.createElement('div');
    poolHeader.className = 'dd-pool-header';
    poolHeader.innerHTML = `<span>Các yếu tố cần phân loại:</span>`;

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'dd-chips-container';

    if (availablePool.length === 0) {
      chipsContainer.innerHTML = `<div class="dd-empty-pool">Đã phân loại xong tất cả các yếu tố!</div>`;
    } else {
      availablePool.forEach((itemText) => {
        const chip = document.createElement('div');
        chip.className = `dd-chip ${this.selectedChip === itemText ? 'selected' : ''}`;
        chip.draggable = true;
        chip.dataset.value = itemText;
        chip.innerHTML = `<span class="chip-text">${itemText}</span>`;

        this.attachChipDragEvents(chip, itemText, 'pool');

        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleChipSelection(itemText);
        });

        chipsContainer.appendChild(chip);
      });
    }

    poolContainer.appendChild(poolHeader);
    poolContainer.appendChild(chipsContainer);

    // Columns container
    const colsGrid = document.createElement('div');
    colsGrid.className = 'dd-columns-grid';

    columns.forEach(col => {
      const colBox = document.createElement('div');
      colBox.className = 'dd-col-box';
      colBox.dataset.colId = col.id;

      const colHeader = document.createElement('div');
      colHeader.className = 'dd-col-header';
      colHeader.textContent = col.title;

      const colDropZone = document.createElement('div');
      colDropZone.className = 'dd-col-dropzone';
      colDropZone.dataset.colId = col.id;

      const itemsInCol = this.currentState[col.id] || [];
      if (itemsInCol.length === 0) {
        colDropZone.innerHTML = `<div class="dd-col-placeholder">Kéo hoặc chạm thẻ để đưa vào cột này</div>`;
      } else {
        itemsInCol.forEach((itemText, idx) => {
          const placedChip = document.createElement('div');
          placedChip.className = 'dd-chip placed';
          placedChip.draggable = true;
          placedChip.innerHTML = `<span class="chip-text">${itemText}</span><span class="chip-remove">×</span>`;

          placedChip.querySelector('.chip-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeColumnItem(col.id, idx);
          });

          this.attachChipDragEvents(placedChip, itemText, col.id);
          colDropZone.appendChild(placedChip);
        });
      }

      this.attachColumnDropEvents(colDropZone, col.id);

      colBox.appendChild(colHeader);
      colBox.appendChild(colDropZone);
      colsGrid.appendChild(colBox);
    });

    // Append pool at top, then columns below
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

    slotEl.addEventListener('dragleave', () => {
      slotEl.classList.remove('drag-hover');
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
    slotEl.addEventListener('click', () => {
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

    dropZoneEl.addEventListener('dragleave', () => {
      dropZoneEl.classList.remove('drag-hover');
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
    dropZoneEl.addEventListener('click', () => {
      if (this.selectedChip) {
        this.addItemToColumn(colId, this.selectedChip);
        this.selectedChip = null;
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

  getState() {
    return this.currentState;
  }
}
