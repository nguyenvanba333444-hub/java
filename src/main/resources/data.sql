-- Không chèn tin phòng mẫu: trang tìm phòng chỉ hiển thị dữ liệu đủ ảnh từ API /api/rooms.

-- Nguoi dung (chủ tro + nguoi thue)
-- Dung INSERT IGNORE de khi khoi dong lai app (MySQL luu du lieu) khong bi loi trung khoa
-- Chuyen role cu TENANT/OWNER sang USER, luu loai tai khoan o account_type.
-- Trim de xu ly gia tri bi them dau xuong dong khi sua trong phpMyAdmin.
UPDATE tenant SET role = UPPER(REPLACE(REPLACE(TRIM(role), CHAR(13), ''), CHAR(10), ''));
UPDATE tenant SET account_type = CASE role WHEN 'OWNER' THEN 'OWNER' WHEN 'TENANT' THEN 'TENANT' ELSE account_type END WHERE role IN ('OWNER', 'TENANT');
UPDATE tenant SET role = 'USER' WHERE role IN ('OWNER', 'TENANT');
ALTER TABLE tenant MODIFY COLUMN role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER';

INSERT IGNORE INTO tenant (id, full_name, phone, email, role, account_type) VALUES
(1, 'Nguyen Van A', '0901234567', 'a@gmail.com', 'USER', 'OWNER'),
(2, 'Tran Thi B', '0907654321', 'b@gmail.com', 'USER', 'OWNER'),
(3, 'Le Van C', '0355551234', 'c@student.com', 'USER', 'TENANT'),
(4, 'Pham Thi D', '0366664321', 'd@student.com', 'USER', 'TENANT');

-- Tin phòng và yêu cầu thuê được tạo qua các luồng nghiệp vụ, không seed dữ liệu giả.
