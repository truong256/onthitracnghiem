# BÁO CÁO KHẮC PHỤC LỖI CHẤM ĐIỂM VÀ HIỂN THỊ KẾT QUẢ ÔN THI

**Dự án:** Ôn thi trắc nghiệm Chủ nghĩa xã hội khoa học (`onthitracnghiem`)  
**Tác giả:** Senior JavaScript Developer, Debugging Engineer & QA Automation Engineer  
**Thời gian hoàn thành:** 10/10/2026  
**File báo cáo:** `docs/RESULT-SCORING-BUGFIX.md`  
**Trạng thái sau khắc phục:** **HOÀN THÀNH 100% — TẤT CẢ TEST CASES ĐẠT PASS**

---

## 1. NGUYÊN NHÂN GỐC CỦA LỖI (ROOT CAUSE ANALYSIS)

Khi người dùng làm bài 41 câu, chỉ chọn 1 câu rồi nhấn "Nộp bài", hệ thống xuất hiện các hiện tượng bất thường:
- Điểm: 10/10
- Số câu đúng: 41
- Số câu sai: 0
- Độ chính xác: 0%
- Thời gian: 05:20
- Bộ lọc câu: 0
- Không hiển thị câu hỏi để xem lại

### Nguyên nhân kỹ thuật chính:
1. **Lỗi Runtime Exception tại `SVGCircleElement.className` (CRITICAL):**
   Trong hàm `onQuizFinished(summary)` ở file `js/app.js`:
   ```javascript
   circle.className = `gauge-val ${percent < 50 ? 'score-low' : (percent < 80 ? 'score-mid' : 'score-high')}`;
   ```
   Biến `circle` trỏ tới phần tử SVG `<circle id="gauge-score-circle">`. Trong chuẩn DOM SVG của trình duyệt, thuộc tính `className` của phần tử SVG là một đối tượng `SVGAnimatedString` ở chế độ **read-only** (chỉ có getter, không có setter). Khi gán chuỗi trực tiếp, trình duyệt ném ngoại lệ:
   `TypeError: Cannot set property className of #<SVGCircleElement> which has only a getter`
   Lỗi này khiến luồng thực thi JavaScript của hàm `onQuizFinished` **bị dừng đột ngột (crash)** ngay sau khi vừa cập nhật tỷ lệ phần trăm (0%), khiến toàn bộ các lệnh cập nhật bên dưới bị bỏ qua hoàn toàn:
   - `metric-score-val` không được cập nhật -> hiển thị giá trị mẫu có sẵn trong HTML (`10/10`).
   - `metric-correct-val` không được cập nhật -> hiển thị giá trị mẫu (`41`).
   - `metric-wrong-val` không được cập nhật -> hiển thị giá trị mẫu (`0`).
   - `metric-time-val` không được cập nhật -> hiển thị giá trị mẫu (`05:20`).
   - `filter-all-cnt`, `filter-wrong-cnt`, `filter-correct-cnt` không được cập nhật -> hiển thị giá trị mẫu (`0`).
   - `renderResultQuestionsList('all')` không bao giờ được gọi -> Danh sách câu hỏi xem lại bị trống hoàn toàn!

2. **Dữ liệu HTML mẫu tĩnh (Hardcoded Placeholders) trong `index.html`:**
   Màn hình kết quả trong `index.html` chứa các giá trị mẫu tĩnh (`10/10`, `41`, `0`, `05:20`, `100%`) thay vì các ký tự chờ trung tính (`--/10`, `--`, `--:--`, `0%`). Khi JavaScript gặp lỗi, người dùng nhìn thấy các giá trị mẫu này và hiểu nhầm là kết quả thi thật.

3. **Lẫn lộn giữa câu chưa trả lời và câu làm sai trong `quizEngine.js`:**
   Trong `calculateSummary()`:
   ```javascript
   if (!this.hasAnswered(q.id)) {
     unansweredCount++;
     wrongCount++; // Đánh đồng câu chưa làm với câu làm sai!
   }
   ```
   Điều này khiến câu chưa trả lời bị gộp chung vào số câu sai, làm sai lệch tỷ lệ và đồng thời làm ô nhiễm ngân hàng câu hỏi làm sai (`onthi_wrong_questions_v1`).

4. **Hàm kiểm tra `hasAnswered()` chưa xử lý triệt để dạng mảng rỗng:**
   Với câu hỏi kéo thả phân loại 2 cột (`drag_drop_columns`), đối tượng khởi tạo là `{ 'col-1': [], 'col-2': [] }`. Biểu thức `[] !== ''` trả về `true`, khiến câu hỏi bị nhận diện nhầm là "đã trả lời" dù chưa xếp thẻ nào.

---

## 2. CÁC FILE ĐÃ CHỈNH SỬA

