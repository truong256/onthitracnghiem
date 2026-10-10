import docx, re, json, sys, os
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

RED_COLORS = {'FF0000', 'C00000', 'EE0000', 'RED'}

def run_is_red(r):
    root = r._r
    # check rPr color
    for elem in root.iter():
        if elem.tag.endswith('color') or elem.tag.endswith('highlight'):
            val = elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '').upper()
            if val in RED_COLORS:
                return True
    return False

def extract_paras_from_doc(doc_path):
    doc = docx.Document(doc_path)
    items = []
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            txt = p.text.strip()
            if txt:
                # check runs
                runs_info = []
                for r in p.runs:
                    runs_info.append({
                        "text": r.text,
                        "is_red": run_is_red(r)
                    })
                items.append(('P', txt, p, runs_info))
        elif isinstance(child, CT_Tbl):
            t = Table(child, doc)
            t_data = []
            for row in t.rows:
                r_cells = []
                for cell in row.cells:
                    c_txt = cell.text.strip()
                    r_cells.append(c_txt)
                t_data.append(r_cells)
            items.append(('TBL', t_data, t, []))
    return items

items_b1 = extract_paras_from_doc('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx')
print(f"Loaded {len(items_b1)} items from Bài 1 docx")

with open('docs/current_data_dump.json', 'r', encoding='utf-8') as f:
    current_data = json.load(f)

b1_current = next(e for e in current_data if e['id'] == 'bai-1')
print(f"Current Bai 1 questions: {len(b1_current['questions'])}")
