import docx, re, json, sys, os
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

RED_COLORS = {'FF0000', 'C00000', 'EE0000', 'RED'}

def run_is_red(r):
    for elem in r._r.iter():
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

def split_para_runs(p):
    """
    Split a paragraph that might have embedded newlines \n into separate lines,
    tracking whether each line contains red runs.
    """
    lines = []
    cur_text = ""
    cur_is_red = False
    
    for r in p.runs:
        t = r.text
        is_r = run_is_red(r)
        parts = t.split('\n')
        for i, part in enumerate(parts):
            if i > 0:
                if cur_text.strip():
                    lines.append((cur_text.strip(), cur_is_red))
                cur_text = ""
                cur_is_red = False
            cur_text += part
            if is_r and part.strip():
                cur_is_red = True
    if cur_text.strip():
        lines.append((cur_text.strip(), cur_is_red))
    return lines

def parse_docx_file(doc_path, lesson_id):
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

    # Slice into question blocks
    q_blocks = []
    current_block = []
    
    for el in body_elements:
        if el[0] == 'P':
            txt = el[1]
            m = re.match(r'^(Câu\s*\d*[:.]?)\s*(.*)', txt, re.IGNORECASE)
            is_q_header = False
            if m:
                prefix = m.group(1).strip()
                rest = m.group(2).strip()
                if not re.match(r'^[A-D][.:]\s*', txt):
                    if prefix != 'Câu' or 'kéo thả' in rest.lower() or 'ghép' in rest.lower():
                        is_q_header = True
            if is_q_header:
                if current_block:
                    q_blocks.append(current_block)
                current_block = [el]
            else:
                if current_block:
                    current_block.append(el)
        elif el[0] == 'TBL':
            if current_block:
                current_block.append(el)

    if current_block:
        q_blocks.append(current_block)

    return q_blocks

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
        print(f"{lid}: {len(blocks)} blocks")
