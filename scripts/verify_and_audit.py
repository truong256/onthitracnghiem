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
        "title": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6",
        "description": "Vấn đề gia đình trong thời kỳ quá độ lên chủ nghĩa xã hội",
        "docx": "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx"
    }
]

with open('docs/current_data_dump.json', 'r', encoding='utf-8') as f:
    current_data = json.load(f)

current_map = {ex['id']: ex for ex in current_data}

all_audit_results = {}

for l_cfg in lessons_config:
    lid = l_cfg["id"]
    docx_path = l_cfg["docx"]
    blocks = parse_docx_file(docx_path, lid)
    docx_questions = [convert_block_to_question(b, lid, idx+1) for idx, b in enumerate(blocks)]
    
    cur_ex = current_map.get(lid)
    cur_questions = cur_ex['questions'] if cur_ex else []
    cur_q_map = {q['id']: q for q in cur_questions}
    # Also map by content snippet or number
    
    audit_list = []
    
    for idx, new_q in enumerate(docx_questions):
        old_q = cur_q_map.get(new_q['id'])
        if not old_q and idx < len(cur_questions):
            # check if same index
            candidate = cur_questions[idx]
            # check content similarity
            old_q = candidate

        # Compare
        item_audit = {
            "lesson": lid,
            "number": new_q['number'],
            "id": new_q['id'],
            "type": new_q['type'],
            "content": new_q['content'],
            "status": "PASS",
            "details": [],
            "old_answers": None,
            "new_answers": None,
            "pdf_basis": ""
        }
        
        if not old_q:
            item_audit["status"] = "ADDED"
            item_audit["details"].append("Câu hỏi mới bổ sung từ tài liệu Word")
            item_audit["new_answers"] = new_q.get("correctAnswers") or [it["correctAnswer"] for it in new_q.get("items", [])]
        else:
            item_audit["old_answers"] = old_q.get("correctAnswers") or [it["correctAnswer"] for it in old_q.get("items", [])]
            item_audit["new_answers"] = new_q.get("correctAnswers") or [it["correctAnswer"] for it in new_q.get("items", [])]
            
            # Compare type
            if old_q.get("type") != new_q.get("type"):
                item_audit["status"] = "FIXED"
                item_audit["details"].append(f"Loại câu hỏi đổi từ {old_q.get('type')} sang {new_q.get('type')}")
                
            # Compare correct answers
            if item_audit["old_answers"] != item_audit["new_answers"]:
                item_audit["status"] = "FIXED"
                item_audit["details"].append(f"Đáp án đổi từ {item_audit['old_answers']} sang {item_audit['new_answers']}")
                
            # Compare options content
            if new_q.get("options") and old_q.get("options"):
                if len(new_q["options"]) != len(old_q["options"]):
                    item_audit["status"] = "FIXED"
                    item_audit["details"].append(f"Số phương án thay đổi: {len(old_q['options'])} -> {len(new_q['options'])}")
                else:
                    for opt_i in range(len(new_q["options"])):
                        n_opt = new_q["options"][opt_i]
                        o_opt = old_q["options"][opt_i]
                        if n_opt["content"].strip() != o_opt["content"].strip():
                            item_audit["details"].append(f"Phương án {n_opt['key']} được cập nhật nội dung")
                            
        audit_list.append(item_audit)
        
    all_audit_results[lid] = audit_list
    
    print(f"\n[{lid}] Audit summary:")
    status_counts = {}
    for a in audit_list:
        status_counts[a['status']] = status_counts.get(a['status'], 0) + 1
    print(f"  Total: {len(audit_list)} | Breakdown: {status_counts}")
    fixed_items = [a for a in audit_list if a['status'] == 'FIXED']
    if fixed_items:
        print(f"  Fixed items ({len(fixed_items)}):")
        for f_it in fixed_items:
            print(f"    Câu {f_it['number']}: {', '.join(f_it['details'])}")

with open('docs/audit_raw_results.json', 'w', encoding='utf-8') as f:
    json.dump(all_audit_results, f, ensure_ascii=False, indent=2)

print("\nSaved docs/audit_raw_results.json")
