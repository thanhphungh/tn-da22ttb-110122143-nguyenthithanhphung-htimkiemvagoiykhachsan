-- ============================================================
-- VinhLong Hotel - Database Complete
-- Exported: 18:01:06 28/6/2026
-- Usage: mysql -u root -p < database/vinhlong_hotel_complete.sql
-- ============================================================

DROP DATABASE IF EXISTS hotel_recommendation_system;
CREATE DATABASE hotel_recommendation_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_recommendation_system;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT 'default.jpg',
  `role` enum('user','admin','owner') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0' COMMENT 'Chủ KS đã xác thực email',
  `business_name` varchar(200) DEFAULT NULL COMMENT 'Tên doanh nghiệp',
  `business_address` text,
  `google_id` varchar(255) DEFAULT NULL,
  `google_avatar` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `phone`, `avatar`, `role`, `created_at`, `is_verified`, `business_name`, `business_address`, `google_id`, `google_avatar`) VALUES
(1, 'Admin VinhLong Hotel', 'admin@vinhlong.com', '$2a$10$k/xfHdCOwn5sXtuBabVW8OlIUWjVXc/.ZnFS0e6PUSMDzBM1p6tJG', '0900000001', 'default.jpg', 'admin', '2026-06-26 16:51:19', 1, NULL, NULL, NULL, NULL),
(2, 'Nguyễn Văn Chủ', 'owner@vinhlong.com', '$2a$10$Yujfm9eMHhE4ckBfn7G4DujG49qo/xCM4SXd/S7WA6dGvp3QZFEG.', '0900000002', 'default.jpg', 'owner', '2026-06-26 16:51:19', 1, 'Công ty TNHH VinhLong Tourism', NULL, NULL, NULL),
(3, 'Thành Nguyễn', 'tthi20301@gmail.com', '$2a$10$Z0owdRrKroQwH5ZFA5.FLOdoZR5PWOURKXyDbZtXHl.Naz9aGXjiu', NULL, 'default.jpg', 'user', '2026-06-26 17:28:42', 0, NULL, NULL, '108869415306020641309', 'https://lh3.googleusercontent.com/a/ACg8ocL17F4bk0PEWhpGYH53d6R9rFvzDPD34uAuim_awcbk7TYIReM=s96-c'),
(4, 'Thanh Phụng', 'thanhphung2808@gmail.com', '$2a$10$zuvM/vm3YxFkO6PLLjPZY.rxOKu46Nra6Yb3mTOyx6VDBS7kOWOk2', '0943830665', 'default.jpg', 'user', '2026-06-26 18:21:51', 0, NULL, NULL, NULL, NULL);

