import docx, re, json, sys, os
from docx_quiz_parser import parse_docx_file, run_is_red, split_para_runs

def convert_block_to_question(block, lesson_id, q_seq_num):
    h_type, h_text, h_p = block[0]
    
    # Parse header and number
    m = re.match(r'^(Câu\s*(\d*)[:.]?)\s*(.*)', h_text, re.IGNORECASE | re.DOTALL)
    orig_header = m.group(1).strip() if m else f"Câu {q_seq_num}:"
    raw_num = m.group(2).strip() if m else ""
    content_raw = m.group(3).strip() if m else h_text
    
    # Clean header format e.g. "Câu 1:"
    header = f"Câu {q_seq_num}:"
    q_id = f"{lesson_id}-q{q_seq_num}"
    
    # Check for instruction note inside content
    instruction_note = ""
    note_m = re.search(r'\(([^)]*(?:chọn|phương án|đáp án|đúng hoặc sai)[^)]*)\)', content_raw, re.IGNORECASE)
    if note_m:
        note_str = note_m.group(1).strip()
        if 'chọn' in note_str.lower() and ('2' in note_str or 'hai' in note_str):
            instruction_note = "Sinh viên chọn 2 phương án đúng nhất"
        elif 'chọn' in note_str.lower() and ('3' in note_str or 'ba' in note_str):
            instruction_note = "Sinh viên chọn 3 phương án đúng nhất"
        elif 'nhiều' in note_str.lower():
            instruction_note = "Sinh viên chọn các phương án đúng nhất"
        elif 'đúng hoặc sai' in note_str.lower():
            instruction_note = "Chọn Đúng hoặc Sai cho từng nhận định"

    # Determine type
    lower_h = h_text.lower()
    
    # TYPE 1: True / False Group
    if 'đúng hoặc sai' in lower_h or 'đúng và sai' in lower_h or 'đúng/sai' in lower_h:
        items = []
        cur_stmt = ""
        order = 1
        
        # Iterate over remaining elements
        all_lines = []
        for el in block[1:]:
            if el[0] == 'P':
                lines = split_para_runs(el[2])
                for line_text, is_red in lines:
                    all_lines.append((line_text.strip(), is_red))
        
        i = 0
        while i < len(all_lines):
            line_text, is_red = all_lines[i]
            # check if line is an answer "Đúng" or "Sai"
            ans_clean = line_text.replace('“', '').replace('”', '').replace('.', '').strip()
            if ans_clean in ['Đúng', 'Sai']:
                # The previous statement gets this answer
                if cur_stmt:
                    # Clean statement prefix like 1., 1), “...”, etc.
                    stmt_clean = re.sub(r'^\d+[\.\)]\s*', '', cur_stmt).strip()
                    stmt_clean = stmt_clean.strip('“”"\' ')
                    items.append({
                        "order": order,
                        "statement": stmt_clean,
                        "correctAnswer": ans_clean
                    })
                    order += 1
                    cur_stmt = ""
            else:
                if cur_stmt:
                    # Sometimes a statement spans multiple lines
                    cur_stmt += " " + line_text
                else:
                    cur_stmt = line_text
            i += 1
            
        return {
            "id": q_id,
            "number": q_seq_num,
            "type": "true_false_group",
            "header": header,
            "content": content_raw if content_raw else h_text,
            "instructionNote": instruction_note or "Chọn Đúng hoặc Sai cho từng nhận định",
            "items": items,
            "needsReview": len(items) == 0,
            "reviewReason": "Không trích xuất được phát biểu Đúng/Sai" if len(items) == 0 else ""
        }

    # TYPE 2: Drag and drop (columns or pairs)
    if 'kéo thả' in lower_h or 'ghép' in lower_h:
        # Find table
        tbl_el = next((el for el in block if el[0] == 'TBL'), None)
        if tbl_el:
            t = tbl_el[2]
            # Check rows
            if len(t.rows) == 2:
                # Columns mode
                col_headers = [c.text.strip().replace('\n', ' ') for c in t.rows[0].cells]
                # row 1 contains items
                cols = []
                all_pool = []
                for c_idx, cell in enumerate(t.rows[1].cells):
                    c_title = col_headers[c_idx] if c_idx < len(col_headers) else f"Cột {c_idx+1}"
                    # Items can be split by newlines or bullet points
                    raw_items = cell.text.split('\n')
                    clean_items = []
                    for it in raw_items:
                        it_s = it.strip()
                        if it_s:
                            # If items are separated by multiple spaces or tabs
                            parts = re.split(r'\s{2,}|\t+', it_s)
                            for p in parts:
                                if p.strip():
                                    clean_items.append(p.strip())
                    cols.append({
                        "id": f"col-{c_idx+1}",
                        "title": c_title,
                        "correctItems": clean_items
                    })
                    all_pool.extend(clean_items)
                return {
                    "id": q_id,
                    "number": q_seq_num,
                    "type": "drag_drop_columns",
                    "header": header,
                    "content": content_raw if content_raw else h_text,
                    "instructionNote": "Kéo thả các mục vào đúng cột phân loại",
                    "columns": cols,
                    "optionsPool": all_pool,
                    "needsReview": False
                }
            else:
                # Standard pairs mode
                pairs = []
                for r_idx, r in enumerate(t.rows):
                    cells = r.cells
                    if len(cells) >= 2:
                        p_txt = cells[0].text.strip().replace('\n', ' ')
                        a_txt = cells[1].text.strip().replace('\n', ' ')
                        if p_txt and a_txt:
                            pairs.append({
                                "id": f"pair-{r_idx+1}",
                                "prompt": p_txt,
                                "correctAnswer": a_txt
                            })
                return {
                    "id": q_id,
                    "number": q_seq_num,
                    "type": "drag_drop",
                    "header": header,
                    "content": content_raw if content_raw else h_text,
                    "instructionNote": "Kéo các thẻ đáp án vào vị trí tương ứng",
                    "pairs": pairs,
                    "optionsPool": [p["correctAnswer"] for p in pairs],
                    "needsReview": len(pairs) == 0
                }

    # TYPE 3: Single Choice / Multiple Choice
    # Gather options
    options = []
    opt_lines = []
    for el in block[1:]:
        if el[0] == 'P':
            lines = split_para_runs(el[2])
            for l_txt, is_red in lines:
                opt_lines.append((l_txt.strip(), is_red))

    # Match options starting with A, B, C, D (or A., B., C., D.)
    current_key = None
    current_opt_text = ""
    current_opt_red = False

    for l_txt, is_red in opt_lines:
        opt_m = re.match(r'^([A-D])[.:\)]\s*(.*)', l_txt)
        if opt_m:
            if current_key:
                options.append({
                    "key": current_key,
                    "content": current_opt_text.strip(),
                    "isCorrect": current_opt_red
                })
            current_key = opt_m.group(1).upper()
            current_opt_text = opt_m.group(2).strip()
            current_opt_red = is_red
        else:
            if current_key:
                current_opt_text += " " + l_txt
                if is_red:
                    current_opt_red = True

    if current_key:
        options.append({
            "key": current_key,
            "content": current_opt_text.strip(),
            "isCorrect": current_opt_red
        })

    correct_keys = [o["key"] for o in options if o["isCorrect"]]
    
    # Determine single vs multiple choice
    is_multi = len(correct_keys) > 1 or ('chọn' in lower_h and ('2' in lower_h or 'hai' in lower_h or 'nhiều' in lower_h))
    q_type = 'multiple_choice' if is_multi else 'single_choice'
    
    needs_review = len(options) < 2 or len(correct_keys) == 0
    review_reason = ""
    if len(options) < 2:
        review_reason = f"Thiếu phương án lựa chọn (chỉ tìm thấy {len(options)})"
    elif len(correct_keys) == 0:
        review_reason = "Không tìm thấy đáp án tô đỏ trong Word"

    return {
        "id": q_id,
        "number": q_seq_num,
        "type": q_type,
        "header": header,
        "content": content_raw if content_raw else h_text,
        "instructionNote": instruction_note,
        "options": options,
        "correctAnswers": correct_keys,
        "needsReview": needs_review,
        "reviewReason": review_reason
    }

if __name__ == '__main__':
    for lid, path in [
        ('bai-1', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx'),
        ('bai-2', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx'),
        ('bai-3', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx'),
        ('bai-4', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx'),
        ('bai-5', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx'),
        ('bai-6', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx')
    ]:
        blocks = parse_docx_file(path, lid)
        print(f"\n==================== {lid} ({len(blocks)} questions) ====================")
        converted = [convert_block_to_question(b, lid, idx+1) for idx, b in enumerate(blocks)]
        types_count = {}
        reviews = []
        for q in converted:
            types_count[q["type"]] = types_count.get(q["type"], 0) + 1
            if q["needsReview"]:
                reviews.append(f"{q['id']}: {q['reviewReason']}")
        print(f"Types breakdown: {types_count}")
        print(f"Needs review: {len(reviews)}")
        for r in reviews:
            print("  ", r)
