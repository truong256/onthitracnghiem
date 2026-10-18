# Hệ Thống Ôn Luyện Trắc Nghiệm - Chủ Nghĩa Xã Hội Khoa Học

Website ôn luyện trắc nghiệm hiện đại, tối ưu trải nghiệm học tập môn Chủ nghĩa Xã hội Khoa học với đầy đủ 235 câu hỏi thực tế (6 bài học), đồng thời tích hợp hệ thống **Thống kê người dùng thời gian thực (Realtime Presence & User Analytics)** thông qua Firebase Realtime Database.

---

## 🌟 Tính Năng Nổi Bật

### 1. Hệ Thống Thống Kê Thời Gian Thực (Realtime Analytics)
- 🟢 **Số người đang online**: Cập nhật tức thời theo thời gian thực (Realtime Presence).
- ⚡ **Phân biệt phiên đang mở vs Đang hoạt động**: Nhận diện người dùng đang tương tác thực tế (Active) so với tab treo dưới nền (Idle).
- ✍️ **Số người đang làm bài**: Theo dõi trực tiếp số sinh viên hiện đang trong phòng thi/làm bài trắc nghiệm (`screen-quiz`).
- 📅 **Lượt truy cập hôm nay**: Đếm số người dùng duy nhất (Unique Visitors) trong ngày theo múi giờ Việt Nam (UTC+7).
- 🌐 **Tổng lượt truy cập**: Tổng số người truy cập website toàn thời gian.
- 🛡️ **Bảo vệ chống đếm trùng (Multi-tab Deduplication)**: Nhận diện mỗi thiết bị bằng một Visitor ID ẩn danh duy nhất trong `localStorage`. Mở nhiều tab cùng lúc vẫn chỉ tính là **1 người online**.
- 🔌 **Firebase Presence & `onDisconnect`**: Khi người dùng tắt tab, đóng trình duyệt hoặc mất kết nối đột ngột, server Firebase tự động xóa bản ghi và cập nhật số người online ngay lập tức.
- 🔒 **Bảo mật & Quyền riêng tư (Privacy-first)**: 
  - 100% ẩn danh, không thu thập bất kỳ thông tin cá nhân (PII), không lưu IP hay email.
  - Không công khai danh sách người dùng, chỉ hiển thị số liệu thống kê tổng hợp.
  - Firebase Security Rules an toàn, chỉ cho phép tăng dần (+1), chống can thiệp hoặc ghi đè số liệu trái phép.
- 🔄 **Chế độ dự phòng ngoại tuyến (Offline Graceful Degradation)**: Khi Firebase mất kết nối hoặc chưa cấu hình, hệ thống chuyển sang chế độ ngoại tuyến mượt mà, không làm gián đoạn việc ôn luyện.

### 2. Chức Năng Ôn Luyện & Thi Thử
- **Đầy đủ 235 câu hỏi** chia làm 6 bài học chính thức.
- **Đa dạng dạng câu hỏi**:
  - Trắc nghiệm 1 đáp án (A/B/C/D).
  - Trắc nghiệm nhiều đáp án.
  - Điền từ vào chỗ trống (Fill in the blank).
  - Nối cột khái niệm (Matching).
  - Điền đáp án vào bảng (Table completion).
  - Đánh giá Đúng/Sai theo nhận định (True/False group).
  - Kéo thả điền khuyết và phân loại 2 cột (Drag & Drop).
- **Chế độ làm bài linh hoạt**:
  - Luyện tập tự do (có nút kiểm tra tức thì & giải thích chi tiết).
  - Luyện tập ngẫu nhiên (trộn đề & xáo trộn thứ tự đáp án).
  - Luyện nhanh (10 câu ngẫu nhiên).
  - Thi thử tính giờ (15 phút, đồng hồ LED đếm ngược, khóa đáp án đến khi nộp bài).
  - Ôn lại các câu làm sai (tự động lưu vào bộ nhớ cục bộ).
- **Hệ thống Quản trị (Admin CMS)**: Xem, thêm, sửa, xóa, tìm kiếm, xuất/nhập ngân hàng đề thi dạng JSON.

---

## 🚀 Cài Đặt & Chạy Thử Tại Môi Trường Local

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev

# 3. Chạy toàn bộ các bộ kiểm thử tự động
npm test

# 4. Đóng gói bản dựng sản phẩm
npm run build
```

---

## ⚙️ Cấu Hình Firebase & Triển Khai Lên Vercel

Xem hướng dẫn chi tiết từng bước tại: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

1. Sao chép `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Điền các khóa cấu hình Firebase Realtime Database của bạn.
3. Áp dụng quy tắc bảo mật từ file `database.rules.json` vào tab **Rules** trên Firebase Console.
4. Khi triển khai lên Vercel, cấu hình các biến môi trường tương ứng trong **Settings -> Environment Variables**.

---

## 🧪 Kiểm Thử Tự Động (Automated Testing)

Dự án đi kèm bộ kiểm thử toàn diện với 86 test cases tự động:
- `test_quiz_data.js`: Kiểm tra dữ liệu 235 câu hỏi của 6 bài học.
- `test_comprehensive_qa.js`: Kiểm tra chấm điểm, chống nộp trùng lặp, localStorage và bảo mật XSS.
- `test_advanced_randomization.js`: Kiểm tra thuật toán trộn đề Fisher-Yates, trộn đáp án và các dạng câu hỏi mới.
- `test_stats_presence.js`: Kiểm thử chống đếm trùng đa tab, đóng tab/ngắt kết nối, chuyển màn hình, phân biệt Active/Idle và fallback ngoại tuyến.

Chạy kiểm thử:
```bash
npm test
```
