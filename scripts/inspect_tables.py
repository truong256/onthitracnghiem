import docx, re, sys
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

files = [
    ('bai-1', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx'),
    ('bai-2', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx'),
    ('bai-3', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx'),
    ('bai-4', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx'),
    ('bai-5', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx'),
    ('bai-6', 'CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx')
]

for lid, path in files:
    doc = docx.Document(path)
    print(f"\n==================== {lid}: {path} ====================")
    elements = []
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            txt = p.text.strip()
            if txt:
                elements.append(('P', txt, p))
        elif isinstance(child, CT_Tbl):
            t = Table(child, doc)
            elements.append(('TBL', t))

    for idx, el in enumerate(elements):
        if el[0] == 'TBL':
            t = el[1]
            # Context
            context_p = []
            for k in range(max(0, idx-4), idx):
                if elements[k][0] == 'P':
                    context_p.append(elements[k][1])
            print(f"\n[Table at index {idx}] Context:\n  " + "\n  ".join(context_p[-2:]))
            print("  Table content:")
            for r_idx, r in enumerate(t.rows):
                row_txt = [c.text.strip().replace('\n', ' ') for c in r.cells]
                print(f"    Row {r_idx}: {row_txt}")
