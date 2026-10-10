import json, re, sys
from test_converter import convert_block_to_question, parse_docx_file

lessons_config = [
    {
        "id": "bai-1",
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx"
    },
    {
        "id": "bai-2",
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx"
    },
    {
        "id": "bai-3",
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx"
    },
    {
        "id": "bai-4",
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx"
    },
    {
        "id": "bai-5",
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx"
    },
    {
        "id": "bai-6",
        "title": "BÀI 6 – VẤN ĐỀ GIA ĐÌNH TRONG THỜI KỲ QUÁ ĐỘ LÊN CHỦ NGHĨA XÃ HỘI",
        "description": "Bộ câu hỏi ôn tập CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6: Vấn đề gia đình trong thời kỳ quá độ lên chủ nghĩa xã hội",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx"
    }
]

# Better regex for is_multi
def clean_question_object(q):
    lower_h = (q["header"] + " " + q["content"]).lower()
    
    # Clean instruction note if not set
    if q["type"] in ["single_choice", "multiple_choice"]:
        correct_count = len(q["correctAnswers"])
        
        # Check explicit prompt note
        m_2 = re.search(r'chọn\s*(?:2|hai)\s*(?:đáp án|phương án)', lower_h)
        m_3 = re.search(r'chọn\s*(?:3|ba)\s*(?:đáp án|phương án)', lower_h)
        m_multi = re.search(r'chọn\s*(?:nhiều)\s*(?:đáp án|phương án)', lower_h)
        
        if m_2:
            q["type"] = "multiple_choice"
            q["instructionNote"] = "Sinh viên chọn 2 phương án đúng nhất"
            if correct_count != 2:
                q["needsReview"] = True
                q["reviewReason"] = f"Yêu cầu chọn 2 đáp án nhưng có {correct_count} đáp án đúng tô đỏ"
        elif m_3:
            q["type"] = "multiple_choice"
            q["instructionNote"] = "Sinh viên chọn 3 phương án đúng nhất"
            if correct_count != 3:
                q["needsReview"] = True
                q["reviewReason"] = f"Yêu cầu chọn 3 đáp án nhưng có {correct_count} đáp án đúng tô đỏ"
        elif m_multi:
            q["type"] = "multiple_choice"
            q["instructionNote"] = "Sinh viên chọn các phương án đúng nhất"
        elif correct_count > 1:
            q["type"] = "multiple_choice"
            q["instructionNote"] = f"Sinh viên chọn {correct_count} phương án đúng nhất"
        else:
            q["type"] = "single_choice"
            q["instructionNote"] = ""
            
    return q

full_dataset = []
total_questions = 0

for l_cfg in lessons_config:
    lid = l_cfg["id"]
    docx_path = l_cfg["docx"]
    blocks = parse_docx_file(docx_path, lid)
    raw_qs = [convert_block_to_question(b, lid, idx+1) for idx, b in enumerate(blocks)]
    cleaned_qs = [clean_question_object(q) for q in raw_qs]
    
    lesson_obj = {
        "id": lid,
        "title": l_cfg["title"],
        "description": l_cfg["description"],
        "questions": cleaned_qs
    }
    full_dataset.append(lesson_obj)
    total_questions += len(cleaned_qs)
    print(f"[{lid}] Processed {len(cleaned_qs)} questions")

print(f"\nTOTAL ALL QUESTIONS: {total_questions}")

with open('docs/full_extracted_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(full_dataset, f, ensure_ascii=False, indent=2)

print("Saved docs/full_extracted_dataset.json")
