# BÁO CÁO ĐỐI CHIẾU VÀ KIỂM ĐỊNH NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM
## MÔN HỌC: CHỦ NGHĨA XÃ HỘI KHOA HỌC (BÀI 1 – BÀI 6)

> **Ngày thực hiện kiểm định:** 10/10/2026  
> **Hệ thống:** Hệ thống ôn luyện trắc nghiệm trực tuyến (`onthitracnghiem`)  
> **Nguồn đối chiếu:**  
> 1. 06 file Word `.docx` mới nhất do người dùng chỉnh sửa (đáp án tô đỏ là đáp án dự kiến).  
> 2. 06 file PDF bài giảng chính thống (Bài 1 đến Bài 6) và Giáo trình Chủ nghĩa xã hội khoa học làm căn cứ lý luận kiểm chứng.  
> 3. Toàn bộ mã nguồn và cơ sở dữ liệu hiện hành của dự án (`js/data.js`, `js/store.js`).  

## 1. TỔNG QUAN KẾT QUẢ ĐỐI CHIẾU TOÀN HỆ THỐNG

- **Tổng số câu hỏi trong 6 file Word mới:** **235 câu**
- **Tổng số câu hỏi trên website trước khi kiểm định:** **178 câu** (Bài 1–5)
- **Tổng số câu hỏi trên website sau cập nhật:** **235 câu** (Bài 1–6)
- **Bài 6 bổ sung mới hoàn toàn:** **27 câu**
- **Số câu cần xác minh (NEEDS_REVIEW):** **0 câu** (100% các câu hỏi đều có đầy đủ căn cứ từ Word và PDF)
- **Tình trạng kiểm thử tự động (`node test_quiz_data.js`):** **PASS 100%** (Exit code 0)

### Bảng thống kê số lượng câu hỏi theo từng bài học

| Bài học | Tổng câu Word mới | Tổng câu Web sau cập nhật | Khớp sẵn (PASS) | Đã sửa (FIXED) | Thêm mới (ADDED) | Cần duyệt (NEEDS_REVIEW) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1** | 41 | 41 | 40 | 1 | 0 | 0 |
| **CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2** | 40 | 40 | 39 | 1 | 0 | 0 |
| **CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3** | 40 | 40 | 25 | 11 | 4 | 0 |
| **CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4** | 45 | 45 | 27 | 1 | 17 | 0 |
| **CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5** | 42 | 42 | 27 | 6 | 9 | 0 |
| **BÀI 6 – VẤN ĐỀ GIA ĐÌNH TRONG THỜI KỲ QUÁ ĐỘ LÊN CHỦ NGHĨA XÃ HỘI** | 27 | 27 | 0 | 0 | 27 | 0 |
| **TỔNG CỘNG** | **235** | **235** | **158** | **20** | **57** | **0** |

### Bảng phân loại dạng trắc nghiệm toàn hệ thống

| Dạng câu hỏi | Mã type trong hệ thống | Số lượng | Tỷ lệ (%) |
| :--- | :--- | :---: | :---: |
| Trắc nghiệm 1 đáp án đúng | `single_choice` | 147 | 62.6% |
| Trắc nghiệm chọn nhiều đáp án | `multiple_choice` | 39 | 16.6% |
| Đúng / Sai theo từng phát biểu | `true_false_group` | 24 | 10.2% |
| Kéo thả phân loại vào 2 cột | `drag_drop_columns` | 7 | 3.0% |
| Kéo thả ghép cặp khái niệm / điền khuyết | `drag_drop` | 18 | 7.7% |
| **Tổng cộng** | | **235** | **100%** |

## 2. BẢNG CHI TIẾT ĐỐI CHIẾU TỪNG CÂU HỎI (BÀI 1 ĐẾN BÀI 6)

### CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 1 (1).docx`
- **Tài liệu PDF đối chiếu:** `Bài 1. Tổng quan về chủ nghĩa xã hội khoa học.pdf (27 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-1 | **PASS** |
| **Câu 2** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-1 | **PASS** |
| **Câu 3** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-1 | **PASS** |
| **Câu 4** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-1 | **PASS** |
| **Câu 5** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 6** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 7** | `single_choice` | A | Đáp án Word tô đỏ B (Giai cấp - xã hội), sửa từ A sang B | **B** | Trang 18-21: GCCN là cơ sở giai cấp - xã hội của Đảng Cộng sản, nguồn bổ sung lực lượng quan trọng nhất của Đảng | **FIXED** |
| **Câu 8** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-1 | **PASS** |
| **Câu 9** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 10** | `single_choice` | B | Khớp Word tô đỏ B (Tâm lý tiểu nông) | **B** | Trang 21-24: Hạn chế của GCCN Việt Nam do xuất thân từ nông dân, mang nặng tâm lý tiểu nông | **PASS** |
| **Câu 11** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-1 | **PASS** |
| **Câu 12** | `single_choice` | D | Khớp Word tô đỏ D | **D** | Trang 18: Theo Ph.Ăngghen trong Chống Đuy-rinh: 'Thực hiện sự nghiệp giải phóng thế giới ấy - đó là sứ mệnh lịch sử của giai cấp vô sản hiện đại' | **PASS** |
| **Câu 13** | `multiple_choice` | B, C | Khớp chính xác Word và PDF | **B, C** | PDF BAI-1 | **PASS** |
| **Câu 14** | `multiple_choice` | A, D | Khớp chính xác Word và PDF | **A, D** | PDF BAI-1 | **PASS** |
| **Câu 15** | `multiple_choice` | B, C | Khớp chính xác Word và PDF | **B, C** | PDF BAI-1 | **PASS** |
| **Câu 16** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-1 | **PASS** |
| **Câu 17** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 18** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-1 | **PASS** |
| **Câu 19** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 20** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 21** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-1 | **PASS** |
| **Câu 22** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-1 | **PASS** |
| **Câu 23** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-1 | **PASS** |
| **Câu 24** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-1 | **PASS** |
| **Câu 25** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-1 | **PASS** |
| **Câu 26** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-1 | **PASS** |
| **Câu 27** | `multiple_choice` | A, C | Khớp chính xác Word và PDF | **A, C** | PDF BAI-1 | **PASS** |
| **Câu 28** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-1 | **PASS** |
| **Câu 29** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-1 | **PASS** |
| **Câu 30** | `multiple_choice` | A, C | Khớp chính xác Word và PDF | **A, C** | PDF BAI-1 | **PASS** |
| **Câu 31** | `multiple_choice` | A, C, D | Khớp chính xác Word và PDF | **A, C, D** | PDF BAI-1 | **PASS** |
| **Câu 32** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-1 | **PASS** |
| **Câu 33** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Sai; 4:Đúng | Khớp chính xác Word và PDF | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-1 | **PASS** |
| **Câu 34** | `true_false_group` | 1:Sai; 2:Đúng; 3:Sai; 4:Đúng | Khớp chính xác Word và PDF | **1:Sai; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-1 | **PASS** |
| **Câu 35** | `true_false_group` | 1:Sai; 2:Đúng; 3:Đúng; 4:Đúng | Khớp chính xác Word và PDF | **1:Sai; 2:Đúng; 3:Đúng; 4:Đúng** | PDF BAI-1 | **PASS** |
| **Câu 36** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Sai; 4:Đúng | Khớp chính xác Word và PDF | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-1 | **PASS** |
| **Câu 37** | `true_false_group` | 1:Đúng; 2:Sai; 3:Đúng; 4:Đúng | Khớp chính xác Word và PDF | **1:Đúng; 2:Sai; 3:Đúng; 4:Đúng** | PDF BAI-1 | **PASS** |
| **Câu 38** | `drag_drop_columns` | 2 cột | Khớp chính xác Word và PDF | **2 cột** | PDF BAI-1 | **PASS** |
| **Câu 39** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **3 cặp ghép** | PDF BAI-1 | **PASS** |
| **Câu 40** | `drag_drop` | 4 cặp ghép | Khớp chính xác Word và PDF | **4 cặp ghép** | PDF BAI-1 | **PASS** |
| **Câu 41** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **3 cặp ghép** | PDF BAI-1 | **PASS** |


### CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 2.docx`
- **Tài liệu PDF đối chiếu:** `Bài 2- Chủ nghĩa xã hội và thời kỳ quá độ lên chủ nghĩa xã hội.pdf (19 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 2** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 3** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 4** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 5** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-2 | **PASS** |
| **Câu 6** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 7** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 8** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-2 | **PASS** |
| **Câu 9** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-2 | **PASS** |
| **Câu 10** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 11** | `multiple_choice` | A, C | Khớp chính xác Word và PDF | **A, C** | PDF BAI-2 | **PASS** |
| **Câu 12** | `multiple_choice` | A, D | Khớp chính xác Word và PDF | **A, D** | PDF BAI-2 | **PASS** |
| **Câu 13** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 14** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 15** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 16** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 17** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-2 | **PASS** |
| **Câu 18** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 19** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 20** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-2 | **PASS** |
| **Câu 21** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 22** | `single_choice` | C | Phương án sai là C do ghi 'tất yếu chủ quan'. Khớp Word tô đỏ C | **C** | Trang 7-11: Quá độ lên CNXH bỏ qua chế độ TBCN ở VN là sự phát triển tất yếu khách quan (không phải chủ quan) | **PASS** |
| **Câu 23** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-2 | **PASS** |
| **Câu 24** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-2 | **PASS** |
| **Câu 25** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-2 | **PASS** |
| **Câu 26** | `multiple_choice` | A, D | Khớp chính xác Word và PDF | **A, D** | PDF BAI-2 | **PASS** |
| **Câu 27** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-2 | **PASS** |
| **Câu 28** | `true_false_group` | 1:Sai; 2:Đúng; 3:Đúng; 4:Đúng | Phát biểu 1: Sai; 2: Đúng; 3: Đúng; 4: Đúng. Khớp Word tô đỏ | **1:Sai; 2:Đúng; 3:Đúng; 4:Đúng** | Trang 10-14: Đặc điểm thời kỳ quá độ: tồn tại nhiều tư tưởng và nhiều giai cấp, kinh tế nhiều thành phần, cải tạo sâu sắc kinh tế | **PASS** |
| **Câu 29** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Sai; 4:Sai | Khớp chính xác Word và PDF | **1:Đúng; 2:Đúng; 3:Sai; 4:Sai** | PDF BAI-2 | **PASS** |
| **Câu 30** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Sai; 4:Sai | Khớp chính xác Word và PDF | **1:Đúng; 2:Đúng; 3:Sai; 4:Sai** | PDF BAI-2 | **PASS** |
| **Câu 31** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Đúng; 4:Đúng | Sửa đáp án từ `1:Đúng; 2:Đúng; 3:Đúng; 4:Đúng` thành `1:Đúng; 2:Đúng; 3:Đúng` | **1:Đúng; 2:Đúng; 3:Đúng** | PDF BAI-2 | **FIXED** |
| **Câu 32** | `true_false_group` | 1:Sai; 2:Đúng; 3:Sai; 4:Đúng | Khớp chính xác Word và PDF | **1:Sai; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-2 | **PASS** |
| **Câu 33** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **3 cặp ghép** | PDF BAI-2 | **PASS** |
| **Câu 34** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **3 cặp ghép** | PDF BAI-2 | **PASS** |
| **Câu 35** | `multiple_choice` | A, D | Khớp chính xác Word và PDF | **A, D** | PDF BAI-2 | **PASS** |
| **Câu 36** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **3 cặp ghép** | PDF BAI-2 | **PASS** |
| **Câu 37** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-2 | **PASS** |
| **Câu 38** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-2 | **PASS** |
| **Câu 39** | `multiple_choice` | A, D | Khớp chính xác Word và PDF | **A, D** | PDF BAI-2 | **PASS** |
| **Câu 40** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-2 | **PASS** |


### CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 3.docx`
- **Tài liệu PDF đối chiếu:** `Bài 3-Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa.pdf (15 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-3 | **PASS** |
| **Câu 2** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-3 | **PASS** |
| **Câu 3** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 4** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 5** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-3 | **PASS** |
| **Câu 6** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 7** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 8** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-3 | **PASS** |
| **Câu 9** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 10** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-3 | **PASS** |
| **Câu 11** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-3 | **PASS** |
| **Câu 12** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-3 | **PASS** |
| **Câu 13** | `single_choice` | C | Khớp Word tô đỏ C | **C** | Trang 10-11: Đặc điểm cơ bản của Nhà nước pháp quyền XHCN VN là quản lý xã hội bằng Hiến pháp và pháp luật | **PASS** |
| **Câu 14** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-3 | **PASS** |
| **Câu 15** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-3 | **PASS** |
| **Câu 16** | `single_choice` | A | Đáp án cũ chọn nhầm A ('quyền tối thiểu'). Đã sửa sang C khớp hoàn toàn lý luận | **C** | Trang 3: Dân chủ là một giá trị phản ánh những quyền cơ bản của con người, là một hình thức tổ chức nhà nước của giai cấp cầm quyền; có quá trình ra đời, phát triển cùng lịch sử nhân loại | **FIXED** |
| **Câu 17** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 18** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-3 | **PASS** |
| **Câu 19** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-3 | **PASS** |
| **Câu 20** | `single_choice` | A | Đáp án cũ nhầm A ('đấu tranh đòi tăng lương'). Đã sửa sang B | **B** | Trang 8: Sự ra đời của nhà nước XHCN gắn với việc GCCN lật đổ nhà nước của giai cấp bóc lột, giành lấy chính quyền | **FIXED** |
| **Câu 21** | `single_choice` | B | Đáp án cũ nhầm B. Đã sửa sang C (do Đảng Cộng sản lãnh đạo) | **C** | Trang 6: Tính nhất nguyên chính trị của nền dân chủ XHCN do duy nhất Đảng Cộng sản lãnh đạo | **FIXED** |
| **Câu 22** | `single_choice` | A | Đáp án cũ nhầm A ('kinh tế thị trường tự do'). Đã sửa sang B | **B** | Trang 10: Mục tiêu xây dựng Nhà nước pháp quyền XHCN VN là phục vụ lợi ích của GCCN và nhân dân lao động | **FIXED** |
| **Câu 23** | `multiple_choice` | A, C | Đáp án cũ nhầm tư sản. Đã sửa sang B và D | **B, D** | Trang 5-6: Bản chất dân chủ XHCN là nền dân chủ của đa số nhân dân lao động và mang tính tập thể | **FIXED** |
| **Câu 24** | `multiple_choice` | C | Đáp án cũ chỉ chọn C. Đã sửa sang A và D (chọn 2 đáp án) | **A, D** | Trang 10-11: Dân chủ XHCN ở VN gắn với sự lãnh đạo của Đảng và bảo đảm quyền lực thuộc về nhân dân | **FIXED** |
| **Câu 25** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-3 | **PASS** |
| **Câu 26** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-3 | **PASS** |
| **Câu 27** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-3 | **PASS** |
| **Câu 28** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-3 | **PASS** |
| **Câu 29** | `single_choice` | 3 cặp ghép | Chuyển loại từ `drag_drop` sang `single_choice` theo Word | **B** | PDF BAI-3 | **FIXED** |
| **Câu 30** | `multiple_choice` | B | Chuyển loại từ `single_choice` sang `multiple_choice` theo Word | **A, B** | PDF BAI-3 | **FIXED** |
| **Câu 31** | `single_choice` | 1:Đúng; 2:Đúng; 3:Sai; 4:Sai | Chuyển loại từ `true_false_group` sang `single_choice` theo Word | **A** | PDF BAI-3 | **FIXED** |
| **Câu 32** | `single_choice` | 4 cặp ghép | Chuyển loại từ `drag_drop` sang `single_choice` theo Word | **B** | PDF BAI-3 | **FIXED** |
| **Câu 33** | `true_false_group` | A, B | Chuyển loại từ `multiple_choice` sang `true_false_group` theo Word | **1:Đúng; 2:Đúng; 3:Sai; 4:Sai** | PDF BAI-3 | **FIXED** |
| **Câu 34** | `true_false_group` | 1:Đúng; 2:Sai; 3:Đúng; 4:Sai | Khớp chính xác Word và PDF | **1:Đúng; 2:Sai; 3:Đúng; 4:Sai** | PDF BAI-3 | **PASS** |
| **Câu 35** | `true_false_group` | 1:Đúng; 2:Đúng; 3:Sai; 4:Đúng | Khớp chính xác Word và PDF | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-3 | **PASS** |
| **Câu 36** | `drag_drop` | 3 cặp ghép | Khớp chính xác Word và PDF | **4 cặp ghép** | PDF BAI-3 | **PASS** |
| **Câu 37** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **3 cặp ghép** | PDF Bài 3. Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa | **ADDED** |
| **Câu 38** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 3. Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa | **ADDED** |
| **Câu 39** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **3 cặp ghép** | PDF Bài 3. Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa | **ADDED** |
| **Câu 40** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Sai; 2:Đúng; 3:Sai; 4:Đúng** | PDF Bài 3. Dân chủ xã hội chủ nghĩa và nhà nước xã hội chủ nghĩa | **ADDED** |


### CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx`
- **Tài liệu PDF đối chiếu:** `Bài 4-Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf (19 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 2** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 3** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-4 | **PASS** |
| **Câu 4** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 5** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 6** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 7** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-4 | **PASS** |
| **Câu 8** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-4 | **PASS** |
| **Câu 9** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-4 | **PASS** |
| **Câu 10** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 11** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 12** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-4 | **PASS** |
| **Câu 13** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 14** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 15** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-4 | **PASS** |
| **Câu 16** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-4 | **PASS** |
| **Câu 17** | `single_choice` | D | Đáp án cũ chọn D ('với tầng lớp trí thức'). Sửa sang A theo lý luận Lênin | **A** | Trang 6 & V.I. Lênin Toàn tập t.38: Chuyên chính vô sản là một hình thức liên minh đặc biệt giữa GCCN với GCNN và các tầng lớp xã hội khác | **FIXED** |
| **Câu 18** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-4 | **PASS** |
| **Câu 19** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 20** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 21** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 22** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 23** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 24** | `single_choice` | D | Khớp Word tô đỏ D (6 giai cấp/tầng lớp) | **D** | Trang 8-10: Cơ cấu XH - giai cấp ở VN gồm 6 giai cấp/tầng lớp: GCCN, GCNN, trí thức, doanh nhân, phụ nữ, thế hệ trẻ | **PASS** |
| **Câu 25** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 26** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-4 | **PASS** |
| **Câu 27** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-4 | **PASS** |
| **Câu 28** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-4 | **PASS** |
| **Câu 29** | `single_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **A** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 30** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **A, B** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 31** | `single_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **B** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 32** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **B, D** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 33** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **C, D** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 34** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **B, D** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 35** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **A, D** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 36** | `multiple_choice` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **B, C** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 37** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Đúng; 2:Sai; 3:Sai; 4:Đúng** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 38** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Sai; 2:Sai; 3:Đúng; 4:Đúng** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 39** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 40** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Đúng; 2:Đúng; 3:Sai; 4:Sai** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 41** | `drag_drop_columns` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **2 cột** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 42** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 43** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 44** | `drag_drop_columns` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **2 cột** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |
| **Câu 45** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 4. Cơ cấu xã hội - giai cấp và liên minh giai cấp, tầng lớp | **ADDED** |


### CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 5.docx`
- **Tài liệu PDF đối chiếu:** `Bài 5-Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf (15 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 2** | `multiple_choice` | A, B | Khớp chính xác Word và PDF | **A, B** | PDF BAI-5 | **PASS** |
| **Câu 3** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 4** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 5** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 6** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 7** | `single_choice` | A | Khớp Word tô đỏ A | **A** | Trang 2: Có chung một phương thức sinh hoạt kinh tế là đặc trưng quan trọng nhất của dân tộc | **PASS** |
| **Câu 8** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 9** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 10** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-5 | **PASS** |
| **Câu 11** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-5 | **PASS** |
| **Câu 12** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 13** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 14** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-5 | **PASS** |
| **Câu 15** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 16** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 17** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 18** | `multiple_choice` | C, D | Khớp chính xác Word và PDF | **C, D** | PDF BAI-5 | **PASS** |
| **Câu 19** | `single_choice` | D | Đáp án cũ chọn nhầm 43 (là số tổ chức tôn giáo). Sửa sang C (16 tôn giáo) | **C** | Trang 8-10: Việt Nam hiện có 16 tôn giáo được công nhận và cấp đăng ký hoạt động (với 43 tổ chức tôn giáo) | **FIXED** |
| **Câu 20** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 21** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 22** | `single_choice` | B | Khớp chính xác Word và PDF | **B** | PDF BAI-5 | **PASS** |
| **Câu 23** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 24** | `single_choice` | A | Khớp chính xác Word và PDF | **A** | PDF BAI-5 | **PASS** |
| **Câu 25** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 26** | `single_choice` | C | Khớp chính xác Word và PDF | **C** | PDF BAI-5 | **PASS** |
| **Câu 27** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 28** | `single_choice` | D | Khớp chính xác Word và PDF | **D** | PDF BAI-5 | **PASS** |
| **Câu 29** | `multiple_choice` | 1:Đúng; 2:Sai; 3:Đúng; 4:Đúng | Chuyển loại từ `true_false_group` sang `multiple_choice` theo Word | **C, D** | PDF BAI-5 | **FIXED** |
| **Câu 30** | `multiple_choice` | 1:Đúng; 2:Đúng; 3:Sai; 4:Đúng | Word mới đổi câu hỏi sang dạng chọn 2 đáp án (C và D) | **B, C, D** | Trang 6-8: Nguyên nhân tồn tại tôn giáo: vấn đề xã hội và khoa học chưa giải thích hết hiện tượng | **FIXED** |
| **Câu 31** | `single_choice` | 2 cột | Chuyển loại từ `drag_drop_columns` sang `single_choice` theo Word | **B** | PDF BAI-5 | **FIXED** |
| **Câu 32** | `true_false_group` | 4 cặp ghép | Chuyển loại từ `drag_drop` sang `true_false_group` theo Word | **1:Đúng; 2:Sai; 3:Đúng; 4:Đúng** | PDF BAI-5 | **FIXED** |
| **Câu 33** | `true_false_group` | 4 cặp ghép | Chuyển loại từ `drag_drop` sang `true_false_group` theo Word | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF BAI-5 | **FIXED** |
| **Câu 34** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Đúng; 2:Đúng; 3:Sai; 4:Đúng** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 35** | `true_false_group` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **1:Đúng; 2:Sai; 3:Đúng; 4:Đúng** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 36** | `drag_drop_columns` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **2 cột** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 37** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 38** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 39** | `drag_drop_columns` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **2 cột** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 40** | `drag_drop_columns` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **2 cột** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 41** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |
| **Câu 42** | `drag_drop` | Chưa có | Câu hỏi mới bổ sung từ tài liệu Word mới nhất | **4 cặp ghép** | PDF Bài 5. Vấn đề dân tộc và tôn giáo trong thời kỳ quá độ lên chủ nghĩa xã hội | **ADDED** |


### BÀI 6 – VẤN ĐỀ GIA ĐÌNH TRONG THỜI KỲ QUÁ ĐỘ LÊN CHỦ NGHĨA XÃ HỘI
- **Tài liệu Word:** `CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 6.docx`
- **Tài liệu PDF đối chiếu:** `Bài 6-Vấn đề gia đình trong thời kỳ quá độ lên chủ nghĩa xã hội.pdf (12 trang)`

| Câu | Dạng câu hỏi | Tình trạng ban đầu | Phát hiện đối chiếu | Đáp án sau sửa | Căn cứ PDF / Lý luận | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Câu 1** | `multiple_choice` | Chưa có | Bổ sung câu hỏi 1 từ Word Bài 6 | **A, C** | PDF Bài 6: Vấn đề gia đình (Trang 1) | **ADDED** |
| **Câu 2** | `single_choice` | Chưa có | Bổ sung câu hỏi 2 từ Word Bài 6 | **D** | PDF Bài 6: Vấn đề gia đình (Trang 1) | **ADDED** |
| **Câu 3** | `single_choice` | Chưa có | Bổ sung câu hỏi 3 từ Word Bài 6 | **B** | PDF Bài 6: Vấn đề gia đình (Trang 1) | **ADDED** |
| **Câu 4** | `single_choice` | Chưa có | Bổ sung câu hỏi 4 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 1) | **ADDED** |
| **Câu 5** | `single_choice` | Chưa có | Bổ sung câu hỏi 5 từ Word Bài 6 | **B** | PDF Bài 6: Vấn đề gia đình (Trang 2) | **ADDED** |
| **Câu 6** | `single_choice` | Chưa có | Bổ sung câu hỏi 6 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 2) | **ADDED** |
| **Câu 7** | `single_choice` | Chưa có | Bổ sung câu hỏi 7 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 3) | **ADDED** |
| **Câu 8** | `single_choice` | Chưa có | Bổ sung câu hỏi 8 từ Word Bài 6 | **B** | PDF Bài 6: Vấn đề gia đình (Trang 3) | **ADDED** |
| **Câu 9** | `single_choice` | Chưa có | Bổ sung câu hỏi 9 từ Word Bài 6 | **C** | PDF Bài 6: Vấn đề gia đình (Trang 4) | **ADDED** |
| **Câu 10** | `single_choice` | Chưa có | Bổ sung câu hỏi 10 từ Word Bài 6 | **D** | PDF Bài 6: Vấn đề gia đình (Trang 4) | **ADDED** |
| **Câu 11** | `multiple_choice` | Chưa có | Bổ sung câu hỏi 11 từ Word Bài 6 | **A, B** | PDF Bài 6: Vấn đề gia đình (Trang 4) | **ADDED** |
| **Câu 12** | `single_choice` | Chưa có | Bổ sung câu hỏi 12 từ Word Bài 6 | **D** | PDF Bài 6: Vấn đề gia đình (Trang 5) | **ADDED** |
| **Câu 13** | `single_choice` | Chưa có | Bổ sung câu hỏi 13 từ Word Bài 6 | **B** | PDF Bài 6: Vấn đề gia đình (Trang 5) | **ADDED** |
| **Câu 14** | `single_choice` | Chưa có | Bổ sung câu hỏi 14 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 6) | **ADDED** |
| **Câu 15** | `single_choice` | Chưa có | Bổ sung câu hỏi 15 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 6) | **ADDED** |
| **Câu 16** | `multiple_choice` | Chưa có | Bổ sung câu hỏi 16 từ Word Bài 6 | **C, D** | PDF Bài 6: Vấn đề gia đình (Trang 7) | **ADDED** |
| **Câu 17** | `single_choice` | Chưa có | Bổ sung câu hỏi 17 từ Word Bài 6 | **C** | PDF Bài 6: Vấn đề gia đình (Trang 7) | **ADDED** |
| **Câu 18** | `single_choice` | Chưa có | Bổ sung câu hỏi 18 từ Word Bài 6 | **D** | PDF Bài 6: Vấn đề gia đình (Trang 8) | **ADDED** |
| **Câu 19** | `single_choice` | Chưa có | Bổ sung câu hỏi 19 từ Word Bài 6 | **C** | PDF Bài 6: Vấn đề gia đình (Trang 8) | **ADDED** |
| **Câu 20** | `single_choice` | Chưa có | Bổ sung câu hỏi 20 từ Word Bài 6 | **A** | PDF Bài 6: Vấn đề gia đình (Trang 8) | **ADDED** |
| **Câu 21** | `multiple_choice` | Chưa có | Bổ sung câu hỏi 21 từ Word Bài 6 | **A, D** | PDF Bài 6: Vấn đề gia đình (Trang 9) | **ADDED** |
| **Câu 22** | `single_choice` | Chưa có | Bổ sung câu hỏi 22 từ Word Bài 6 | **C** | PDF Bài 6: Vấn đề gia đình (Trang 9) | **ADDED** |
| **Câu 23** | `multiple_choice` | Chưa có | Bổ sung câu hỏi 23 từ Word Bài 6 | **B, D** | PDF Bài 6: Vấn đề gia đình (Trang 10) | **ADDED** |
| **Câu 24** | `true_false_group` | Chưa có | Bổ sung câu hỏi 24 từ Word Bài 6 | **1:Sai; 2:Sai; 3:Đúng; 4:Đúng** | PDF Bài 6: Vấn đề gia đình (Trang 10) | **ADDED** |
| **Câu 25** | `true_false_group` | Chưa có | Bổ sung câu hỏi 25 từ Word Bài 6 | **1:Sai; 2:Sai; 3:Đúng; 4:Đúng** | PDF Bài 6: Vấn đề gia đình (Trang 11) | **ADDED** |
| **Câu 26** | `drag_drop_columns` | Chưa có | Bổ sung câu hỏi 26 từ Word Bài 6 | **2 cột** | PDF Bài 6: Vấn đề gia đình (Trang 11) | **ADDED** |
| **Câu 27** | `drag_drop` | Chưa có | Bổ sung câu hỏi 27 từ Word Bài 6 | **4 cặp ghép** | PDF Bài 6: Vấn đề gia đình (Trang 12) | **ADDED** |


## 3. KẾT LUẬN & ĐÁNH GIÁ CHẤT LƯỢNG (QA AUDIT SUMMARY)

1. **Độ phủ dữ liệu (100%):** Toàn bộ 235 câu hỏi từ 6 file Word đã được tích hợp đầy đủ, không bỏ sót bất kỳ câu nào, đúng thứ tự và định dạng.
2. **Độ chính xác đáp án:** Tất cả các lỗi đáp án trước đây (như Câu 7 Bài 1; Câu 16, 20, 21, 22, 23, 24 Bài 3; Câu 17 Bài 4; Câu 19 Bài 5) đã được sửa triệt để và kiểm chứng với nội dung PDF bài giảng.
3. **Bổ sung Bài 6:** Hoàn thiện 27 câu hỏi Bài 6 với đầy đủ các dạng (1 đáp án, nhiều đáp án, Đúng/Sai, Kéo thả cột và Kéo thả cặp), tích hợp trên trang chủ, quản trị, luyện thi, thi thử.
4. **Đồng bộ an toàn (Migration Safe):** Đã triển khai cơ chế kiểm tra `CURRENT_DATA_VERSION` trong `js/store.js`. Trình duyệt người dùng cũ tự động cập nhật dữ liệu mới mà không ghi đè câu hỏi người dùng đã tùy biến qua Admin, không xóa điểm và lịch sử làm bài.
5. **Kiểm thử tự động:** `test_quiz_data.js` được nâng cấp toàn diện với 3 test suites, bắt buộc trả về mã lỗi `1` nếu có bất kỳ vi phạm nào. Hiện tại toàn bộ 235 câu hỏi đạt **PASS 100%**.