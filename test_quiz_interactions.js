import assert from 'node:assert/strict';
import { QuizEngine, shuffleQuestionOptions } from './js/quizEngine.js';
import { store } from './js/store.js';

const single = {
  id: 'test-single', type: 'single_choice', content: 'Single',
  options: [
    { key: 'A', content: 'one', isCorrect: false },
    { key: 'B', content: 'two', isCorrect: true },
    { key: 'C', content: 'three', isCorrect: false }
  ], correctAnswers: ['B']
};
const multiple = {
  id: 'test-multiple', type: 'multiple_choice', content: 'Multiple',
  options: [
    { key: 'A', content: 'one', isCorrect: true },
    { key: 'B', content: 'two', isCorrect: false },
    { key: 'C', content: 'three', isCorrect: true }
  ], correctAnswers: ['A', 'C']
};

// A deterministic reverse permutation makes the mapping observable every run.
for (const q of [single, multiple]) {
  const original = structuredClone(q);
  const shuffled = shuffleQuestionOptions(q, () => 0);
  assert.deepEqual(shuffled.options.map(o => o.content), ['two', 'three', 'one']);
  assert.deepEqual(shuffled.options.map(o => o.key), ['A', 'B', 'C']);
  assert.deepEqual(shuffled.correctAnswers, shuffled.options.filter(o => o.isCorrect).map(o => o.key));
  assert.deepEqual(q, original, 'shuffle must not mutate source questions');
  const correct = shuffled.type === 'single_choice' ? shuffled.correctAnswers[0] : shuffled.correctAnswers;
  assert.equal(new QuizEngine().evaluateQuestion(shuffled, correct).isCorrect, true);
}

const recorded = [];
const originalRecord = store.recordQuestionResult;
store.recordQuestionResult = (...args) => recorded.push(args);
try {
  const engine = new QuizEngine();
  engine.questions = [single];
  engine.mode = 'all';
  assert.equal(engine.checkCurrentQuestion(), null, 'empty answer cannot be checked');
  assert.equal(engine.isChecked(single.id), false);
  engine.setAnswer(single.id, 'A');
  engine.setAnswer(single.id, 'B');
  assert.equal(engine.isChecked(single.id), false, 'selection alone never checks');
  assert.equal(recorded.length, 0, 'selection never records a result');
  assert.equal(engine.checkCurrentQuestion().isCorrect, true);
  assert.equal(engine.isChecked(single.id), true);
  engine.setAnswer(single.id, 'A');
  assert.equal(engine.getAnswer(single.id), 'B', 'checked answer is immutable');
  assert.equal(engine.checkCurrentQuestion(), null, 'repeat check has no effect');
  assert.equal(recorded.length, 1);
  engine.submitQuiz();
  assert.equal(recorded.length, 1, 'submission does not record a checked question twice');

  const exam = new QuizEngine();
  exam.questions = [single];
  exam.mode = 'exam';
  exam.instantCheck = false;
  exam.setAnswer(single.id, 'B');
  assert.equal(exam.checkCurrentQuestion(), null, 'exam cannot reveal a result early');
  assert.equal(exam.isChecked(single.id), false);
} finally {
  store.recordQuestionResult = originalRecord;
}

const source = store.getExercise('bai-1').questions;
const engine = new QuizEngine({ random: () => 0 });
engine.startQuiz({ exerciseId: 'bai-1', mode: 'random' });
const shuffledQuestion = engine.questions.find(q => q.type === 'single_choice');
const sourceQuestion = source.find(q => q.id === shuffledQuestion.id);
assert.deepEqual(shuffledQuestion.options.map(o => o.content), [
  sourceQuestion.options[1].content,
  ...sourceQuestion.options.slice(2).map(o => o.content),
  sourceQuestion.options[0].content
]);
assert.deepEqual(store.getExercise('bai-1').questions, source, 'source stays unchanged');
const firstPermutation = structuredClone(shuffledQuestion.options);
engine.goToQuestion(engine.questions.findIndex(q => q.id === shuffledQuestion.id));
engine.nextQuestion();
engine.prevQuestion();
assert.deepEqual(engine.getCurrentQuestion().options, firstPermutation, 'navigation does not reshuffle');
engine.clearTimer();

for (const mode of ['quick', 'exam']) {
  const session = new QuizEngine({ random: () => 0 });
  session.startQuiz({ exerciseId: 'bai-1', mode, questionCount: 8 });
  const q = session.questions.find(item => item.options);
  const original = source.find(item => item.id === q.id);
  assert.notDeepEqual(q.options.map(o => o.content), original.options.map(o => o.content), `${mode} shuffles choices`);
  assert.deepEqual(q.correctAnswers, q.options.filter(o => o.isCorrect).map(o => o.key));
  const answer = q.type === 'multiple_choice' ? q.correctAnswers : q.correctAnswers[0];
  session.setAnswer(q.id, answer);
  assert.equal(session.evaluateQuestion(q, answer).isCorrect, true);
  const summary = session.submitQuiz();
  assert.deepEqual(summary.results.find(result => result.question.id === q.id).question.options, q.options, 'review keeps displayed order');
}

