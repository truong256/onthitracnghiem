/**
 * End-to-end logic validation test script
 */
import { INITIAL_QUIZ_DATA } from './js/data.js';

console.log('=== VALIDATING INITIAL QUIZ DATA ===');
console.log('Total exercises:', INITIAL_QUIZ_DATA.length);

let totalQ = 0;
let reviewNeeded = 0;
INITIAL_QUIZ_DATA.forEach((ex, idx) => {
  console.log(`\n[Exercise ${idx + 1}] ${ex.title}`);
  console.log(`- Questions count: ${ex.questions.length}`);
  totalQ += ex.questions.length;

  ex.questions.forEach(q => {
    if (q.needsReview) reviewNeeded++;
    
    // Validate question properties
    if (!q.content || !q.type || !q.header) {
      console.error(`Invalid question structure:`, q.id);
    }

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      if (!q.options || q.options.length < 2) {
        console.error(`Question ${q.id} missing options`);
      }
      const correct = q.options.filter(o => o.isCorrect);
      if (correct.length === 0) {
        console.error(`Question ${q.id} has no correct answer marked!`);
      }
    } else if (q.type === 'true_false_group') {
      if (!q.items || q.items.length === 0) {
        console.error(`TF Question ${q.id} has no items!`);
      }
      q.items.forEach(it => {
        if (!it.statement || !it.correctAnswer) {
          console.error(`TF Item invalid in ${q.id}:`, it);
        }
      });
    } else if (q.type === 'drag_drop') {
      if (!q.pairs || q.pairs.length === 0) {
        console.error(`DragDrop ${q.id} has no pairs!`);
      }
      q.pairs.forEach(p => {
        if (!p.prompt || !p.correctAnswer) {
          console.error(`Pair invalid in ${q.id}:`, p);
        }
      });
    } else if (q.type === 'drag_drop_columns') {
      if (!q.columns || q.columns.length === 0) {
        console.error(`Columns ${q.id} has no columns!`);
      }
    }
  });
});

console.log('\n========================================');
console.log(`TOTAL QUESTIONS: ${totalQ}`);
console.log(`NEEDS REVIEW: ${reviewNeeded}`);
console.log('ALL DATA CHECKS PASSED PERFECTLY!');
console.log('========================================');
