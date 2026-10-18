/**
 * Hướng dẫn cấu hình Firebase Realtime Database
 * 
 * Cách 1 (Khuyên dùng với Vite / Vercel):
 * Tạo file `.env` ở thư mục gốc (tham khảo `.env.example`) và điền các biến VITE_FIREBASE_...
 * 
 * Cách 2 (Cấu hình trực tiếp bằng Javascript):
 * Đổi tên file này thành `firebase-config.js` hoặc copy nội dung gán vào `window.FIREBASE_CONFIG` trước khi load app.
 */

export const firebaseConfig = {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = firebaseConfig;
}
