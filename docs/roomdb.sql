-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 04, 2026 lúc 06:07 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `roomdb`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `booking`
--

CREATE TABLE `booking` (
  `id` int(11) NOT NULL,
  `end_date` varchar(255) DEFAULT NULL,
  `room_id` int(11) NOT NULL,
  `start_date` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `tenant_id` int(11) NOT NULL,
  `deposit_amount` bigint(20) NOT NULL DEFAULT 0,
  `payment_code` varchar(40) DEFAULT NULL,
  `payment_status` enum('NOT_CONFIGURED','PENDING','PAID') NOT NULL DEFAULT 'NOT_CONFIGURED',
  `payment_method` enum('BANK_TRANSFER','CASH') NOT NULL DEFAULT 'CASH'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `booking`
--

INSERT INTO `booking` (`id`, `end_date`, `room_id`, `start_date`, `status`, `tenant_id`, `deposit_amount`, `payment_code`, `payment_status`) VALUES
(1, '2026-12-01', 4, '2026-10-01', 'ACTIVE', 3, 0, NULL, 'NOT_CONFIGURED');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `room`
--

CREATE TABLE `room` (
  `id` int(11) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `area` double NOT NULL,
  `available` bit(1) NOT NULL,
  `city` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `price` double NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `room`
--

INSERT INTO `room` (`id`, `address`, `area`, `available`, `city`, `description`, `district`, `image_url`, `owner_id`, `price`, `title`, `latitude`, `longitude`) VALUES
(1, '12 Nguyen Hue', 20, b'1', 'Ha Noi', 'Phong sach se, gan truong', 'Hai Ba Trung', '/uploads/rooms/1793810825586-ee02a4fcd2.jpg', 2, 2500000, 'Phong tro gan DH Bach Khoa', NULL, NULL),
(2, '45 Hang Bai', 25, b'1', 'Ha Noi', 'Giua trung tam, tien nghi', 'Hoan Kiem', '/uploads/rooms/1793810765271-ea15da9ae9.jpg', 2, 3500000, 'Phong tro khu Pho Co', NULL, NULL),
(3, '88 Nguyen Hue', 22, b'1', 'TP Ho Chi Minh', 'Gan cho Ben Thanh', 'Quan 7', '/uploads/rooms/1793810669682-c48704bec0.jpg', 2, 3000000, 'Phong tro quan 7', NULL, NULL),
(4, '20 Xo Viet', 18, b'1', 'TP Ho Chi Minh', 'Gia re, phong dep', 'Binh Thanh', '/uploads/rooms/1793809715591-a37ef09dee.jpg', 2, 2000000, 'Phong tro Binh Thanh', NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `room_images`
--

CREATE TABLE `room_images` (
  `room_id` int(11) NOT NULL,
  `image_order` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `media_type` enum('IMAGE','VIDEO') NOT NULL DEFAULT 'IMAGE',
  `public_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `room_images`
--

INSERT INTO `room_images` (`room_id`, `image_order`, `image_url`, `media_type`, `public_id`) VALUES
(1, 0, '/uploads/rooms/1793810825586-ee02a4fcd2.jpg', 'IMAGE', NULL),
(1, 1, '/uploads/rooms/1793810825587-c6fb547104.jpg', 'IMAGE', NULL),
(1, 2, '/uploads/rooms/1793810825588-8801689095.jpg', 'IMAGE', NULL),
(2, 0, '/uploads/rooms/1793810765271-ea15da9ae9.jpg', 'IMAGE', NULL),
(2, 1, '/uploads/rooms/1793810765272-52a1e3a897.jpg', 'IMAGE', NULL),
(2, 2, '/uploads/rooms/1793810765273-205ee31e22.jpg', 'IMAGE', NULL),
(3, 0, '/uploads/rooms/1793810669682-c48704bec0.jpg', 'IMAGE', NULL),
(3, 1, '/uploads/rooms/1793810669683-2f3bee1614.jpg', 'IMAGE', NULL),
(3, 2, '/uploads/rooms/1793810669686-44c79c2c4a.jpg', 'IMAGE', NULL),
(4, 0, '/uploads/rooms/1793809715591-a37ef09dee.jpg', 'IMAGE', NULL),
(4, 1, '/uploads/rooms/1793809715597-128e79efbb.jpg', 'IMAGE', NULL),
(4, 2, '/uploads/rooms/1793809715602-68d742f58f.jpg', 'IMAGE', NULL),
(4, 3, '/uploads/rooms/1793809715608-c855411343.jpg', 'IMAGE', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `room_review`
--

CREATE TABLE `room_review` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comment` varchar(1000) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tenant`
--

CREATE TABLE `tenant` (
  `id` int(11) NOT NULL,
  `email` varchar(190) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `account_type` enum('TENANT','OWNER') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `tenant`
--

INSERT INTO `tenant` (`id`, `email`, `full_name`, `password_hash`, `phone`, `role`, `account_type`) VALUES
(1, 'nguyenminhhung12092006@gmail.com', 'hung', '$2a$10$Q/kiBJWluC.IQB//2NxxY.OSa1gWLO52dvCB0cHgDx8qkUwCmgEQu', '0123456781', 'ADMIN', NULL),
(2, 'hung12@gmail.com', 'hung1', '$2a$10$3QBniYoODvMGp9Z0LoWef.QuyX0iIIonqfqdu0T9MgWzxjdsnHicS', '0987654321', 'USER', 'TENANT'),
(3, 'c@student.com', 'Le Van C', NULL, '0355551234', 'USER', 'TENANT'),
(4, 'd@student.com', 'Pham Thi D', NULL, '0366664321', 'USER', 'TENANT'),
(8, 'admin@trotot.local', 'Quản trị viên', '$2a$10$f2OskKKRCK/h1rK.L6MkwuwMoU58xyMlwt0G.tsiaZdSojp10DeXu', '0000000000', 'ADMIN', NULL),
(9, 'admin2@trotot.local', 'Tài khoản kiểm thử 2', '$2a$10$ZJoQPmJnAV.FhWMAi9kLkei7ofOy9Wvly//QrJezWI7NAT2nK5kX2', '0326534567', 'ADMIN', 'TENANT');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_favorite`
--

CREATE TABLE `user_favorite` (
  `user_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_room` (`room_id`),
  ADD KEY `idx_booking_tenant` (`tenant_id`);

--
-- Chỉ mục cho bảng `room`
--
ALTER TABLE `room`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_owner` (`owner_id`),
  ADD KEY `idx_room_city_price` (`city`,`price`);

--
-- Chỉ mục cho bảng `room_images`
--
ALTER TABLE `room_images`
  ADD PRIMARY KEY (`room_id`,`image_order`),
  ADD KEY `idx_room_images_room` (`room_id`);

--
-- Chỉ mục cho bảng `room_review`
--
ALTER TABLE `room_review`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_review_user` (`room_id`,`user_id`),
  ADD KEY `idx_room_review_created` (`created_at`),
  ADD KEY `idx_room_review_user` (`user_id`);

--
-- Chỉ mục cho bảng `tenant`
--
ALTER TABLE `tenant`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenant_email` (`email`);

--
-- Chỉ mục cho bảng `user_favorite`
--
ALTER TABLE `user_favorite`
  ADD PRIMARY KEY (`user_id`,`room_id`),
  ADD KEY `idx_favorite_room` (`room_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `room`
--
ALTER TABLE `room`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `room_review`
--
ALTER TABLE `room_review`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `tenant`
--
ALTER TABLE `tenant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

-- Quan hệ nghiệp vụ và toàn vẹn tham chiếu
ALTER TABLE `room`
  ADD CONSTRAINT `fk_room_owner` FOREIGN KEY (`owner_id`) REFERENCES `tenant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `room_images`
  ADD CONSTRAINT `fk_room_images_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `booking`
  ADD CONSTRAINT `fk_booking_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `user_favorite`
  ADD CONSTRAINT `fk_favorite_user` FOREIGN KEY (`user_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_favorite_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `room_review`
  ADD CONSTRAINT `fk_review_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
