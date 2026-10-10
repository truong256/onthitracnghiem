import docx, sys
from test_converter import parse_docx_file, split_para_runs

def inspect_q_details(doc_path, lesson_id, q_indices):
    blocks = parse_docx_file(doc_path, lesson_id)
    print(f"\n==================== {lesson_id}: {doc_path} ====================")
    for q_idx in q_indices:
        if q_idx <= len(blocks):
            block = blocks[q_idx - 1]
            h_text = block[0][1]
            print(f"\n--- Question {q_idx}: {h_text} ---")
            for el in block[1:]:
                if el[0] == 'P':
                    lines = split_para_runs(el[2])
                    for l_txt, is_r in lines:
                        print(f"  P line: {'[RED]' if is_r else '     '} {l_txt}")
                elif el[0] == 'TBL':
                    t = el[2]
                    print(f"  [TABLE {len(t.rows)}x{len(t.columns) if t.rows else 0}]")
                    for r in t.rows:
                        print(f"    {[c.text.strip().replace(chr(10), ' ') for c in r.cells]}")

# Bai 1: q12
inspect_q_details('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx', 'bai-1', [12])

# Bai 2: q22, q31
inspect_q_details('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx', 'bai-2', [22, 31])

# Bai 3: q20, q21, q22, q23, q24, q29, q30, q31, q32, q33
inspect_q_details('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx', 'bai-3', [20, 21, 22, 23, 24, 29, 30, 31, 32, 33])

# Bai 4: q21, q25, q27
inspect_q_details('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx', 'bai-4', [21, 25, 27])

# Bai 5: q29, q30, q31, q32, q33
inspect_q_details('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx', 'bai-5', [29, 30, 31, 32, 33])
