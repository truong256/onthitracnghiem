import glob, os, json
from pypdf import PdfReader

pdf_files = {
    "bai-1": "docs/pdf/Bài 1. Tổng quan về chủ nghĩa xã hội khoa học.pdf",
    "bai-2": "docs/pdf/Bài 2- Chủ nghĩa xã hội và thời kỳ quá độ lên chủ nghĩa xã hội.pdf",
    "bai-3": "docs/pdf/Bài 3-Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa.pdf",
    "bai-4": "docs/pdf/Bài 4-Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf",
    "bai-5": "docs/pdf/Bài 5-Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf",
    "bai-6": "docs/pdf/Bài 6-Vấn đề gia đình trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf"
}

data = {}

for lesson_id, path in pdf_files.items():
    if not os.path.exists(path):
        print(f"Warning: {path} not found")
        continue
    reader = PdfReader(path)
    pages = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({
            "page_num": idx + 1,
            "text": text
        })
    data[lesson_id] = {
        "filename": os.path.basename(path),
        "total_pages": len(pages),
        "pages": pages
    }
    print(f"Loaded {lesson_id}: {len(pages)} pages")

with open("docs/pdf_dump.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved docs/pdf_dump.json successfully")
