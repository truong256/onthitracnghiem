import json

with open('docs/full_extracted_dataset.json', 'r', encoding='utf-8') as f:
    full_data = json.load(f)

total_q = sum(len(ex['questions']) for ex in full_data)

header = f"""/**
 * DỮ LIỆU CÂU HỎI TRẮC NGHIỆM CHỦ NGHĨA XÃ HỘI KHOA HỌC
 * Trích xuất 100% từ các file Word .docx mới nhất do người dùng chỉnh sửa:
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 ({len(full_data[0]['questions'])} câu)
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2 ({len(full_data[1]['questions'])} câu)
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3 ({len(full_data[2]['questions'])} câu)
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4 ({len(full_data[3]['questions'])} câu)
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5 ({len(full_data[4]['questions'])} câu)
 * - CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6 ({len(full_data[5]['questions'])} câu)
 * Tổng cộng: {total_q} câu hỏi thực tế được đối chiếu xác minh với PDF bài giảng.
 */

export const INITIAL_QUIZ_DATA = """

json_str = json.dumps(full_data, ensure_ascii=False, indent=2)

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write(header + json_str + ";\n")

print(f"Generated js/data.js with {len(full_data)} exercises and {total_q} questions.")
