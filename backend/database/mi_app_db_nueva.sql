-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 09, 2025 at 02:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mi_app_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `email_verification_tokens`
--

CREATE TABLE `email_verification_tokens` (
  `id` int(11) NOT NULL,
  `user_email` varchar(100) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_verification_tokens`
--

INSERT INTO `email_verification_tokens` (`id`, `user_email`, `token`, `expires_at`, `used`, `used_at`, `created_at`) VALUES
(8, 'aureumxcreaj2025@gmail.com', '054594', '2025-09-02 09:10:35', 1, '2025-09-02 15:06:53', '2025-09-02 15:05:35'),
(9, 'test@example.com', '233461', '2025-09-02 09:29:00', 1, '2025-09-02 15:24:00', '2025-09-02 15:24:00'),
(10, 'uniquetest8418@example.com', '686173', '2025-09-02 09:29:52', 1, '2025-09-02 15:24:52', '2025-09-02 15:24:52'),
(11, 'fixedtest6206@example.com', '859551', '2025-09-02 09:31:57', 1, '2025-09-02 15:26:57', '2025-09-02 15:26:57'),
(12, 'landa032007@gmail.com', '747053', '2025-09-02 10:02:02', 0, NULL, '2025-09-02 15:57:02'),
(13, 'landa032007@gmail.comll', '313519', '2025-09-02 10:05:48', 0, NULL, '2025-09-02 16:00:48'),
(14, 'anthony.3719.donbosco@gmail.com', '203476', '2025-09-02 11:03:12', 1, '2025-09-02 16:58:31', '2025-09-02 16:58:12');

-- --------------------------------------------------------

--
-- Table structure for table `empleados_details`
--

CREATE TABLE `empleados_details` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `puesto` varchar(100) DEFAULT NULL,
  `sueldo` decimal(10,2) DEFAULT NULL,
  `fecha_contratacion` date DEFAULT curdate(),
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `revoked_tokens`
--

CREATE TABLE `revoked_tokens` (
  `id` int(11) NOT NULL,
  `jti` varchar(255) NOT NULL COMMENT 'JWT ID',
  `user_id` int(11) NOT NULL,
  `revoked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permisos`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `permisos`, `created_at`, `updated_at`) VALUES
(1, 'administrador', 'Administrador del sistema con acceso completo', NULL, '2025-09-07 03:37:28', '2025-09-07 03:37:28'),
(2, 'empresa', 'Cuenta de empresa que puede gestionar empleados y productos', NULL, '2025-09-07 03:37:28', '2025-09-07 03:37:28'),
(3, 'empleado', 'Empleado de una empresa con acceso limitado', NULL, '2025-09-07 03:37:28', '2025-09-07 03:37:28'),
(4, 'usuario', 'Usuario normal del sistema', NULL, '2025-09-07 03:37:28', '2025-09-07 03:37:28');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `google_id` varchar(100) DEFAULT NULL,
  `firebase_uid` varchar(128) DEFAULT NULL,
  `id_rol` int(11) NOT NULL DEFAULT 4,
  `created_by_empresa_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `is_active`, `is_verified`, `created_at`, `updated_at`, `last_login`, `phone_number`, `profile_picture`, `google_id`, `firebase_uid`, `id_rol`, `created_by_empresa_id`) VALUES
(1, 'admin', 'admin@ejemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 'Admin', 'User', 1, 1, '2025-08-26 16:09:55', '2025-08-26 16:09:55', NULL, NULL, NULL, NULL, NULL, 4, NULL),
(2, 'usuario_test', 'test@ejemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 'Usuario', 'Prueba', 1, 0, '2025-08-26 16:09:55', '2025-08-26 16:09:55', NULL, NULL, NULL, NULL, NULL, 4, NULL),
(3, 'testuser', 'test@aureum.com', '$2b$12$BSiBaL1UyOBupzo81P/0ZOldhQeQNibWhuWRm7mOvL9v6nbmCdoLe', 'Test', 'User', 1, 1, '2025-08-26 17:21:45', '2025-08-26 17:21:45', NULL, NULL, NULL, NULL, NULL, 4, NULL),
(4, 'davison', 'david@gmail.com', '$2b$12$lN.EAFM7BfzqHYR7cy3ldumVupIRhcDIQJEKQrb9Rr62Px5pskjOy', 'David', 'Sibrian', 1, 0, '2025-08-26 17:22:52', '2025-09-02 13:18:13', '2025-09-02 13:18:13', NULL, NULL, NULL, NULL, 4, NULL),
(5, 'JAJAJA', 'j9yq@gmail.com', '$2b$12$4HSx4b9u3MW95fs1d5vxZOIAxZU4gYXDI89UDcABZfgCo9VkRbNW6', 'JAJAJA', 'JAJAJA', 1, 0, '2025-08-26 20:18:33', '2025-08-26 20:19:39', '2025-08-26 20:19:39', NULL, NULL, NULL, NULL, 4, NULL),
(8, 'eliaa', 'eli@gmail.com', '$2b$12$ECV3u4sKXB9r7hiv9Cgdnu3Co4SJPcwrtXuukYAWPDWuwLRb4HtZa', 'Eli', 'Ramirez', 1, 0, '2025-08-27 11:14:35', '2025-08-27 11:14:35', NULL, NULL, NULL, NULL, NULL, 4, NULL),
(9, 'fixeduser6206', 'fixedtest6206@example.com', '$2b$12$OX6zURFMavSJ4dChrYm.xu8X6Zbuco6W1umXzl8i.d9BPi45LvKxO', 'Fixed', 'User', 1, 1, '2025-09-02 15:26:57', '2025-09-02 15:26:57', NULL, NULL, NULL, NULL, NULL, 4, NULL),
(10, 'aureun', 'anthony.3719.donbosco@gmail.com', '$2b$12$iEkv71XIILmrErX9G.8aA.bQJrQedHZpRr16NVBAyBG4Y.oxh0B3y', 'Anthony', 'Ggs', 1, 1, '2025-09-02 16:58:31', '2025-09-09 00:28:31', '2025-09-09 00:28:31', NULL, NULL, '112313871072778612285', NULL, 4, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_user_email` (`user_email`);

--
-- Indexes for table `empleados_details`
--
ALTER TABLE `empleados_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_puesto` (`puesto`),
  ADD KEY `idx_fecha_contratacion` (`fecha_contratacion`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `revoked_tokens`
--
ALTER TABLE `revoked_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `jti` (`jti`),
  ADD KEY `idx_jti` (`jti`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `uk_google_id` (`google_id`),
  ADD UNIQUE KEY `firebase_uid` (`firebase_uid`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_google_id` (`google_id`),
  ADD KEY `idx_firebase_uid` (`firebase_uid`),
  ADD KEY `idx_id_rol` (`id_rol`),
  ADD KEY `idx_created_by_empresa_id` (`created_by_empresa_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `empleados_details`
--
ALTER TABLE `empleados_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `revoked_tokens`
--
ALTER TABLE `revoked_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `empleados_details`
--
ALTER TABLE `empleados_details`
  ADD CONSTRAINT `empleados_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `revoked_tokens`
--
ALTER TABLE `revoked_tokens`
  ADD CONSTRAINT `revoked_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_created_by_empresa` FOREIGN KEY (`created_by_empresa_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_users_id_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