const inOrder = new QuizEngine({ random: () => 0 });
inOrder.startQuiz({ exerciseId: 'bai-1', mode: 'all' });
assert.deepEqual(inOrder.questions.map(q => q.id), source.map(q => q.id));
assert.notDeepEqual(inOrder.questions[0].options, source[0].options, 'ordered mode also shuffles answers');
inOrder.clearTimer();

console.log('Quiz interaction and shuffle regressions PASS');

// Drag pools shuffle independently of prompts/targets, preserving duplicates and distractors.
const pairQuestion = {
  id: 'test-pairs', type: 'drag_drop', content: 'Match',
  pairs: [{id: 'p1', prompt: 'First', correctAnswer: 'one'}, {id: 'p2', prompt: 'Second', correctAnswer: 'two'}],
  optionsPool: ['one', 'two', 'one', 'distractor']
};
const columnQuestion = {
  id: 'test-columns', type: 'drag_drop_columns', content: 'Classify',
  columns: [{id: 'c1', title: 'First', correctItems: ['one']}, {id: 'c2', title: 'Second', correctItems: ['two']}],
  optionsPool: ['one', 'two']
};
for (const question of [pairQuestion, columnQuestion, {...pairQuestion, optionsPool: undefined}, {...columnQuestion, optionsPool: undefined}, {...columnQuestion, allItems: ['two', 'one']}]) {
  const original = structuredClone(question);
  const pool = question.type === 'drag_drop'
    ? question.optionsPool || question.pairs.map(p => p.correctAnswer)
    : question.allItems || question.optionsPool || question.columns.flatMap(c => c.correctItems);
  const shuffled = shuffleQuestionOptions(question, () => 0);
  const actual = shuffled.allItems || shuffled.optionsPool;
  assert.deepEqual(actual, [...pool.slice(1), pool[0]], 'drag answers move position including fallback/legacy pools');
  assert.deepEqual(shuffled.pairs || shuffled.columns, question.pairs || question.columns, 'target IDs, prompts and correct mappings stay fixed');
  assert.deepEqual(question, original, 'source pool is never mutated');
  const answer = shuffled.type === 'drag_drop'
    ? Object.fromEntries(shuffled.pairs.map(p => [p.id, p.correctAnswer]))
    : Object.fromEntries(shuffled.columns.map(c => [c.id, c.correctItems]));
  assert.equal(new QuizEngine().evaluateQuestion(shuffled, answer).isCorrect, true);
}

const originalGetExercise = store.getExercise;
const originalWrongObjects = store.getWrongQuestionObjects;
const fixtures = [single, multiple, pairQuestion, columnQuestion];
store.getExercise = () => ({id: 'shuffle-fixture', title: 'Shuffle', questions: fixtures});
store.getWrongQuestionObjects = () => fixtures;
try {
  for (const mode of ['all', 'random', 'quick', 'exam', 'wrong_only']) {
    const session = new QuizEngine({random: () => 0});
    try {
      session.startQuiz({exerciseId: 'shuffle-fixture', mode});
      if (['all', 'wrong_only'].includes(mode)) assert.deepEqual(session.questions.map(q => q.id), fixtures.map(q => q.id));
      for (const original of fixtures) {
        const q = session.questions.find(item => item.id === original.id);
        const before = original.options || original.optionsPool;
        assert.notDeepEqual(q.options || q.optionsPool, before, `${mode} shuffles ${q.type}`);
        const snapshot = structuredClone(q);
        const answer = q.type === 'single_choice' ? q.correctAnswers[0]
          : q.type === 'multiple_choice' ? q.correctAnswers
          : q.type === 'drag_drop' ? Object.fromEntries(q.pairs.map(p => [p.id, p.correctAnswer]))
          : Object.fromEntries(q.columns.map(c => [c.id, c.correctItems]));
        session.goToQuestion(session.questions.indexOf(q));
        session.setAnswer(q.id, answer);
        session.nextQuestion(); session.prevQuestion();
        assert.deepEqual(session.questions.find(item => item.id === q.id), snapshot, 'answer/navigation never reshuffles');
        assert.equal(session.evaluateQuestion(q, session.getAnswer(q.id)).isCorrect, true);
      }
      const summary = session.submitQuiz();
      assert.equal(summary.results.every(result => result.isCorrect), true);
      assert.deepEqual(summary.results.map(result => result.question), session.questions, 'review retains session pools and labels');
    } finally { session.clearTimer(); }
  }
} finally {
  store.getExercise = originalGetExercise;
  store.getWrongQuestionObjects = originalWrongObjects;
}
console.log('All-mode choice and drag answer shuffle regressions PASS');