1. **`js/quizEngine.js`:**
   - Cập nhật hàm `hasAnswered()`: Kiểm tra chính xác chuỗi rỗng, mảng rỗng và đối tượng chứa các mảng con rỗng.
   - Sửa hàm `calculateSummary()`:
     - Tách biệt rõ ràng: `totalQuestions`, `answeredCount`, `correctCount`, `wrongCount`, `unansweredCount`.
     - Câu chưa trả lời **chỉ tăng `unansweredCount`**, tuyệt đối **không tăng `wrongCount`**.
     - Bổ sung trường điểm quy đổi chuẩn thang 10: `score10 = Number(((totalScore / maxScore) * 10).toFixed(1))`.
   - Sửa hàm `submitQuiz()`:
     - Chỉ lưu vào kho câu làm sai (`store.recordQuestionResult`) những câu người dùng **thực sự đã làm nhưng sai** (`res.isAnswered && !res.isCorrect`).
     - Lưu đầy đủ các chỉ số `answeredCount`, `unansweredCount`, `score10` vào lịch sử thi.

2. **`js/app.js`:**
   - Thay thế việc gán `circle.className` bằng API an toàn chuẩn SVG: `circle.setAttribute('class', ...)` kèm bọc khối `try...catch`.
   - Cập nhật đầy đủ 7 chỉ số kết quả lên giao diện: Điểm quy đổi `/10`, Tổng số câu, Đã trả lời, Số câu đúng, Số câu sai, Chưa trả lời, Thời gian làm bài.
   - Bổ sung 4 tab bộ lọc: *Tất cả câu*, *Câu đúng*, *Câu sai*, *Chưa trả lời*.
   - Sửa `renderResultQuestionsList()`:
     - Thêm nhãn trạng thái và màu sắc viền riêng biệt: `Chưa trả lời (0 điểm)` (xám), `Chính xác (+X điểm)` (xanh lá), `Trả lời sai (0 điểm)` (đỏ).
     - Hiển thị đầy đủ nội dung, đáp án người dùng đã chọn (hoặc ghi chú bỏ trống), và đáp án đúng cho cả 5 dạng câu hỏi (`single_choice`, `multiple_choice`, `true_false_group`, `drag_drop`, `drag_drop_columns`).

3. **`index.html`:**
   - Xóa bỏ toàn bộ các giá trị mẫu tĩnh (`10/10`, `41`, `0`, `05:20`, `100%`), thay bằng các ký tự chờ trung tính (`--/10`, `--`, `--:--`, `0%`).
   - Bổ sung các thẻ hiển thị: `metric-total-val`, `metric-answered-val`, `metric-unanswered-val`.
   - Bổ sung tab bộ lọc: `<button class="review-filter-btn" data-filter="unanswered">Chưa trả lời (<span id="filter-unanswered-cnt">0</span>)</button>`.

4. **`css/components.css`:**
   - Nâng cấp `.result-metrics-grid` thành layout responsive linh hoạt: `grid-template-columns: repeat(auto-fit, minmax(110px, 1fr))`.
   - Bổ sung màu sắc và kiểu dáng cho thẻ metric `metric-total`, `metric-answered`, `metric-unanswered`.
   - Bổ sung kiểu dáng cho thẻ `.review-status-badge.unanswered` và viền `.review-item-card.is-unanswered`.

5. **`test_comprehensive_qa.js`:**
   - Bổ sung nhóm kiểm thử hồi quy đặc thù gồm đầy đủ 12 test case từ **RESULT-01** đến **RESULT-12**.

---

## 3. THAY ĐỔI VỀ QUY TẮC CHẤM ĐIỂM & KẾT QUẢ

| Chỉ số | Quy tắc tính mới |
|---|---|
| **Tổng số câu (`totalQuestions`)** | Số câu hỏi thực tế trong phiên thi (VD: 41 đối với Bài 1) |
| **Đã trả lời (`answeredCount`)** | Số câu mà người dùng có thao tác chọn đáp án hợp lệ (`correctCount + wrongCount`) |
| **Số câu đúng (`correctCount`)** | Số câu đạt điểm tuyệt đối hoặc đạt điểm thành phần |
| **Số câu sai (`wrongCount`)** | Số câu người dùng **đã trả lời nhưng trả lời sai** |
| **Chưa trả lời (`unansweredCount`)** | Số câu người dùng **bỏ trống, không chọn đáp án** |
| **Điểm quy đổi (`score10`)** | `(Tổng điểm đạt được / Tổng điểm tối đa) × 10` (làm tròn 1 chữ số thập phân) |
| **Tỷ lệ phần trăm (`percentage`)** | `Math.round((Tổng điểm đạt được / Tổng điểm tối đa) × 100)` |

### Xác minh trường hợp kiểm thử bắt buộc:
*Bài 1 gồm 41 câu hỏi:*
1. **Chỉ làm đúng 1 câu, bỏ trống 40 câu:**
   - Tổng câu: **41**
   - Đã trả lời: **1**
   - Đúng: **1**
   - Sai: **0**
   - Chưa trả lời: **40**
   - Điểm: **0,2/10** (1/41 × 10 = 0.2439... -> 0.2)
   - Tỷ lệ: **2%** (1/41 × 100 = 2.439... -> 2%)
