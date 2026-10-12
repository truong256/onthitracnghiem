import assert from 'node:assert/strict';
import { QuizEngine } from './js/quizEngine.js';
import { App } from './js/app.js';
import { DragDropEngine } from './js/dragDropEngine.js';

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.dataset = {};
    this.className = '';
    this.classList = { add: name => { this.className += ` ${name}`; } };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  querySelector(selector) {
    if (!this.matches) this.matches = {};
    return (this.matches[selector] ||= new Element());
  }
  click() { this.listeners.click?.({ stopPropagation() {} }); }
  get textContent() { return this.html || ''; }
  set textContent(value) { this.html = value; }
}
globalThis.document = { createElement: () => new Element(), addEventListener() {} };

function setup(question) {
  const engine = new QuizEngine();
  engine.questions = [question];
  const app = Object.create(App.prototype);
  app.quizEngine = engine;
  app.quizAnswersContainer = new Element();
  const render = state => app.renderQuestionAnswers(question, state);
  engine.onStateChanged = render;
  engine.notifyStateChanged();
  return { app, engine };
}

const single = {
  id: 'single', type: 'single_choice', options: [
    { key: 'A', content: 'wrong', isCorrect: false },
    { key: 'B', content: 'right', isCorrect: true }
  ], correctAnswers: ['B']
};
const { app: singleApp, engine: singleEngine } = setup(single);
singleApp.quizAnswersContainer.children[0].children[0].children[1].click();
assert.equal(singleEngine.getAnswer(single.id), 'A');
assert.equal(singleEngine.isChecked(single.id), false);
assert.equal(singleApp.quizAnswersContainer.children[0].children[0].children[1].className.includes('eval-'), false);
singleApp.quizAnswersContainer.children[0].children[1].children[1].click();
assert.equal(singleEngine.getAnswer(single.id), 'B');
assert.equal(singleEngine.isChecked(single.id), false);
singleEngine.checkCurrentQuestion();
assert.equal(singleEngine.isChecked(single.id), true);

const multiple = {
  id: 'multiple', type: 'multiple_choice', options: [
    { key: 'A', content: 'correct 1', isCorrect: true },
    { key: 'B', content: 'wrong', isCorrect: false },
    { key: 'C', content: 'correct 2', isCorrect: true }
  ], correctAnswers: ['A', 'C']
};
const { app: multiApp, engine: multiEngine } = setup(multiple);
multiApp.quizAnswersContainer.children[0].children[0].children[1].click();
multiApp.quizAnswersContainer.children[0].children[1].children[1].click();
assert.equal(multiEngine.isChecked(multiple.id), false);
multiApp.quizAnswersContainer.children[0].children[1].children[1].click();
multiApp.quizAnswersContainer.children[0].children[2].children[1].click();
assert.deepEqual(multiEngine.getAnswer(multiple.id), ['A', 'C']);
assert.equal(multiEngine.checkCurrentQuestion().isCorrect, true);

const tf = {
  id: 'tf', type: 'true_false_group', items: [
    { order: 1, statement: 'one', correctAnswer: 'Đúng' },
    { order: 2, statement: 'two', correctAnswer: 'Sai' }
  ]
};
const { app: tfApp, engine: tfEngine } = setup(tf);
tfApp.quizAnswersContainer.children[0].children[0].querySelector('.btn-tf-false').click();
assert.equal(tfEngine.isChecked(tf.id), false);
assert.equal(tfApp.quizAnswersContainer.children[0].children[0].innerHTML.includes('tf-eval-tag'), false);
tfApp.quizAnswersContainer.children[0].children[1].querySelector('.btn-tf-false').click();
assert.equal(tfEngine.isChecked(tf.id), false, 'all true/false items do not trigger grading');
tfEngine.checkCurrentQuestion();
assert.equal(tfEngine.isChecked(tf.id), true);

const { app: examApp, engine: examEngine } = setup(single);
examEngine.mode = 'exam';
examEngine.instantCheck = false;
examEngine.notifyStateChanged();
examApp.quizAnswersContainer.children[0].children[0].children[1].click();
assert.equal(examEngine.isChecked(single.id), false);
assert.equal(examApp.quizAnswersContainer.children[0].children[1].children[1].className.includes('eval-'), false);

const columns = {
  id: 'columns', type: 'drag_drop_columns',
  columns: [
    { id: 'c1', title: 'First', correctItems: ['one'] },
    { id: 'c2', title: 'Second', correctItems: ['two'] }
  ]
};
const ddEngine = new DragDropEngine(new Element(), () => {});
const untouched = {};
ddEngine.render(columns, untouched);
assert.deepEqual(untouched, {}, 'render must not mutate saved answer');
assert.deepEqual(ddEngine.currentState, {}, 'empty render remains unanswered');

console.log('Quiz UI interaction regressions PASS');
