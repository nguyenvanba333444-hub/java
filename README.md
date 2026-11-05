# Trọ Tốt — Java Spring Boot và Node.js

Kho mã hiện có hai backend độc lập dùng chung đề tài Trọ Tốt. **Bài Java môn học** nằm trong `src/main/java`, dùng Spring Boot/Thymeleaf/MySQL và chạy ở cổng 8080. Bản Node.js nằm ở `server.js`, dùng Express/EJS và chạy ở cổng 3000. Khi chấm Java, chạy backend Spring Boot theo mục “Chạy backend Java Spring Boot”; không gửi request CRUD Java vào cổng Node.js.

## Chạy trên máy Windows

1. Mở XAMPP và bấm **Start** cho MySQL.
2. Mở terminal tại thư mục dự án đã clone hoặc giải nén, nơi có `package.json`.
3. Cài thư viện (chỉ làm lần đầu):

   ```powershell
   npm install
   ```

4. Chạy web:

   ```powershell
   npm run dev
   ```

5. Mở `http://localhost:3000`.

Ứng dụng tự tạo database `roomdb` và các bảng `tenant`, `room`, `room_images`, `booking`, `user_favorite` nếu chưa có. Nếu XAMPP của bạn đặt mật khẩu MySQL cho `root`, tạo file `.env` từ `.env.example`, rồi điền `DB_PASSWORD`.

## Tài khoản quản trị mặc định

- Email: `admin@trotot.local`
- Mật khẩu: `Admin@12345`

Đổi các giá trị này trong `.env` trước khi dùng chung máy hoặc triển khai.

## Tạo dữ liệu demo

Ứng dụng không tự thêm phòng giả khi khởi động. Để tạo sáu tin mẫu dùng các ảnh đang có trong `uploads/rooms`, mở `.env` và đặt `DEMO_SEED=1`, sau đó chạy `npm run seed:demo`. Lệnh tạo tài khoản `demo@trotot.local` với mật khẩu mặc định `Demo@12345`; có thể đổi mật khẩu bằng `DEMO_PASSWORD`. Tắt `DEMO_SEED` sau khi tạo để tránh chạy nhầm. Chỉ dùng tài khoản này trong môi trường trình bày trên máy cá nhân.

## Tính năng

- Đăng ký, đăng nhập, phân quyền tài khoản thường và admin.
- Danh sách trang chủ được tải trực tiếp từ API `GET /api/rooms`; chi tiết phòng tải từ `GET /api/rooms/:id`.
- API chỉ trả về tin có ít nhất 3 ảnh. Tin cũ thiếu ảnh được ẩn khỏi khách thuê và đánh dấu trong admin để bổ sung.
- Mặc định không seed dữ liệu giả vào database. Có lệnh riêng để tạo tin demo khi cần trình bày; tin thật chỉ xuất hiện sau khi tài khoản đăng tin và tải lên ít nhất 3 ảnh.
- Các bảng phòng, ảnh, yêu thích, yêu cầu thuê và đánh giá có quan hệ khóa ngoại; khi nâng cấp database cũ, ứng dụng chỉ thêm khóa ngoại nếu không có dòng mồ côi, còn dòng lỗi được báo để xử lý thủ công.
- Đăng tin, chọn địa chỉ, tải ảnh, sửa/xóa tin.
- Gửi yêu cầu thuê và theo dõi trạng thái.
- Lưu/bỏ lưu phòng yêu thích theo tài khoản; danh sách được đồng bộ qua API.
- Admin xem số liệu, tài khoản, tin phòng, yêu cầu thuê và phân trang.
- Chọn tỉnh và phường/xã theo danh mục hành chính mới từ API; chọn vị trí trên bản đồ OpenStreetMap và ước tính khoảng cách đường chim bay tới địa điểm khác.
- Thư viện hỗ trợ ảnh và video; ảnh được giảm kích thước trên trình duyệt. Nếu cấu hình Cloudinary, tệp mới được lưu trên Cloudinary và tối ưu khi phân phối.
- Có thể bật đăng nhập Google/Facebook, QR chuyển khoản VietQR và chat Tawk.to bằng thông tin ứng dụng/tài khoản của chủ dự án.
- Lưu phiên đăng nhập trong MySQL; chặn yêu cầu thay đổi dữ liệu từ trang khác; giới hạn số lần đăng nhập, đăng ký và tra cứu vị trí; cookie phiên có cờ bảo mật khi chạy production.

## Kiểm thử và API

Chạy kiểm thử xác thực dữ liệu phòng và ngày thuê với `npm test` (dùng `node:test` tích hợp sẵn, không cần cài thêm thư viện).

Các endpoint JSON chính:

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| GET | `/api/rooms?city=&minPrice=&maxPrice=` | Tìm phòng theo khu vực và khoảng giá |
| GET | `/api/rooms/:id` | Xem chi tiết phòng |
| POST | `/api/rooms` | Tạo tin phòng, đăng nhập; gửi `multipart/form-data` với 3–8 ảnh trong trường `imageFiles` |
| PUT | `/api/rooms/:id` | Sửa tin của mình; gửi đủ trường phòng, ảnh mới không bắt buộc |
| DELETE | `/api/rooms/:id` | Xóa tin của mình và các dữ liệu liên quan |
| GET, POST, DELETE | `/api/favorites` và `/api/favorites/:id` | Xem, thêm, bỏ yêu thích (cần đăng nhập) |
| GET, POST | `/api/rooms/:id/reviews` | Xem và gửi đánh giá (cần đăng nhập để gửi) |
| GET | `/api/locations/provinces`, `/api/locations/provinces/:code/wards` | Tra cứu tỉnh và phường/xã |
| GET | `/api/geocode?q=` | Tìm tọa độ địa chỉ |

