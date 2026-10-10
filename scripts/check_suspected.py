import docx, re, json, sys
sys.path.append('scripts')
from inspect_tf import run_is_red

with open('docs/pdf_dump.json', 'r', encoding='utf-8') as f:
    pdf_dump = json.load(f)

# Load data.js via node or regex or parse
# Let's write a quick script to inspect current data in data.js vs docx for these questions

def get_docx_question(doc_path, q_num):
    doc = docx.Document(doc_path)
    paras = doc.paragraphs
    target_p = None
    target_idx = None
    for idx, p in enumerate(paras):
        txt = p.text.strip()
        m = re.match(rf'^Câu\s*{q_num}[:.]?\s*(.*)', txt, re.IGNORECASE)
        if m:
            target_p = p
            target_idx = idx
            break
    if target_idx is None:
        return f"Question {q_num} not found in {doc_path}"
    
    # Collect following paras until next Câu or table
    q_text = paras[target_idx].text.strip()
    opts = []
    for j in range(target_idx + 1, len(paras)):
        pj = paras[j]
        txt = pj.text.strip()
        if not txt:
            continue
        if re.match(r'^Câu\s*\d+', txt):
            break
        reds = [r.text for r in pj.runs if run_is_red(r)]
        opts.append({
            "text": txt,
            "red_parts": "".join(reds).strip(),
            "is_red": bool("".join(reds).strip())
        })
    return {
        "header": q_text,
        "options": opts
    }

suspected = [
    ("bai-1", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx", [7, 10]),
    ("bai-2", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx", [22, 28]),
    ("bai-3", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx", [13, 16]),
    ("bai-4", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx", [17, 24]),
    ("bai-5", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx", [7, 19, 30])
]

for lid, dpath, qnums in suspected:
    print(f"\n==================== {lid}: {dpath} ====================")
    for qn in qnums:
        res = get_docx_question(dpath, qn)
        print(f"\n--- Câu {qn} ---")
        if isinstance(res, dict):
            print("Content:", res["header"])
            for o in res["options"]:
                print(f"  [{ 'RED' if o['is_red'] else '   ' }] {o['text']} (Red: {repr(o['red_parts'])})")
        else:
            print(res)
