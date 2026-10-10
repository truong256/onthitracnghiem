import docx, re
import xml.etree.ElementTree as ET

RED_COLORS = {'FF0000', 'C00000', 'EE0000', 'RED'}

def run_is_red(r):
    root = ET.fromstring(r._r.xml)
    for elem in root.iter():
        if elem.tag.endswith('color') or elem.tag.endswith('highlight'):
            val = elem.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '').upper()
            if val in RED_COLORS:
                return True
    return False

def inspect_tf_and_tables(doc_path):
    doc = docx.Document(doc_path)
    print(f"================ {doc_path} ================")
    # Look for TF paragraphs
    for idx, p in enumerate(doc.paragraphs):
        txt = p.text.strip()
        if 'đúng' in txt.lower() and 'sai' in txt.lower():
            print(f"\n--- TF Header at P{idx}: {txt} ---")
            # print next 8 paragraphs
            for j in range(idx+1, min(idx+10, len(doc.paragraphs))):
                pj = doc.paragraphs[j]
                pj_txt = pj.text.strip()
                if not pj_txt:
                    continue
                reds = [r.text for r in pj.runs if run_is_red(r)]
                print(f"  P{j}: {pj_txt} | RED: {repr(''.join(reds))}")
                if re.match(r'^Câu\s*\d+', pj_txt):
                    break

inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx')
inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx')
inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx')
inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx')
inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx')
inspect_tf_and_tables('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx')
