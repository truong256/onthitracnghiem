import json, re

with open('docs/pdf_dump.json', 'r', encoding='utf-8') as f:
    pdf_dump = json.load(f)

def search_pdf(lesson_id, keywords):
    lesson = pdf_dump.get(lesson_id)
    if not lesson:
        print(f"Lesson {lesson_id} not found in PDF dump")
        return
    print(f"\n==================== SEARCH IN {lesson_id} ({lesson['filename']}) ====================")
    print(f"Keywords: {keywords}")
    matches = []
    for page in lesson['pages']:
        text = page['text']
        found = False
        for kw in keywords:
            if re.search(kw, text, re.IGNORECASE):
                found = True
                break
        if found:
            print(f"\n--- Page {page['page_num']} ---")
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            for l in lines:
                if any(re.search(kw, l, re.IGNORECASE) for kw in keywords):
                    print("  >>", l)
            matches.append(page['page_num'])
    print(f"Total matching pages: {len(matches)}")

# 1. Bai 1: "cơ sở" và "Đảng" / "giai cấp công nhân và nhân dân lao động là cơ sở"
search_pdf('bai-1', [r'cơ sở', r'bổ sung lực lượng'])

# 2. Bai 1: "tâm lý tiểu nông" / "hạn chế"
search_pdf('bai-1', [r'hạn chế', r'tiểu nông'])

# 3. Bai 2: Câu 22: "tất yếu khách quan" / "chủ quan" / "bỏ qua chế độ tư bản"
search_pdf('bai-2', [r'tất yếu', r'bỏ qua chế độ tư bản'])

# 4. Bai 3: Câu 16: "quyền cơ bản" / "quyền tối thiểu" / "định nghĩa.*dân chủ"
search_pdf('bai-3', [r'quyền cơ bản', r'quyền tối thiểu', r'định nghĩa.*dân chủ', r'bản chất.*dân chủ'])

# 5. Bai 4: Câu 17: "liên minh đặc biệt"
search_pdf('bai-4', [r'liên minh đặc biệt'])

# 6. Bai 4: Câu 24: "cơ cấu xã hội - giai cấp gồm mấy" / các giai cấp tầng lớp
search_pdf('bai-4', [r'giai cấp công nhân', r'giai cấp nông dân', r'đội ngũ trí thức'])

# 7. Bai 5: Câu 19: "16" / "43" / "tôn giáo đã được công nhận"
search_pdf('bai-5', [r'16', r'43', r'công nhận'])

# 8. Bai 5: Câu 7: "đặc trưng quan trọng nhất"
search_pdf('bai-5', [r'đặc trưng quan trọng nhất', r'sinh hoạt kinh tế'])
