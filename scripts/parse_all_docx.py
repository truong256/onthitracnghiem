import docx, re, json, sys, os
import xml.etree.ElementTree as ET
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

RED_COLORS = {'FF0000', 'C00000', 'EE0000', 'RED'}

def run_is_red(r):
    root = ET.fromstring(r._r.xml)
    for elem in root.iter():
        if elem.tag.endswith('color') or elem.tag.endswith('highlight'):
            val = elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '').upper()
            if val in RED_COLORS:
                return True
    return False

def p_has_red(paragraph):
    for r in paragraph.runs:
        if run_is_red(r) and r.text.strip():
            return True
    return False

def get_p_red_text(paragraph):
    reds = [r.text for r in paragraph.runs if run_is_red(r)]
    return "".join(reds).strip()

def split_multiline_para(p):
    """
    If a paragraph contains multiple lines with options (e.g. A. ..., \n B. ...),
    we split into individual option lines with is_red flag.
    """
    lines = []
    current_text = ""
    current_is_red = False
    
    for r in p.runs:
        r_text = r.text
        r_red = run_is_red(r)
        
        parts = r_text.split('\n')
        for i, part in enumerate(parts):
            if i > 0:
                if current_text.strip():
                    lines.append({
                        "text": current_text.strip(),
                        "is_red": current_is_red
                    })
                current_text = ""
                current_is_red = False
            current_text += part
            if r_red and part.strip():
                current_is_red = True
                
    if current_text.strip():
        lines.append({
            "text": current_text.strip(),
            "is_red": current_is_red
        })
    return lines

def parse_docx(doc_path, lesson_id):
    doc = docx.Document(doc_path)
    body_elements = []
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            txt = p.text.strip()
            if txt:
                body_elements.append(('P', txt, p))
        elif isinstance(child, CT_Tbl):
            t = Table(child, doc)
            body_elements.append(('TBL', '', t))

    # Identify question boundaries
    raw_questions = []
    current_q_elements = []
    
    for idx, el in enumerate(body_elements):
        if el[0] == 'P':
            txt = el[1]
            # Match question header: Câu 1, Câu 1:, Câu 1., Câu : Kéo thả
            m = re.match(r'^(Câu\s*\d*[:.]?)\s*(.*)', txt, re.IGNORECASE)
            is_q_header = False
            if m:
                prefix = m.group(1).strip()
                rest = m.group(2).strip()
                # Check if it is a real question header (not an option mentioning câu)
                if not re.match(r'^[A-D][.:]\s*', txt) and (prefix != 'Câu' or 'kéo thả' in rest.lower() or 'ghép' in rest.lower()):
                    is_q_header = True
            
            if is_q_header:
                if current_q_elements:
                    raw_questions.append(current_q_elements)
                current_q_elements = [el]
            else:
                if current_q_elements:
                    current_q_elements.append(el)
        elif el[0] == 'TBL':
            if current_q_elements:
                current_q_elements.append(el)

    if current_q_elements:
        raw_questions.append(current_q_elements)

    print(f"[{lesson_id}] Extracted {len(raw_questions)} raw questions from {doc_path}")
    return raw_questions

for lid, path in [
    ('bai-1', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx'),
    ('bai-2', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx'),
    ('bai-3', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx'),
    ('bai-4', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx'),
    ('bai-5', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx'),
    ('bai-6', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx')
]:
    qs = parse_docx(path, lid)
    for q_idx, q_els in enumerate(qs):
        h_txt = q_els[0][1]
        print(f"  Q{q_idx+1}: {h_txt[:60]} (elements: {len(q_els)})")