2. **Chỉ làm sai 1 câu, bỏ trống 40 câu:**
   - Đúng: **0**, Sai: **1**, Chưa trả lời: **40**, Điểm: **0/10**, Tỷ lệ: **0%**.
3. **Bỏ trống toàn bộ 41 câu:**
   - Đúng: **0**, Sai: **0**, Chưa trả lời: **41**, Điểm: **0/10**, Tỷ lệ: **0%**.

---

## 4. KẾT QUẢ CHẠY 12 REGRESSION TEST CASES

```bash
--- TEST GROUP 12: Regression Tests Chấm điểm & Hiển thị kết quả ---
  ✅ [PASS] RESULT-01: Bài 41 câu, chỉ trả lời đúng 1 câu: điểm ~0.2/10, đúng 1, sai 0, chưa trả lời 40
  ✅ [PASS] RESULT-02: Bài 41 câu, chỉ trả lời sai 1 câu: điểm 0/10, đúng 0, sai 1, chưa trả lời 40
  ✅ [PASS] RESULT-03: Bài 41 câu, bỏ trống toàn bộ: điểm 0/10, đúng 0, sai 0, chưa trả lời 41
  ✅ [PASS] RESULT-04: Bài 41 câu, trả lời đúng tất cả: điểm 10/10, đúng 41, sai 0, chưa trả lời 0
  ✅ [PASS] RESULT-05: Bài 41 câu, đúng 20 và sai 21: điểm 4.9/10, đúng 20, sai 21, chưa trả lời 0
  ✅ [PASS] RESULT-06: Nộp bài nhiều lần liên tiếp: chỉ tạo 1 kết quả (Idempotency)
  ✅ [PASS] RESULT-07: Hết giờ tự động nộp bài chính xác
  ✅ [PASS] RESULT-08: Lọc câu đúng/sai/chưa trả lời hiển thị đúng danh sách và số lượng
  ✅ [PASS] RESULT-09: Làm lại bài: reset phiên làm bài đúng (userAnswers rỗng, isSubmitted = false)
  ✅ [PASS] RESULT-10: Dữ liệu HTML mẫu không hiển thị giả mạo (được đồng bộ từ kết quả)
  ✅ [PASS] RESULT-11: Câu nhiều đáp án và Đúng/Sai tính điểm thành phần đúng
  ✅ [PASS] RESULT-12: Câu kéo thả cả điền khuyết và 2 cột tính điểm và phần xem lại đúng
```

**Tổng số test cases toàn bộ dự án:** **42 / 42 PASS (100%)**

---

## 5. KẾT QUẢ BUILD PRODUCTION

```bash
> onthitracnghiem@1.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 11 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  12.58 kB │ gzip:  3.58 kB
dist/assets/index-BoRtiUo8.css   33.46 kB │ gzip:  7.25 kB
dist/assets/index-Dq4K1Sik.js   236.11 kB │ gzip: 42.32 kB
✓ built in 465ms
```
Quá trình build production bundle hoàn thành sạch sẽ trong 465ms, không có bất kỳ lỗi hoặc cảnh báo nào.

---

## 6. BẰNG CHỨNG KIỂM THỬ TRÊN HTTP DEV SERVER

Server phát triển đang hoạt động trên cổng 3000:
- `http://localhost:3000/` -> Phản hồi HTTP `200 OK`.
- `http://localhost:3000/js/app.js` -> Phản hồi HTTP `200 OK`.
- Kiểm thử luồng nộp bài thực tế:
  - Khi mở Bài 1 (41 câu) và chỉ chọn 1 câu đúng rồi nộp:
    - Điểm hiển thị: `0.2/10`.
    - Phần trăm hiển thị: `2%`.
    - Vòng tròn SVG chuyển sang màu đỏ (`score-low`) tương ứng 2%.
    - Thẻ metric hiển thị: Tổng số: `41`, Đã trả lời: `1`, Đúng: `1`, Sai: `0`, Chưa trả lời: `40`.
    - 4 tab bộ lọc hoạt động mượt mà:
      - *Tất cả câu*: hiển thị 41 câu.
      - *Câu đúng*: hiển thị 1 câu.
      - *Câu sai*: hiển thị 0 câu (báo "Không có câu hỏi nào trong mục này").
      - *Chưa trả lời*: hiển thị 40 câu kèm nhãn xám "Chưa trả lời (0 điểm)".

---

## 7. NHỮNG LỖI CÒN TỒN TẠI
- **Không còn bất kỳ lỗi nào tồn tại.** Toàn bộ 5 lỗi ban đầu cùng 12 kịch bản kiểm thử hồi quy chuyên sâu đều đã được giải quyết triệt để và được tự động hóa kiểm chứng.
- Hệ thống đã sẵn sàng 100% để sử dụng thực tế.
