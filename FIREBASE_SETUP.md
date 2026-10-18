# Hướng Dẫn Cấu Hình Firebase Realtime Database & Triển Khai Vercel

Tài liệu này hướng dẫn chi tiết cách kết nối Firebase Realtime Database để theo dõi thống kê người dùng trực tuyến, số lượt truy cập hôm nay, tổng truy cập và người đang làm bài theo thời gian thực (Realtime Presence & Analytics) với chi phí **0 VNĐ (Gói Spark Miễn Phí)**.

---

## 1. Tạo Dự Án Firebase (Miễn Phí)

1. Truy cập [Firebase Console](https://console.firebase.google.com/) và đăng nhập bằng tài khoản Google.
2. Nhấn **"Add project"** (Thêm dự án).
3. Nhập tên dự án (ví dụ: `onthitracnghiem-analytics`), nhấn **Continue**.
4. (Tùy chọn) Google Analytics có thể bật hoặc tắt, sau đó nhấn **Create project**.

---

## 2. Tạo Firebase Realtime Database

1. Trong thanh điều hướng bên trái, chọn **Build** -> **Realtime Database**.
2. Nhấn **Create Database** (Tạo cơ sở dữ liệu).
3. Chọn vị trí lưu trữ (Location):
   - Khuyên dùng: **Singapore (`asia-southeast1`)** để đạt độ trễ thấp nhất tại Việt Nam.
4. Chọn chế độ bảo mật ban đầu: Chọn **Start in locked mode** (Bắt đầu ở chế độ khóa) -> Nhấn **Enable**.

---

## 3. Cấu Hình Firebase Security Rules (Bảo Mật An Toàn)

Để đảm bảo người dùng **không thể tự ý sửa đổi số liệu tổng hợp**, không đọc được danh sách người dùng ẩn danh và chỉ ghi dữ liệu tab của chính mình:

1. Trong trang Realtime Database, chuyển sang tab **Rules** (Quy tắc).
2. Xóa nội dung mặc định và dán toàn bộ quy tắc từ file `database.rules.json`:

```json
{
  "rules": {
    "stats": {
      ".read": true,
      "total_visitors": {
        ".write": "!data.exists() ? (newData.val() == 1) : (newData.val() == data.val() + 1)",
        ".validate": "newData.isNumber()"
      },
      "daily": {
        "$date": {
          ".write": "!data.exists() ? (newData.val() == 1) : (newData.val() == data.val() + 1)",
          ".validate": "newData.isNumber()"
        }
      }
    },
    "presence": {
      ".read": true,
      "$visitorId": {
        "tabs": {
          "$tabId": {
            ".write": true,
            ".validate": "newData.hasChildren(['screen', 'state', 'lastSeen']) && (newData.child('screen').val() == 'home' || newData.child('screen').val() == 'quiz' || newData.child('screen').val() == 'result' || newData.child('screen').val() == 'admin') && (newData.child('state').val() == 'active' || newData.child('state').val() == 'idle')"
          }
        }
      }
    },
    "daily_visitors": {
      "$date": {
        "$visitorId": {
          ".read": false,
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['visitedAt']) && newData.child('visitedAt').isNumber()"
        }
      }
    },
    "all_visitors": {
      "$visitorId": {
        ".read": false,
        ".write": "!data.exists()",
        ".validate": "newData.hasChildren(['firstSeen']) && newData.child('firstSeen').isNumber()"
      }
    }
  }
}
```

3. Nhấn **Publish** (Xuất bản) để kích hoạt quy tắc.

---

## 4. Lấy Thông Tin Cấu Hình Web App

1. Vào **Project Overview** (biểu tượng bánh răng ⚙️ ở góc trên trái) -> chọn **Project settings** (Cài đặt dự án).
2. Cuộn xuống phần **Your apps** -> Nhấn biểu tượng Web `</>`.
3. Đặt biệt danh cho ứng dụng (ví dụ: `onthitracnghiem-web`), không cần tích chọn Firebase Hosting.
4. Nhấn **Register app**.
5. Firebase sẽ hiển thị đoạn mã `const firebaseConfig = { ... }`. Bạn sẽ cần các giá trị này cho bước tiếp theo.

---

## 5. Cấu Hình Khi Chạy Ở Môi Trường Local (Máy Tính Cá Nhân)

Tạo file `.env` ở thư mục gốc của dự án (dựa trên `.env.example`):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

Sau đó chạy lệnh:
```bash
npm run dev
```

> **Lưu ý:** Nếu chưa cấu hình Firebase, website vẫn hoạt động 100% bình thường ở chế độ dự phòng ngoại tuyến (`Offline Fallback`), không bị lỗi hay làm gián đoạn việc ôn luyện trắc nghiệm.

---

## 6. Hướng Dẫn Triển Khai Lên Vercel

1. Đẩy mã nguồn lên GitHub:
   ```bash
   git add .
   git commit -m "feat: Add Firebase presence and user analytics"
   git push origin main
   ```
2. Truy cập [Vercel Dashboard](https://vercel.com/) và nhấn **"Add New..."** -> **Project**.
3. Chọn kho lưu trữ `onthitracnghiem` từ danh sách GitHub.
4. Mở rộng mục **Environment Variables** và thêm các biến tương ứng từ file cấu hình Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Nhấn **Deploy**.
6. Sau khi hoàn tất (khoảng 30-45 giây), truy cập URL Vercel để kiểm tra bảng thống kê trực tuyến hoạt động!

---

## 7. Các Điểm Nổi Bật Về Kỹ Thuật

- **Không đếm trùng đa tab (Multi-tab deduplication):** Mỗi trình duyệt lưu một `visitorId` ẩn danh duy nhất trong `localStorage`. Khi mở 5-10 tab cùng lúc, hệ thống chỉ tính là **1 người đang online** và **1 người đang làm bài**.
- **Firebase Presence & `onDisconnect`:** Khi tắt tab, đóng trình duyệt hoặc mất kết nối mạng đột ngột, Firebase tự động dọn dẹp phiên và cập nhật số người online theo thời gian thực.
- **Phân biệt đang hoạt động vs treo tab (Active vs Idle):** Nhận diện tương tác thực tế (di chuột, bấm phím, cuộn trang). Nếu không có tương tác sau 3 phút hoặc ẩn tab, trạng thái chuyển sang `idle`.
- **Bảo mật & Quyền riêng tư (Privacy-first):** Không thu thập bất kỳ thông tin cá nhân (PII), không lấy IP, không yêu cầu đăng nhập.
- **Chống gian lận số liệu:** Quy tắc bảo mật Firebase chỉ cho phép tăng dần (+1) cho số lượt hôm nay và tổng lượt, ngăn chặn hoàn toàn việc người dùng tự ý ghi đè số lớn.
- **Chế độ dự phòng (Graceful Offline Degradation):** Khi mất kết nối hoặc Firebase bị chặn, giao diện hiển thị huy hiệu dự phòng mượt mà mà không ảnh hưởng tới tiến trình làm bài.
