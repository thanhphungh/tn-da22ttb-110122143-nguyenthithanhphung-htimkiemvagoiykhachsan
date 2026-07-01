# Hệ thống gợi ý khách sạn tỉnh Vĩnh Long
— Xây dựng hệ thống tìm kiếm và gợi ý khách sạn tại tỉnh Vĩnh Long dựa trên hành vi người dùng và thuật toán Hybrid Recommendation.
## Mục tiêu
- Xây dựng website tìm kiếm, gợi ý và đặt phòng khách sạn tại tỉnh Vĩnh Long.
- Áp dụng thuật toán gợi ý dựa trên lịch sử hành vi người dùng (tìm kiếm, xem, yêu thích, đặt phòng).
- Hỗ trợ tìm kiếm theo vị trí GPS, địa điểm du lịch, khu vực và bộ lọc giá/đánh giá.
- Cung cấp giao diện quản lý cho Admin và Chủ khách sạn.
- Gửi email xác nhận đặt phòng tự động qua Gmail.
## Thuật toán gợi ý
**Recommendation Score** được tính theo công thức:
Score = W_s × Search + W_v × View + W_f × Favorite + W_b × Booking + W_r × Rating
| Thành phần | Trọng số | Ý nghĩa            |
| Search     | 0.15     | Lịch sử tìm kiếm   |
| View       | 0.20     | Lượt xem khách sạn |
| Favorite   | 0.25     | Lượt yêu thích     |
| Booking    | 0.30     | Lịch sử đặt phòng  |
| Rating     | 0.10     | Điểm đánh giá      |
Khi người dùng chưa có lịch sử (khách hoặc đăng nhập lần đầu), hệ thống gợi ý theo **số sao + lượt yêu thích toàn hệ thống**.
Trọng số có thể chỉnh tại: `backend/routes/recommendations.js` → object `WEIGHTS`.
**Luồng dữ liệu:**
Trình duyệt → Frontend (HTML/JS)-> REST API (Express) → MySQL
                                 
                          Recommendation Engine
                          Gmail SMTP (email xác nhận)
                          Google OAuth (đăng nhập)

## Phần mềm cần thiết
| Phần mềm                      | Phiên bản | Ghi chú         |
| [Node.js](https://nodejs.org) | >= 18.x   | Runtime backend |
| [MySQL](https://www.mysql.com)| >= 8.0    | Cơ sở dữ liệu   |
| Trình duyệt web| Chrome / Edge / Firefox  | Chạy Frontend   |
## Cài đặt và chạy chương trình
### Bước 1 — Import database
Mở MySQL client (Workbench hoặc terminal) và chạy:
mysql -u root -p < database/vinhlong_hotel_complete.sql
Hoặc dùng MySQL Workbench: **File → Run SQL Script** → chọn file `vinhlong_hotel_complete.sql`.
### Bước 2 — Cấu hình môi trường
Mở file `backend/.env` và kiểm tra các thông số:
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hotel_recommendation_system
JWT_SECRET=vinhlong_hotel_secret_key_2024
JWT_EXPIRES_IN=7d

MAIL_USER=your_gmail@gmail.com
MAIL_PASS=your_gmail_app_password

GOOGLE_CLIENT_ID=your_google_client_id

 Gmail:Cần bật 2-Step Verification và tạo App Password tại [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### Bước 3 — Cài đặt dependencies
cd backend
npm install
### Bước 4 — Khởi động server
cd backend
node server.js
Hoặc dùng npm script:
npm start
Hoặc dùng nodemon để tự reload khi sửa code:
npm run dev
### Bước 5 — Mở trình duyệt
Truy cập: **http://localhost:3000**
## Tài khoản mặc định
Admin: admin@vinhlong.com, password: Admin@123 
Chủ khách sạn: owner@vinhlong.com, password: Owner@123 
## Hướng dẫn sử dụng
Người dùng thông thường
Tìm kiếm khách sạn
1. Nhập tên khách sạn hoặc khu vực vào ô tìm kiếm → nhấn **Tìm kiếm**.
2. Dùng bộ lọc bên trái để lọc theo giá, số sao, đánh giá, tiện ích.
3. Nhấn chip địa điểm du lịch (Cù lao An Bình, Văn Thánh Miếu...) để xem khách sạn gần đó.
4. Nhấn Gần tôi để tìm khách sạn trong bán kính 10 km.

Đặt phòng
1. Vào trang chi tiết khách sạn → chọn loại phòng, số lượng, ngày nhận/trả phòng.
2. Nhấn Đặt phòng ngay-> hệ thống tạo đơn đặt phòng trạng thái Chờ xác nhận.
3. Khi chủ khách sạn xác nhận → nhận email và thông báo trong hệ thống.
Yêu thích & Đánh giá
- Nhấn icon tim trên card khách sạn để thêm/xóa yêu thích.
- Sau khi lưu trú (trạng thái *Hoàn thành*) có thể gửi đánh giá sao và nhận xét.
Gợi ý cá nhân
- Hệ thống tự học theo hành vi: càng tương tác nhiều → gợi ý càng chính xác.
- Trang chủ hiển thị Gợi ý dành riêng cho bạn khi đã có lịch sử.
### Chủ khách sạn
Đăng nhập -> Quản lý KS.
### Admin
Đăng nhập bằng tài khoản admin -> Admin.
## Công nghệ sử dụng
Backend: Node.js, Express.js, MySQL2, JWT, Bcrypt, Nodemailer, Multer, Google Auth Library
Frontend: HTML5, CSS3, JavaScript (ES6+), Leaflet.js (bản đồ), Google Identity Services
Database: MySQL 8.0 với Triggers tự động tạo thông báo
Email: Gmail SMTP qua Nodemailer
