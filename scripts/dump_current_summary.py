import json, re

with open('docs/current_data_dump.json', 'r', encoding='utf-8') as f:
    current_data = json.load(f)

# Let's inspect the titles/headers of current questions vs docx questions
for ex in current_data:
    lid = ex['id']
    print(f"\n==================== {lid} (current count: {len(ex['questions'])}) ====================")
    for q in ex['questions']:
        print(f"  {q['id']} [num={q['number']}, type={q['type']}]: {q['content'][:50]} | ans: {q.get('correctAnswers')}")
