import docx, re, json
import xml.etree.ElementTree as ET
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

RED_COLORS = {'FF0000', 'C00000', 'EE0000', 'RED'}

def run_is_red(run):
    root = ET.fromstring(run._r.xml)
    for elem in root.iter():
        if elem.tag.endswith('color'):
            val = elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '').upper()
            if val in RED_COLORS:
                return True
        if elem.tag.endswith('highlight'):
            val = elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '').upper()
            if val in RED_COLORS:
                return True
    return False

def p_has_red(paragraph):
    for r in paragraph.runs:
        if run_is_red(r):
            # check if non-empty text
            if r.text.strip():
                return True
    return False

def get_p_red_text(paragraph):
    red_parts = []
    for r in paragraph.runs:
        if run_is_red(r) and r.text:
            red_parts.append(r.text)
    return "".join(red_parts).strip()

def inspect_doc(doc_path):
    doc = docx.Document(doc_path)
    body_elements = []
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            txt = p.text.strip()
            if txt:
                body_elements.append({
                    "type": "p",
                    "text": txt,
                    "has_red": p_has_red(p),
                    "red_text": get_p_red_text(p),
                    "obj": p
                })
        elif isinstance(child, CT_Tbl):
            t = Table(child, doc)
            rows = []
            for r in t.rows:
                cells = []
                for c in r.cells:
                    c_paras = []
                    for cp in c.paragraphs:
                        c_paras.append({
                            "text": cp.text.strip(),
                            "has_red": p_has_red(cp),
                            "red_text": get_p_red_text(cp)
                        })
                    cells.append(c_paras)
                rows.append(cells)
            body_elements.append({
                "type": "tbl",
                "rows": rows,
                "obj": t
            })
    return body_elements

files = [
    ("bai-1", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx"),
    ("bai-2", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx"),
    ("bai-3", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx"),
    ("bai-4", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx"),
    ("bai-5", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx"),
    ("bai-6", "CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx")
]

for lid, path in files:
    elems = inspect_doc(path)
    print(f"=== {lid}: {path} ({len(elems)} elements) ===")
    q_indices = []
    for i, el in enumerate(elems):
        if el["type"] == "p":
            m = re.match(r'^(Câu\s*\d*[:.]?)\s*(.*)', el["text"], re.IGNORECASE)
            if m and (m.group(1).strip() != "Câu" or "kéo thả" in m.group(2).lower()):
                q_indices.append((i, el["text"][:70]))
    print(f"Detected {len(q_indices)} question headers:")
    for idx, (el_idx, txt) in enumerate(q_indices):
        print(f"  [{idx+1}] El {el_idx}: {txt}")
