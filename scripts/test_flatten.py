import docx, re, json, sys
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

def parse_docx_lesson(doc_path, lesson_id):
    doc = docx.Document(doc_path)
    
    # 1. Flatten body into sequential items: ('P', Paragraph) or ('TBL', Table)
    elements = []
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            txt = p.text.strip()
            elements.append(('P', txt, p))
        elif isinstance(child, CT_Tbl):
            t = Table(child, doc)
            elements.append(('TBL', '', t))
            
    print(f"[{lesson_id}] Total body elements: {len(elements)}")
    return elements

for lid, path in [
    ('bai-1', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx'),
    ('bai-2', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx'),
    ('bai-3', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx'),
    ('bai-4', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx'),
    ('bai-5', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx'),
    ('bai-6', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx')
]:
    parse_docx_lesson(path, lid)
