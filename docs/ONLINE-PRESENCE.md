# Hiển thị người đang online

Thanh đầu trang hiển thị số trình duyệt đang mở website trong tab hiển thị và có gửi cập nhật trong 90 giây gần nhất. Đây là số trình duyệt hoạt động ước tính, không phải số người đã xác minh hoặc tổng lượt truy cập. Cùng trình duyệt/cùng hồ sơ/cùng tên miền được gộp bằng mã UUID ẩn danh trong localStorage; chế độ ẩn danh, thiết bị khác hoặc chặn localStorage có thể được tính riêng.

Trình duyệt gửi POST `/api/presence` khi vào trang, trở lại tab, có mạng trở lại và mỗi 30 giây. Tab ẩn không gửi heartbeat. Đóng tab cuối hoặc mất mạng sẽ hết online sau tối đa 90 giây; không gửi lệnh xóa khi đóng một tab vì các tab khác có thể vẫn đang sử dụng. Máy chủ dùng thời gian Redis và Lua atomic để cập nhật, loại lượt hết hạn và đếm chung giữa các Vercel Functions. Không dùng biến trong bộ nhớ máy chủ hoặc số lượt tải trang để giả lập online. Preview dùng namespace riêng với production.

## Cấu hình Vercel

1. Vào project **onthitracnghiem** > Storage / Marketplace, kết nối **Upstash Redis**. Chọn gói phù hợp trước khi xác nhận nếu nhà cung cấp yêu cầu.
2. Kiểm tra biến môi trường phía server: `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`. Mã cũng hỗ trợ `KV_REST_API_URL` và `KV_REST_API_TOKEN` nếu integration cấp tên cũ. Không dùng token read-only vì heartbeat cần ghi. Không dùng tiền tố `VITE_`, không đưa token vào JavaScript trình duyệt hay Git.
3. Redeploy sau khi thêm biến. Vercel tự nhận `api/presence.js` bên cạnh bản build Vite. `npm run dev`/Vite preview chỉ chạy frontend; dùng `vercel dev` nếu muốn chạy cả API tại local.
4. Mở website bằng hai hồ sơ trình duyệt/thiết bị khác nhau: số tăng lên hai sau lần cập nhật. Mở thêm tab cùng hồ sơ: không tăng. Đóng hoặc ẩn toàn bộ tab của một hồ sơ, đợi hơn 90 giây rồi đợi lần cập nhật của hồ sơ còn lại: số giảm. Kiểm tra cả Trang chủ, làm bài, kết quả và mobile.

Nếu chưa cấu hình, mất mạng hoặc Redis lỗi, giao diện hiển thị trạng thái chưa kết nối/mất mạng và bỏ số cũ. API trả 503 khi chưa khả dụng, không trả số 0 giả. UUID không gắn tài khoản; endpoint công khai không có cơ chế xác minh một UUID là một người thật, nên số đếm không dùng cho thanh toán hoặc kiểm toán.

## Kiểm thử

- `npm test`: bộ kiểm thử hiện có + hồi quy câu bài 4, migration, API presence và vòng đời phía trình duyệt.
- `python scripts/test_multiline_question.py`: kiểm chứng trích xuất đủ câu nhiều dòng từ tài liệu Word (cần python-docx).
- `npm run build`: build Vite; API được Vercel build riêng khi deploy.

## Câu hỏi bài 4

Ảnh báo lỗi là `bai-4-q7`, có thể nằm ở vị trí 30 khi trộn đề. Khôi phục câu trích dẫn nguyên văn từ Word bài 4: “Trước sự liên minh của các đại biểu khoa học…, giới kỹ thuật không một thế lực đen tối nào đứng vững được”. Đáp án gốc B: **Giai cấp vô sản**. Khi trộn phương án, chữ cái có thể thay đổi theo vị trí; nội dung đáp án đúng giữ nguyên.

Nguyên nhân: biểu thức chính quy lấy nội dung header không có `re.DOTALL`, nên `.*` dừng ở dấu xuống dòng trước câu trích dẫn. Đã sửa bộ chuyển đổi và dữ liệu nguồn/sinh ra, tăng phiên bản dữ liệu để các trình duyệt cũ tự cập nhật; giữ nguyên câu tự chỉnh sửa trong Quản trị và lịch sử làm bài theo quy tắc migration hiện có.
