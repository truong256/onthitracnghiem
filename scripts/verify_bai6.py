import json, re

with open('docs/full_extracted_dataset.json', 'r', encoding='utf-8') as f:
    full_data = json.load(f)

with open('docs/pdf_dump.json', 'r', encoding='utf-8') as f:
    pdf_dump = json.load(f)

b6 = next(e for e in full_data if e['id'] == 'bai-6')
pdf_b6 = pdf_dump['bai-6']

print("=== VERIFYING BAI 6 QUESTIONS WITH PDF BAI 6 ===")
print(f"Total questions: {len(b6['questions'])}")

for q in b6['questions']:
    print(f"\n[{q['id']}] {q['header']} ({q['type']}): {q['content']}")
    if q['type'] in ['single_choice', 'multiple_choice']:
        corrects = [o for o in q['options'] if o['isCorrect']]
        for c in corrects:
            print(f"  -> CORRECT: {c['key']}. {c['content']}")
    elif q['type'] == 'true_false_group':
        for it in q['items']:
            print(f"  -> Item {it['order']}: {it['statement'][:60]} => {it['correctAnswer']}")
    elif q['type'] == 'drag_drop_columns':
        for col in q['columns']:
            print(f"  -> Col {col['title']}: {col['correctItems']}")
    elif q['type'] == 'drag_drop':
        for p in q['pairs']:
            print(f"  -> Pair: {p['prompt']} => {p['correctAnswer']}")