Để thử CRUD phòng trong Postman, đăng nhập trước bằng `POST /login` với `x-www-form-urlencoded`; Postman phải giữ cookie phiên. Khi tạo phòng, dùng `form-data` với `title`, `city`, `district`, `address`, `price`, `area`, `description`, và thêm tối thiểu 3 ảnh ở các dòng cùng tên `imageFiles` (kiểu File). Hỗ trợ JPG, PNG, GIF, WebP và AVIF; ảnh tối đa 5 MB. `PUT` cần gửi đủ thông tin phòng; thêm ảnh là tùy chọn. Các thao tác sửa/xóa chỉ thành công với chủ phòng hoặc admin.

## Bật các dịch vụ ngoài

Sao chép `.env.example` thành `.env`, rồi chỉ điền khóa của tài khoản do bạn sở hữu. Không gửi các khóa bí mật lên Git hoặc cho người khác.

- **Google/Facebook:** tạo ứng dụng OAuth tại Google Cloud Console / Meta for Developers, thêm đúng callback `http://localhost:3000/auth/google/callback` hoặc `/auth/facebook/callback`, rồi điền ID và secret. Nút đăng nhập chỉ xuất hiện khi đã cấu hình.
- **Cloudinary:** điền Cloud name, API key và API secret. Ảnh/video tải lên sau đó sẽ lưu trên Cloudinary; dữ liệu cũ trong `uploads/rooms` vẫn dùng được.
- **QR chuyển khoản:** điền mã ngân hàng và số tài khoản nhận cọc. Mã QR hiển thị số cọc bằng một tháng tiền phòng (có thể chỉnh `DEPOSIT_RATE`). Admin phải đối soát giao dịch rồi mới bấm xác nhận đã nhận cọc; ứng dụng chưa tự nhận webhook ngân hàng/PayOS.
- **Tawk.to:** tạo widget website và điền Property ID cùng Widget ID.

Khi cấu hình tài khoản ngân hàng, khách có thể chọn chuyển khoản QR hoặc thanh toán tiền mặt khi xem phòng; nếu chưa cấu hình ngân hàng, chỉ hiện lựa chọn tiền mặt. Admin xác nhận tiền cọc thủ công; ứng dụng chưa tự nhận webhook ngân hàng/PayOS. Muốn tự động xác nhận cần tích hợp cổng thanh toán và webhook có chữ ký cùng thông tin tài khoản dịch vụ thật.

Danh mục địa chỉ lấy từ [Vietnam Provinces Open API](https://provinces.open-api.vn/). Danh mục hiện hành dùng tỉnh và phường/xã (quận/huyện đã thay đổi theo đợt sắp xếp năm 2025). Bản đồ dùng OpenStreetMap; khoảng cách hiển thị là đường chim bay, không phải quãng đường di chuyển.

## Cấu trúc Node.js

```text
server.js          # Express routes, đăng nhập, phân quyền và nghiệp vụ
 db.js             # Kết nối MySQL và tạo bảng
 views/             # Giao diện EJS
 public/            # CSS và tài nguyên giao diện
 uploads/rooms/     # Ảnh phòng tải lên
 package.json       # Thư viện và lệnh chạy
 .env.example       # Mẫu cấu hình database
```


## Chạy backend Java Spring Boot

Mã Java nằm trong `src/main/java`; chạy riêng trên cổng 8080 sau khi bật MySQL trong XAMPP. Mở terminal tại thư mục dự án và chạy `mvnw.cmd spring-boot:run`. Tài khoản quản trị mặc định: `admin@trotot.local` / `Admin@12345`; nên đổi bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` trước khi triển khai.

API phòng có `GET /api/rooms`, `GET /api/rooms/page`, `GET /api/rooms/{id}`, `POST /api/rooms`, `PUT /api/rooms/{id}` và `DELETE /api/rooms/{id}`. POST/PUT/DELETE yêu cầu đăng nhập; người dùng chỉ sửa/xóa tin của mình, ADMIN được quản lý mọi tin. Phân trang nhận `page`, `size` (tối đa 100), `city`, `district`, `minPrice`, `maxPrice`, `available` và `roomType`. Yêu cầu thuê dùng `POST /api/bookings` với `roomId`, `startDate`, `endDate` và tùy chọn `paymentMethod` (`CASH` hoặc `BANK_TRANSFER`); tài khoản tenant được lấy từ phiên đăng nhập. Admin đối soát cọc bằng `PUT /api/bookings/{id}/payment` với `{"paymentStatus":"PAID"}`.

Import `postman/collections/TroTot_Java_API.postman_collection.json` và `postman/environments/TroTot_Java_Local.postman_environment.json`. Điền tài khoản USER thử nghiệm, chạy login, rồi chạy CRUD theo thứ tự; request cuối xóa tin thử vừa tạo. API trả HTTP 201 khi tạo, 404 nếu không có tin và 204 khi xóa thành công.

Đặt cọc VietQR dùng `PAYMENT_BANK_ID`, `PAYMENT_ACCOUNT_NO`, `PAYMENT_ACCOUNT_NAME` và tùy chỉnh số tháng bằng `DEPOSIT_RATE`. Thanh toán QR đang được admin xác nhận thủ công; ứng dụng không tự nhận webhook ngân hàng.