-- Table: hotels
DROP TABLE IF EXISTS `hotels`;
CREATE TABLE `hotels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `address` text NOT NULL,
  `ward` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT 'Vĩnh Long',
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `star` int DEFAULT '1',
  `rating` float DEFAULT '0',
  `total_reviews` int DEFAULT '0',
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT 'default_hotel.jpg',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hotel_location` (`latitude`,`longitude`),
  KEY `idx_hotel_price` (`price`),
  KEY `idx_hotel_rating` (`rating`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hotels` (`id`, `name`, `description`, `address`, `ward`, `district`, `province`, `latitude`, `longitude`, `price`, `star`, `rating`, `total_reviews`, `phone`, `email`, `image`, `status`, `created_at`) VALUES
(1, 'Bình Đạii Hotel TEST', 'Test desc', 'Bình Đại', '', 'Bình Đại', 'Vinh Long', 10.19937942, 106.6866169, '475639.00', 3, 4.4, 0, '', '', '/uploads/hotels/BinhDai.jpg', 'active', '2026-06-26 13:22:10'),
(2, 'Thien Phuc Hotel', NULL, '66 Nguyễn Thị Định, Khu phố 5, Ba Tri, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.05027439, 106.6006211, '300000.00', 1, 4.2, 0, NULL, NULL, '/uploads/hotels/ThienPhuc.jpg', 'active', '2026-06-26 13:22:10'),
(3, 'VinaEcolife Lodge', NULL, '456 ĐH14, ấp Phú Thạnh, Tân Xuân, Vĩnh Long 86000, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.06315203, 106.6159224, '565000.00', 1, 4.8, 0, NULL, NULL, '/uploads/hotels/VinaEcolifeLodge.jpg', 'active', '2026-06-26 13:22:10'),
(4, 'Thusan House', NULL, '299 AQ An Quoi, Ba Tri, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.03088122, 106.5979578, '1802000.00', 1, 4.8, 0, NULL, NULL, '/uploads/hotels/ThusanHouse.jpg', 'active', '2026-06-26 13:22:10'),
(5, 'Hotel Maria', NULL, '10 Nguyễn Thị Định, Khu Phố 5, Ba Tri, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.04665032, 106.5948486, '350000.00', 1, 3.9, 0, NULL, NULL, '/uploads/hotels/HotelMaria.jpg', 'active', '2026-06-26 13:22:10'),
(6, 'Mekong Home', NULL, 'Ấp 9, Xã Phước Long, Huyện Giồng Trôm, Phước Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.16364476, 106.3819885, '1720000.00', 1, 4.8, 0, NULL, NULL, '/uploads/hotels/MekongHome.jpg', 'active', '2026-06-26 13:22:10'),
(7, 'Khách sạn Mỹ Cảng Hotel', NULL, '251 Đường 30 Tháng 4, Long Đức, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.24351244, 105.9728412, '492000.00', 2, 4.4, 0, NULL, NULL, '/uploads/hotels/MyCangHotel.jpg', 'active', '2026-06-26 13:22:10'),
(8, 'MeKong Star Hotel', NULL, '18 Hùng Vương, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2538, 105.9722, '280000.00', 1, 4.3, 0, NULL, NULL, '/uploads/hotels/MeKongStarHotel.jpg', 'active', '2026-06-26 13:22:10'),
(9, 'Ruby Hotel Vĩnh Long', NULL, '255A Nguyễn Văn Thiệt, Phường 3, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2487, 105.9671, '550000.00', 1, 4.4, 0, NULL, NULL, '/uploads/hotels/RubyHotelVĩnh Long.jpg', 'active', '2026-06-26 13:22:10'),
(10, 'Ngũ Long Tam (Ngôi Sao)', NULL, '34 Trưng Nữ Vương, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2542, 105.9735, '450000.00', 1, 4.1, 0, NULL, NULL, '/uploads/hotels/Ngulongtam.jpg', 'active', '2026-06-26 13:22:10'),
(12, 'Khách Sạn Ánh Hồng 1', NULL, '1/2 Hoàng Thái Hiếu, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.253, 105.971, '300000.00', 2, 4.4, 0, NULL, NULL, '/uploads/hotels/AnhHong.jpg', 'active', '2026-06-26 13:22:10'),
(13, 'Khách Sạn Vân Trang', NULL, '3C Hưng Đạo Vương, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2521, 105.9704, '250000.00', 2, 4.2, 0, NULL, NULL, '/uploads/hotels/VanTrang.jpg', 'active', '2026-06-26 13:22:10'),
(14, 'Khách Sạn Phước Thành IV', NULL, '44 Nguyễn Huệ, Phường 2, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2503, 105.9688, '350000.00', 2, 4, 0, NULL, NULL, '/uploads/hotels/PhuocThanhIV.jpg', 'active', '2026-06-26 13:22:10'),
(16, 'Khách Sạn Sài Gòn Vĩnh Long', NULL, '02 Trưng Nữ Vương, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.255, 105.9745, '850000.00', 2, 4.5, 0, NULL, NULL, '/uploads/hotels/SaiGon-VinhLong.jpg', 'active', '2026-06-26 13:22:10'),
(18, 'Khách Sạn Minh Quân', NULL, '88A Phó Cơ Điều, Phường 3, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2465, 105.9669, '420000.00', 2, 4.2, 0, NULL, NULL, '/uploads/hotels/MinhKhue.jpg', 'active', '2026-06-26 13:22:10'),
(19, 'Khách Sạn Hoàng Gia', NULL, '12 Nguyễn Văn Thiệt, Phường 3, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2478, 105.9681, '450000.00', 2, 4.3, 0, NULL, NULL, '/uploads/hotels/Hoangmyjpg.jpg', 'active', '2026-06-26 13:22:10'),
(20, 'Khách Sạn Thiên Thanh', NULL, '25A Trần Đại Nghĩa, Phường 4, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2462, 105.9647, '380000.00', 2, 4.1, 0, NULL, NULL, '/uploads/hotels/ThienThanh.jpg', 'active', '2026-06-26 13:22:10'),
(23, 'Khách Sạn Kim Cương', NULL, '102 Phạm Hùng, Phường 9, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2415, 105.9624, '600000.00', 2, 4.5, 0, NULL, NULL, '/uploads/hotels/Palacel.jpg', 'active', '2026-06-26 13:22:10'),
(24, 'Khách Sạn Thanh Bình', NULL, '88 Trần Phú, Phường 4, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2451, 105.9651, '290000.00', 2, 3.8, 0, NULL, NULL, '/uploads/hotels/ThaiBinh.jpg', 'active', '2026-06-26 13:22:10'),
(28, 'Khách Sạn Trường An', NULL, '54 Đinh Tiên Hoàng, Phường 8, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2439, 105.9632, '390000.00', 2, 4.1, 0, NULL, NULL, '/uploads/hotels/TruongAn.jpg', 'active', '2026-06-26 13:22:10'),
(30, 'Khách Sạn An Bình', NULL, '21 Nguyễn Huệ, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2512, 105.9702, '360000.00', 2, 4.1, 0, NULL, NULL, '/uploads/hotels/Vinhouse.jpg', 'active', '2026-06-26 13:22:10'),
(33, 'Khách Sạn Minh Tâm', NULL, '29 Lê Lai, Phường 2, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2505, 105.9695, '310000.00', 2, 3.9, 0, NULL, NULL, '/uploads/hotels/ThuyNguyen.jpg', 'active', '2026-06-26 13:22:10'),
(35, 'Khách Sạn Nhật Quang', NULL, '52 Đinh Tiên Hoàng, Phường 8, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2446, 105.9629, '390000.00', 2, 4, 0, NULL, NULL, '/uploads/hotels/NhatPhuong.jpg', 'active', '2026-06-26 13:22:10'),
(45, 'Khách Sạn Thanh Trúc', NULL, '73 Nguyễn Văn Thiệt, Phường 3, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2476, 105.9674, '460000.00', 2, 4.3, 0, NULL, NULL, '/uploads/hotels/KhcahSanThanhTra.jpg', 'active', '2026-06-26 13:22:10'),
(47, 'Khách Sạn Ngọc Phát', NULL, '10 Hoàng Thái Hiếu, Phường 1, Vĩnh Long, Việt Nam', NULL, 'TP. Vĩnh Long', 'Vĩnh Long', 10.2523, 105.9715, '280000.00', 2, 3.8, 0, NULL, NULL, '/uploads/hotels/NgocQuy.jpg', 'active', '2026-06-26 13:22:10');

-- Table: hotel_images
DROP TABLE IF EXISTS `hotel_images`;
CREATE TABLE `hotel_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `image_url` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `hotel_images_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: services
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_name` (`service_name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `services` (`id`, `service_name`) VALUES
(4, 'Bãi đỗ xe'),
(12, 'Bar'),
(6, 'Dịch vụ phòng'),
(5, 'Điều hòa'),
(10, 'Đưa đón sân bay'),
(9, 'Giặt ủi'),
(2, 'Hồ bơi'),
(11, 'Lễ tân 24/7'),
(3, 'Nhà hàng'),
(7, 'Phòng gym'),
(13, 'Phòng họp'),
(8, 'Spa'),
(15, 'Truyền hình cáp'),
(14, 'Tủ lạnh'),
(1, 'WiFi miễn phí');

-- Table: hotel_services
DROP TABLE IF EXISTS `hotel_services`;
CREATE TABLE `hotel_services` (
  `hotel_id` int NOT NULL,
  `service_id` int NOT NULL,
  PRIMARY KEY (`hotel_id`,`service_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `hotel_services_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hotel_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hotel_services` (`hotel_id`, `service_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1),
(12, 1),
(13, 1),
(14, 1),
(16, 1),
(18, 1),
(19, 1),
(20, 1),
(23, 1),
(24, 1),
(28, 1),
(30, 1),
(33, 1),
(35, 1),
(45, 1),
(47, 1),
(1, 5),
(2, 5),
(3, 5),
(4, 5),
(5, 5),
(6, 5),
(7, 5),
(8, 5),
(9, 5),
(10, 5),
(12, 5),
(13, 5),
(14, 5),
(16, 5),
(18, 5),
(19, 5),
(20, 5),
(23, 5),
(24, 5),
(28, 5),
(30, 5),
(33, 5),
(35, 5),
(45, 5),
(47, 5),
(1, 11),
(2, 11),
(3, 11),
(4, 11),
(5, 11),
(6, 11),
(7, 11),
(8, 11),
(9, 11),
(10, 11),
(12, 11),
(13, 11),
(14, 11),
(16, 11),
(18, 11),
(19, 11),
(20, 11),
(23, 11),
(24, 11),
(28, 11),
(30, 11),
(33, 11),
(35, 11),
(45, 11),
(47, 11);

-- Table: tourist_places
DROP TABLE IF EXISTS `tourist_places`;
CREATE TABLE `tourist_places` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `address` text,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ratings
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: favorites
DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
  `user_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`hotel_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `favorites` (`user_id`, `hotel_id`) VALUES
(2, 3),
(2, 4),
(4, 6);

-- Table: bookings
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  `check_in` date NOT NULL,
  `check_out` date NOT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `total_rooms` int DEFAULT '1',
  `status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `bookings` (`id`, `user_id`, `hotel_id`, `check_in`, `check_out`, `total_price`, `total_rooms`, `status`, `created_at`) VALUES
(1, 4, 6, '2026-06-26 17:00:00', '2026-06-27 17:00:00', '1720000.00', 1, 'pending', '2026-06-26 18:22:33'),
(2, 4, 3, '2026-06-27 17:00:00', '2026-06-29 17:00:00', '1130000.00', 1, 'confirmed', '2026-06-26 18:24:31');

-- Table: rooms
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `room_name` varchar(255) DEFAULT NULL,
  `room_type` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `max_people` int DEFAULT '2',
  `image` varchar(255) DEFAULT NULL,
  `status` enum('available','unavailable') DEFAULT 'available',
  PRIMARY KEY (`id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `rooms` (`id`, `hotel_id`, `room_name`, `room_type`, `price`, `quantity`, `max_people`, `image`, `status`) VALUES
(1, 1, 'Phòng Tiêu Chuẩn', 'Standard', '475639.00', 6, 2, NULL, 'available'),
(2, 2, 'Phòng Tiêu Chuẩn', 'Standard', '300000.00', 6, 2, NULL, 'available'),
(3, 3, 'Phòng Tiêu Chuẩn', 'Standard', '565000.00', 6, 2, NULL, 'available'),
(4, 4, 'Phòng Tiêu Chuẩn', 'Standard', '1802000.00', 6, 2, NULL, 'available'),
(5, 5, 'Phòng Tiêu Chuẩn', 'Standard', '350000.00', 6, 2, NULL, 'available'),
(6, 6, 'Phòng Tiêu Chuẩn', 'Standard', '1720000.00', 6, 2, NULL, 'available'),
(7, 7, 'Phòng Tiêu Chuẩn', 'Standard', '492000.00', 6, 2, NULL, 'available'),
(8, 8, 'Phòng Tiêu Chuẩn', 'Standard', '280000.00', 6, 2, NULL, 'available'),
(9, 9, 'Phòng Tiêu Chuẩn', 'Standard', '550000.00', 6, 2, NULL, 'available'),
(10, 10, 'Phòng Tiêu Chuẩn', 'Standard', '450000.00', 6, 2, NULL, 'available'),
(12, 12, 'Phòng Tiêu Chuẩn', 'Standard', '300000.00', 6, 2, NULL, 'available'),
(13, 13, 'Phòng Tiêu Chuẩn', 'Standard', '250000.00', 6, 2, NULL, 'available'),
(14, 14, 'Phòng Tiêu Chuẩn', 'Standard', '350000.00', 6, 2, NULL, 'available'),
(16, 16, 'Phòng Tiêu Chuẩn', 'Standard', '850000.00', 6, 2, NULL, 'available'),
(18, 18, 'Phòng Tiêu Chuẩn', 'Standard', '420000.00', 6, 2, NULL, 'available'),
(19, 19, 'Phòng Tiêu Chuẩn', 'Standard', '450000.00', 6, 2, NULL, 'available'),
(20, 20, 'Phòng Tiêu Chuẩn', 'Standard', '380000.00', 6, 2, NULL, 'available'),
(23, 23, 'Phòng Tiêu Chuẩn', 'Standard', '600000.00', 6, 2, NULL, 'available'),
(24, 24, 'Phòng Tiêu Chuẩn', 'Standard', '290000.00', 6, 2, NULL, 'available'),
(28, 28, 'Phòng Tiêu Chuẩn', 'Standard', '390000.00', 6, 2, NULL, 'available'),
(30, 30, 'Phòng Tiêu Chuẩn', 'Standard', '360000.00', 6, 2, NULL, 'available'),
(33, 33, 'Phòng Tiêu Chuẩn', 'Standard', '310000.00', 6, 2, NULL, 'available'),
(35, 35, 'Phòng Tiêu Chuẩn', 'Standard', '390000.00', 6, 2, NULL, 'available'),
(45, 45, 'Phòng Tiêu Chuẩn', 'Standard', '460000.00', 6, 2, NULL, 'available'),
(47, 47, 'Phòng Tiêu Chuẩn', 'Standard', '280000.00', 6, 2, NULL, 'available');

-- Table: booking_details
DROP TABLE IF EXISTS `booking_details`;
CREATE TABLE `booking_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `room_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  `price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `booking_details_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_details_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: search_history
DROP TABLE IF EXISTS `search_history`;
CREATE TABLE `search_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `keyword` varchar(255) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `filter_min_price` int DEFAULT NULL,
  `filter_max_price` int DEFAULT NULL,
  `filter_rating` float DEFAULT NULL,
  `result_count` int DEFAULT NULL,
  `source` varchar(20) DEFAULT 'filter',
  PRIMARY KEY (`id`),
  KEY `idx_sh_user_time` (`user_id`,`created_at`),
  KEY `idx_sh_keyword` (`keyword`),
  CONSTRAINT `search_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: hotel_views
DROP TABLE IF EXISTS `hotel_views`;
CREATE TABLE `hotel_views` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `hotel_id` int DEFAULT NULL,
  `viewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration_sec` int DEFAULT NULL,
  `referrer` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hotel_id` (`hotel_id`),
  KEY `idx_hv_user_hotel` (`user_id`,`hotel_id`),
  KEY `idx_hv_time` (`viewed_at`),
  CONSTRAINT `hotel_views_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hotel_views_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hotel_views` (`id`, `user_id`, `hotel_id`, `viewed_at`, `duration_sec`, `referrer`) VALUES
(1, 2, 3, '2026-06-26 17:27:25', NULL, 'hotel_detail'),
(6, 2, 3, '2026-06-26 18:00:09', NULL, 'hotel_detail'),
(7, 2, 3, '2026-06-26 18:00:21', NULL, 'hotel_detail'),
(9, 2, 16, '2026-06-26 18:00:28', NULL, 'hotel_detail'),
(10, 2, 4, '2026-06-26 18:01:05', NULL, 'hotel_detail'),
(11, 2, 3, '2026-06-26 18:01:12', NULL, 'hotel_detail'),
(13, 1, 1, '2026-06-26 18:05:20', NULL, 'hotel_detail'),
(17, 1, 1, '2026-06-26 18:11:02', NULL, 'hotel_detail'),
(19, 1, 1, '2026-06-26 18:14:54', NULL, 'hotel_detail'),
(20, 4, 3, '2026-06-26 18:22:04', NULL, 'hotel_detail'),
(21, 4, 6, '2026-06-26 18:22:14', NULL, 'hotel_detail'),
(22, 4, 3, '2026-06-26 18:24:16', NULL, 'hotel_detail'),
(23, 2, 9, '2026-06-26 18:36:40', NULL, 'hotel_detail'),
(24, 1, 3, '2026-06-26 18:46:56', NULL, 'hotel_detail'),
(25, 4, 3, '2026-06-26 18:48:17', NULL, 'hotel_detail'),
(26, 4, 6, '2026-06-26 18:48:43', NULL, 'hotel_detail');

-- Table: ai_recommend_logs
DROP TABLE IF EXISTS `ai_recommend_logs`;
CREATE TABLE `ai_recommend_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `hotel_id` int DEFAULT NULL,
  `action_type` enum('view','search','favorite','booking') DEFAULT NULL,
  `score` float DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `context` varchar(50) DEFAULT NULL,
  `clicked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `hotel_id` (`hotel_id`),
  CONSTRAINT `ai_recommend_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_recommend_logs_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `ai_recommend_logs` (`id`, `user_id`, `hotel_id`, `action_type`, `score`, `created_at`, `context`, `clicked`) VALUES
(1, 2, 3, 'view', 0, '2026-06-26 17:27:25', 'detail', 0),
(6, 2, 3, 'view', 0, '2026-06-26 18:00:09', 'detail', 0),
(7, 2, 3, 'view', 0, '2026-06-26 18:00:21', 'detail', 0),
(9, 2, 16, 'view', 0, '2026-06-26 18:00:28', 'detail', 0),
(10, 2, 4, 'view', 0, '2026-06-26 18:01:05', 'detail', 0),
(11, 2, 4, 'favorite', 0, '2026-06-26 18:01:07', 'hotel_detail', 0),
(12, 2, 3, 'view', 0, '2026-06-26 18:01:12', 'detail', 0),
(13, 2, 3, 'favorite', 0, '2026-06-26 18:01:17', 'hotel_detail', 0),
(15, 1, 1, 'view', 0, '2026-06-26 18:05:20', 'detail', 0),
(19, 1, 1, 'view', 0, '2026-06-26 18:11:02', 'detail', 0),
(21, 1, 1, 'view', 0, '2026-06-26 18:14:54', 'detail', 0),
(22, 4, 3, 'view', 0, '2026-06-26 18:22:04', 'detail', 0),
(23, 4, 6, 'view', 0, '2026-06-26 18:22:14', 'detail', 0),
(24, 4, 6, 'booking', 0, '2026-06-26 18:22:33', 'booking_page', 0),
(25, 4, 3, 'view', 0, '2026-06-26 18:24:16', 'detail', 0),
(26, 4, 3, 'booking', 0, '2026-06-26 18:24:31', 'booking_page', 0),
(27, 2, 9, 'view', 0, '2026-06-26 18:36:40', 'detail', 0),
(28, 1, 3, 'view', 0, '2026-06-26 18:46:56', 'detail', 0),
(29, 4, 3, 'view', 0, '2026-06-26 18:48:17', 'detail', 0),
(30, 4, 6, 'view', 0, '2026-06-26 18:48:43', 'detail', 0),
(31, 4, 6, 'favorite', 0, '2026-06-26 18:48:45', 'hotel_detail', 0);

-- Table: chatbot_messages
DROP TABLE IF EXISTS `chatbot_messages`;
CREATE TABLE `chatbot_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `sender` enum('user','bot') DEFAULT NULL,
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chatbot_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: voice_assistant_logs
DROP TABLE IF EXISTS `voice_assistant_logs`;
CREATE TABLE `voice_assistant_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `voice_text` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `voice_assistant_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(30) DEFAULT 'system' COMMENT 'booking_confirmed, booking_cancelled, account_approved, new_booking, hotel_approved',
  `link` varchar(255) DEFAULT NULL COMMENT 'Link điều hướng khi click',
  `actor_id` int DEFAULT NULL COMMENT 'Ai thực hiện hành động',
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `notifications` (`id`, `user_id`, `title`, `content`, `is_read`, `created_at`, `type`, `link`, `actor_id`) VALUES
(1, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 16:53:07', 'system', NULL, NULL),
(2, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 16:54:36', 'system', NULL, NULL),
(3, 1, '👋 Chào mừng!', 'Chào Admin VinhLong Hotel! Hệ thống thông báo đã được kích hoạt. Bạn sẽ nhận thông báo về đặt phòng, xác nhận và các cập nhật quan trọng.', 1, '2026-06-26 17:13:35', 'system', NULL, NULL),
(4, 2, '👋 Chào mừng!', 'Chào Nguyễn Văn Chủ! Hệ thống thông báo đã được kích hoạt. Bạn sẽ nhận thông báo về đặt phòng, xác nhận và các cập nhật quan trọng.', 1, '2026-06-26 17:13:35', 'system', NULL, NULL),
(5, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:15:03', 'system', NULL, NULL),
(6, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:15:09', 'system', NULL, NULL),
(7, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:20:57', 'system', NULL, NULL),
(8, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:24:51', 'system', NULL, NULL),
(9, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:25:58', 'system', NULL, NULL),
(10, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:26:19', 'system', NULL, NULL),
(11, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:27:06', 'system', NULL, NULL),
(12, 3, 'Xin chào, Thành Nguyễn!', '👋 Xin chào, Thành Nguyễn! Bạn đã đăng nhập bằng Google thành công.', 0, '2026-06-26 17:28:42', 'system', NULL, NULL),
(13, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:31:41', 'system', NULL, NULL),
(14, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:37:06', 'system', NULL, NULL),
(15, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 17:59:56', 'system', NULL, NULL),
(16, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:05:04', 'system', NULL, NULL),
(17, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:05:20', 'system', NULL, NULL),
(18, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:08:37', 'system', NULL, NULL),
(19, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:10:45', 'system', NULL, NULL),
(20, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:11:02', 'system', NULL, NULL),
(21, 1, '📋 Đặt phòng mới', 'Đặt phòng #1 tại Mekong Home vừa được tạo.', 0, '2026-06-26 18:22:33', 'new_booking', '/admin.html', NULL),
(22, 4, '📋 Đặt phòng thành công', 'Bạn đã đặt phòng tại Mekong Home. Check-in: 2026-06-27 — Check-out: 2026-06-28. Mã đặt phòng: #1.', 0, '2026-06-26 18:22:33', 'system', NULL, NULL),
(23, 1, '📋 Đặt phòng mới', 'Có đặt phòng mới #1 tại Mekong Home.', 0, '2026-06-26 18:22:33', 'system', NULL, NULL),
(24, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 1, '2026-06-26 18:22:59', 'system', NULL, NULL),
(25, 4, 'Xin chào, Thanh Phụng!', '👋 Xin chào, Thanh Phụng! Chào mừng bạn quay trở lại VinhLong Hotel.', 0, '2026-06-26 18:24:04', 'system', NULL, NULL),
(26, 2, '🔔 Có đặt phòng mới!', 'Khách hàng mới đặt phòng tại VinaEcolife Lodge. Check-in: 28/06/2026. Tổng: 1,130,000đ. Vui lòng xác nhận.', 1, '2026-06-26 18:24:31', 'new_booking', '/owner.html', NULL),
(27, 1, '📋 Đặt phòng mới', 'Đặt phòng #2 tại VinaEcolife Lodge vừa được tạo.', 0, '2026-06-26 18:24:31', 'new_booking', '/admin.html', NULL),
(28, 4, '📋 Đặt phòng thành công', 'Bạn đã đặt phòng tại VinaEcolife Lodge. Check-in: 2026-06-28 — Check-out: 2026-06-30. Mã đặt phòng: #2.', 0, '2026-06-26 18:24:31', 'system', NULL, NULL),
(29, 2, '🔔 Có đặt phòng mới', 'Khách hàng vừa đặt phòng tại VinaEcolife Lodge. Check-in: 2026-06-28. Mã #2. Vui lòng xác nhận.', 0, '2026-06-26 18:24:31', 'system', NULL, NULL),
(30, 1, '📋 Đặt phòng mới', 'Có đặt phòng mới #2 tại VinaEcolife Lodge.', 0, '2026-06-26 18:24:31', 'system', NULL, NULL),
(31, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 0, '2026-06-26 18:24:43', 'system', NULL, NULL),
(32, 4, '✅ Đặt phòng được xác nhận', 'Đặt phòng #2 tại VinaEcolife Lodge đã được xác nhận. Check-in: 28/06/2026.', 0, '2026-06-26 18:25:11', 'booking_confirmed', '/profile.html', NULL),
(33, 2, '✅ Xác nhận đặt phòng thành công', 'Đặt phòng #2 tại VinaEcolife Lodge - Trạng thái: Đã xác nhận', 1, '2026-06-26 18:25:11', 'booking_confirmed', '/owner.html', NULL),
(34, 4, '✅ Đặt phòng được xác nhận', 'Đặt phòng #2 đã được chủ khách sạn xác nhận. Hẹn gặp bạn!', 0, '2026-06-26 18:25:11', 'system', NULL, NULL),
(35, 2, 'Xin chào, Nguyễn Văn Chủ!', '👋 Xin chào, Nguyễn Văn Chủ! Chào mừng bạn quay trở lại VinhLong Hotel.', 0, '2026-06-26 18:29:04', 'system', NULL, NULL),
(36, 1, 'Xin chào, Admin VinhLong Hotel!', '👋 Xin chào, Admin VinhLong Hotel! Chào mừng bạn quay trở lại VinhLong Hotel.', 0, '2026-06-26 18:38:09', 'system', NULL, NULL),
(37, 4, 'Xin chào, Thanh Phụng!', '👋 Xin chào, Thanh Phụng! Chào mừng bạn quay trở lại VinhLong Hotel.', 0, '2026-06-26 18:47:46', 'system', NULL, NULL);

-- Table: admin_logs
DROP TABLE IF EXISTS `admin_logs`;
CREATE TABLE `admin_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `action` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: hotel_owners
DROP TABLE IF EXISTS `hotel_owners`;
CREATE TABLE `hotel_owners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `hotel_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_owner_hotel` (`owner_id`,`hotel_id`),
  KEY `idx_ho_owner` (`owner_id`),
  KEY `idx_ho_hotel` (`hotel_id`),
  CONSTRAINT `hotel_owners_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hotel_owners_ibfk_2` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hotel_owners` (`id`, `owner_id`, `hotel_id`, `assigned_at`) VALUES
(1, 2, 1, '2026-06-26 16:51:19'),
(2, 2, 2, '2026-06-26 16:51:19'),
(3, 2, 3, '2026-06-26 16:51:19');

-- Table: owner_verifications
DROP TABLE IF EXISTS `owner_verifications`;
CREATE TABLE `owner_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('register_owner','change_email') COLLATE utf8mb4_unicode_ci DEFAULT 'register_owner',
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ov_user` (`user_id`),
  KEY `idx_ov_email` (`email`),
  CONSTRAINT `owner_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hotel_posts
DROP TABLE IF EXISTS `hotel_posts`;
CREATE TABLE `hotel_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hotel_id` int NOT NULL,
  `owner_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('promotion','news','event','update') COLLATE utf8mb4_unicode_ci DEFAULT 'news',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hp_hotel` (`hotel_id`),
  KEY `idx_hp_owner` (`owner_id`),
  KEY `idx_hp_status` (`status`),
  CONSTRAINT `hotel_posts_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hotel_posts_ibfk_2` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_activity_log
DROP TABLE IF EXISTS `user_activity_log`;
CREATE TABLE `user_activity_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `session_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ual_user` (`user_id`),
  KEY `idx_ual_action` (`action`),
  KEY `idx_ual_time` (`created_at`),
  KEY `idx_ual_entity` (`entity_type`,`entity_id`),
  CONSTRAINT `user_activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_activity_log` (`id`, `user_id`, `session_id`, `action`, `entity_type`, `entity_id`, `meta`, `ip_address`, `created_at`) VALUES
(1, 2, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":null}', '::1', '2026-06-26 17:27:25'),
(2, 2, NULL, 'view_hotel', 'hotel', 52, '{"hotel_name":"Khách Sạn Bảo Châu","price":"380000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 17:27:52'),
(3, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 17:31:57'),
(4, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 17:35:51'),
(5, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 17:36:14'),
(6, 2, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":null}', '::1', '2026-06-26 18:00:09'),
(7, 2, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":null}', '::1', '2026-06-26 18:00:21'),
(8, 2, NULL, 'view_hotel', 'hotel', 38, '{"hotel_name":"Khách Sạn Tân Hoàng Gia","price":"550000.00","district":null}', '::1', '2026-06-26 18:00:23'),
(9, 2, NULL, 'view_hotel', 'hotel', 16, '{"hotel_name":"Khách Sạn Sài Gòn Vĩnh Long","price":"850000.00","district":null}', '::1', '2026-06-26 18:00:28'),
(10, 2, NULL, 'view_hotel', 'hotel', 4, '{"hotel_name":"Thusan House","price":"1802000.00","district":null}', '::1', '2026-06-26 18:01:05'),
(11, 2, NULL, 'add_favorite', 'hotel', 4, '{"hotel_name":"Thusan House","district":null,"price":"1802000.00"}', NULL, '2026-06-26 18:01:07'),
(12, 2, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":null}', '::1', '2026-06-26 18:01:12'),
(13, 2, NULL, 'add_favorite', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","district":null,"price":"565000.00"}', NULL, '2026-06-26 18:01:17'),
(14, 2, NULL, 'view_hotel', 'hotel', 49, '{"hotel_name":"Khách Sạn Hưng Thịnh","price":"570000.00","district":null}', '::1', '2026-06-26 18:01:27'),
(15, 1, NULL, 'view_hotel', 'hotel', 1, '{"hotel_name":"Bình Đại Hotel","price":"475639.00","district":null}', '::1', '2026-06-26 18:05:20'),
(16, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:08:51'),
(17, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:09:15'),
(18, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:09:48'),
(19, 1, NULL, 'view_hotel', 'hotel', 1, '{"hotel_name":"B�nh D?i Hotel TEST","price":"475639.00","district":"B�nh D?i"}', '::1', '2026-06-26 18:11:02'),
(20, 1, NULL, 'view_hotel', 'hotel', 64, '{"hotel_name":"Vinhomes Huỳnh Hotel","price":"780000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:13:45'),
(21, 1, NULL, 'view_hotel', 'hotel', 1, '{"hotel_name":"B�nh D?i Hotel TEST","price":"475639.00","district":"B�nh D?i"}', '::1', '2026-06-26 18:14:54'),
(22, 4, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:22:04'),
(23, 4, NULL, 'view_hotel', 'hotel', 6, '{"hotel_name":"Mekong Home","price":"1720000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:22:14'),
(24, 4, NULL, 'book', 'booking', 1, '{"hotel_id":6,"hotel_name":"Mekong Home","check_in":"2026-06-27","check_out":"2026-06-28","total_price":1720000,"nights":1}', NULL, '2026-06-26 18:22:33'),
(25, 4, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:24:16'),
(26, 4, NULL, 'book', 'booking', 2, '{"hotel_id":3,"hotel_name":"VinaEcolife Lodge","check_in":"2026-06-28","check_out":"2026-06-30","total_price":1130000,"nights":2}', NULL, '2026-06-26 18:24:31'),
(27, 2, NULL, 'view_hotel', 'hotel', 9, '{"hotel_name":"Ruby Hotel Vĩnh Long","price":"550000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:36:40'),
(28, 1, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:46:56'),
(29, 4, NULL, 'view_hotel', 'hotel', 3, '{"hotel_name":"VinaEcolife Lodge","price":"565000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:48:17'),
(30, 4, NULL, 'view_hotel', 'hotel', 6, '{"hotel_name":"Mekong Home","price":"1720000.00","district":"TP. Vĩnh Long"}', '::1', '2026-06-26 18:48:43'),
(31, 4, NULL, 'add_favorite', 'hotel', 6, '{"hotel_name":"Mekong Home","district":"TP. Vĩnh Long","price":"1720000.00"}', NULL, '2026-06-26 18:48:45');

-- Table: user_sessions
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL DEFAULT NULL,
  `page_count` int DEFAULT '0',
  `device` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_us_user` (`user_id`),
  KEY `idx_us_time` (`started_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TRIGGERS
DELIMITER ;;
DROP TRIGGER IF EXISTS `trg_new_booking`;;
CREATE TRIGGER `trg_new_booking`
  AFTER INSERT ON `bookings`
  FOR EACH ROW
  BEGIN
      -- Thông báo chủ KS có đặt phòng mới
      INSERT INTO notifications (user_id, title, content, type, link)
      SELECT ho.owner_id,
             '? Có đặt phòng mới!',
             CONCAT('Khách hàng mới đặt phòng tại ', h.name,
                    '. Check-in: ', DATE_FORMAT(NEW.check_in,'%d/%m/%Y'),
                    '. Tổng: ', FORMAT(NEW.total_price, 0), 'đ. Vui lòng xác nhận.'),
             'new_booking',
             '/owner.html'
      FROM hotel_owners ho
      JOIN hotels h ON h.id = ho.hotel_id
      WHERE ho.hotel_id = NEW.hotel_id;

      -- Thông báo admin
      INSERT INTO notifications (user_id, title, content, type, link)
      SELECT u.id,
             '? Đặt phòng mới',
             CONCAT('Đặt phòng #', NEW.id, ' tại ', h.name, ' vừa được tạo.'),
             'new_booking',
             '/admin.html'
      FROM users u, hotels h
      WHERE u.role = 'admin' AND h.id = NEW.hotel_id;
    END;;

DROP TRIGGER IF EXISTS `trg_booking_status_change`;;
CREATE TRIGGER `trg_booking_status_change`
  AFTER UPDATE ON `bookings`
  FOR EACH ROW
  BEGIN
      -- Chỉ xử lý khi status thực sự thay đổi
      IF NEW.status != OLD.status THEN

        -- Thông báo KHÁCH HÀNG
        IF NEW.status = 'confirmed' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 '✅ Đặt phòng được xác nhận',
                 CONCAT('Đặt phòng #', NEW.id, ' tại ', h.name, ' đã được xác nhận. Check-in: ', DATE_FORMAT(NEW.check_in,'%d/%m/%Y'), '.'),
                 'booking_confirmed',
                 CONCAT('/profile.html')
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        IF NEW.status = 'cancelled' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 '❌ Đặt phòng đã bị huỷ',
                 CONCAT('Đặt phòng #', NEW.id, ' tại ', h.name, ' đã bị huỷ.'),
                 'booking_cancelled',
                 CONCAT('/profile.html')
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        IF NEW.status = 'completed' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 '? Lưu trú hoàn thành',
                 CONCAT('Cảm ơn bạn đã lưu trú tại ', h.name, '. Hãy để lại đánh giá nhé!'),
                 'booking_completed',
                 CONCAT('/hotel-detail.html?id=', NEW.hotel_id)
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        -- Thông báo CHỦ KHÁCH SẠN khi có đặt phòng mới được confirm/cancel
        IF NEW.status IN ('confirmed','cancelled','completed') THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT ho.owner_id,
                 CASE NEW.status
                   WHEN 'confirmed' THEN '✅ Xác nhận đặt phòng thành công'
                   WHEN 'cancelled' THEN '❌ Đặt phòng bị huỷ'
                   ELSE '? Lưu trú hoàn thành'
                 END,
                 CONCAT('Đặt phòng #', NEW.id, ' tại ', h.name,
                        ' - Trạng thái: ',
                        CASE NEW.status WHEN 'confirmed' THEN 'Đã xác nhận'
                                        WHEN 'cancelled' THEN 'Đã huỷ'
                                        ELSE 'Hoàn thành' END),
                 CONCAT('booking_', NEW.status),
                 '/owner.html'
          FROM hotel_owners ho
          JOIN hotels h ON h.id = ho.hotel_id
          WHERE ho.hotel_id = NEW.hotel_id;
        END IF;

      END IF;
    END;;

DROP TRIGGER IF EXISTS `trg_hotel_approved`;;
CREATE TRIGGER `trg_hotel_approved`
  AFTER UPDATE ON `hotels`
  FOR EACH ROW
  BEGIN
      IF NEW.status = 'active' AND OLD.status = 'inactive' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT ho.owner_id,
               '? Khách sạn được duyệt!',
               CONCAT('Khách sạn "', NEW.name, '" đã được Admin phê duyệt và kích hoạt. Bạn có thể quản lý ngay!'),
               'hotel_approved',
               '/owner.html'
        FROM hotel_owners ho
        WHERE ho.hotel_id = NEW.id;
      END IF;

      -- KS bị tắt
      IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT ho.owner_id,
               '⚠️ Khách sạn bị tạm ngừng',
               CONCAT('Khách sạn "', NEW.name, '" đã bị Admin tạm ngừng hoạt động.'),
               'hotel_deactivated',
               '/owner.html'
        FROM hotel_owners ho
        WHERE ho.hotel_id = NEW.id;
      END IF;
    END;;

DROP TRIGGER IF EXISTS `trg_owner_verified`;;
CREATE TRIGGER `trg_owner_verified`
  AFTER UPDATE ON `users`
  FOR EACH ROW
  BEGIN
      IF NEW.role = 'owner' AND OLD.role != 'owner' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT u.id,
               '? Chủ KS mới đăng ký',
               CONCAT(NEW.full_name, ' (', NEW.email, ') vừa được xác thực là Chủ Khách Sạn. Vui lòng kiểm tra và duyệt.'),
               'owner_registered',
               '/admin.html'
        FROM users u WHERE u.role = 'admin';
      END IF;
    END;;

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ✅ Import xong! Tài khoản mặc định:
-- Admin : admin@vinhlong.com / Admin@123
-- Owner : owner@vinhlong.com / Owner@123