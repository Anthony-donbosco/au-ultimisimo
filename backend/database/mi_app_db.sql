-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 13, 2025 at 10:37 PM
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
-- Table structure for table `categorias_movimientos`
--

CREATE TABLE `categorias_movimientos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `tipo_movimiento_id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(50) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `es_predeterminada` tinyint(1) DEFAULT 0,
  `es_activa` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categorias_movimientos`
--

INSERT INTO `categorias_movimientos` (`id`, `user_id`, `empresa_id`, `tipo_movimiento_id`, `nombre`, `descripcion`, `icono`, `color`, `es_predeterminada`, `es_activa`, `orden_visualizacion`, `created_at`, `updated_at`) VALUES
(1, NULL, NULL, 1, 'Salario', 'Ingresos por trabajo dependiente', 'briefcase', '#28A745', 1, 1, 1, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(2, NULL, NULL, 1, 'Freelance', 'Trabajos independientes', 'laptop', '#17A2B8', 1, 1, 2, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(3, NULL, NULL, 1, 'Inversiones', 'Rendimientos de inversiones', 'trending-up', '#6F42C1', 1, 1, 3, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(4, NULL, NULL, 1, 'Ventas', 'Ingresos por ventas', 'storefront', '#FD7E14', 1, 1, 4, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(5, NULL, NULL, 1, 'Bonificaciones', 'Bonos y premios', 'gift', '#E83E8C', 1, 1, 5, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(6, NULL, NULL, 1, 'Otros Ingresos', 'Otros tipos de ingresos', 'add-circle', '#6C757D', 1, 1, 6, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(7, NULL, NULL, 2, 'Alimentación', 'Comida y bebidas', 'restaurant', '#FF6B6B', 1, 1, 1, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(8, NULL, NULL, 2, 'Transporte', 'Transporte y combustible', 'car', '#4ECDC4', 1, 1, 2, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(9, NULL, NULL, 2, 'Vivienda', 'Renta, servicios, mantenimiento', 'home', '#45B7D1', 1, 1, 3, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(10, NULL, NULL, 2, 'Salud', 'Medicina y atención médica', 'medical', '#96CEB4', 1, 1, 4, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(11, NULL, NULL, 2, 'Entretenimiento', 'Diversión y entretenimiento', 'game-controller', '#FFEAA7', 1, 1, 5, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(12, NULL, NULL, 2, 'Compras', 'Ropa y artículos personales', 'bag', '#DDA0DD', 1, 1, 6, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(13, NULL, NULL, 2, 'Educación', 'Cursos, libros, capacitación', 'school', '#74B9FF', 1, 1, 7, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(14, NULL, NULL, 2, 'Servicios', 'Internet, teléfono, suscripciones', 'wifi', '#A29BFE', 1, 1, 8, '2025-09-09 05:19:36', '2025-09-09 05:19:36'),
(15, NULL, NULL, 2, 'Otros Gastos', 'Otros tipos de gastos', 'ellipsis-horizontal', '#6C757D', 1, 1, 9, '2025-09-09 05:19:36', '2025-09-09 05:19:36');

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
(14, 'anthony.3719.donbosco@gmail.com', '203476', '2025-09-02 11:03:12', 1, '2025-09-02 16:58:31', '2025-09-02 16:58:12'),
(15, 'test2@example.com', '343013', '2025-09-09 04:38:41', 0, NULL, '2025-09-09 10:33:41');

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
-- Table structure for table `estados_aprobacion`
--

CREATE TABLE `estados_aprobacion` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `permite_edicion` tinyint(1) DEFAULT 0,
  `es_final` tinyint(1) DEFAULT 0,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `estados_aprobacion`
--

INSERT INTO `estados_aprobacion` (`id`, `codigo`, `nombre`, `descripcion`, `color`, `permite_edicion`, `es_final`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'pendiente', 'Pendiente', 'Esperando aprobación', '#FFA500', 1, 0, 1, 1, '2025-09-09 05:19:36'),
(2, 'aprobado', 'Aprobado', 'Aprobado para ejecución', '#28A745', 0, 1, 1, 2, '2025-09-09 05:19:36'),
(3, 'rechazado', 'Rechazado', 'Rechazado, no procede', '#DC3545', 1, 1, 1, 3, '2025-09-09 05:19:36'),
(4, 'en_revision', 'En Revisión', 'Bajo revisión adicional', '#17A2B8', 1, 0, 1, 4, '2025-09-09 05:19:36');

-- --------------------------------------------------------

--
-- Table structure for table `estados_gasto_planificado`
--

CREATE TABLE `estados_gasto_planificado` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `permite_ejecucion` tinyint(1) DEFAULT 0,
  `es_final` tinyint(1) DEFAULT 0,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `estados_gasto_planificado`
--

INSERT INTO `estados_gasto_planificado` (`id`, `codigo`, `nombre`, `descripcion`, `color`, `permite_ejecucion`, `es_final`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'pendiente', 'Pendiente', 'Gasto planificado sin ejecutar', '#6C757D', 1, 0, 1, 1, '2025-09-09 05:19:36'),
(2, 'ejecutado', 'Ejecutado', 'Gasto ya realizado', '#28A745', 0, 1, 1, 2, '2025-09-09 05:19:36'),
(3, 'cancelado', 'Cancelado', 'Gasto cancelado', '#DC3545', 0, 1, 1, 3, '2025-09-09 05:19:36'),
(4, 'vencido', 'Vencido', 'Gasto que pasó su fecha límite', '#FFC107', 1, 0, 1, 4, '2025-09-09 05:19:36'),
(5, 'pospuesto', 'Pospuesto', 'Gasto pospuesto a otra fecha', '#17A2B8', 1, 0, 1, 5, '2025-09-09 05:19:36');

-- --------------------------------------------------------

--
-- Table structure for table `facturas`
--

CREATE TABLE `facturas` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo_factura_id` int(11) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` varchar(20) DEFAULT 'Pendiente',
  `descripcion` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `ultimo_pago` date DEFAULT NULL,
  `es_recurrente` tinyint(1) DEFAULT 0,
  `frecuencia_dias` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `facturas`
--

INSERT INTO `facturas` (`id`, `user_id`, `empresa_id`, `nombre`, `tipo_factura_id`, `monto`, `fecha_vencimiento`, `estado`, `descripcion`, `logo_url`, `ultimo_pago`, `es_recurrente`, `frecuencia_dias`, `created_at`, `updated_at`) VALUES
(1, 10, NULL, 'Spotify', 8, 12.00, '2025-09-13', 'Pagada', 'ggs', '', '2025-09-13', 0, NULL, '2025-09-13 17:57:02', '2025-09-13 19:52:34'),
(2, 10, NULL, 'Pago de televisores', 8, 100.00, '2025-10-13', 'Pendiente', 'A ver que pepe', '', NULL, 0, NULL, '2025-09-13 17:59:05', '2025-09-13 19:52:34');

-- --------------------------------------------------------

--
-- Table structure for table `gastos`
--

CREATE TABLE `gastos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `tipo_pago_id` int(11) NOT NULL,
  `concepto` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha` date NOT NULL,
  `proveedor` varchar(100) DEFAULT NULL,
  `ubicacion` varchar(100) DEFAULT NULL,
  `numero_referencia` varchar(100) DEFAULT NULL,
  `es_deducible` tinyint(1) DEFAULT 0,
  `es_planificado` tinyint(1) DEFAULT 0,
  `gasto_planificado_id` int(11) DEFAULT NULL,
  `requiere_aprobacion` tinyint(1) DEFAULT 0,
  `aprobado_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `estado_aprobacion_id` int(11) NOT NULL,
  `notas` text DEFAULT NULL,
  `adjunto_url` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gastos`
--

INSERT INTO `gastos` (`id`, `user_id`, `empresa_id`, `categoria_id`, `tipo_pago_id`, `concepto`, `descripcion`, `monto`, `fecha`, `proveedor`, `ubicacion`, `numero_referencia`, `es_deducible`, `es_planificado`, `gasto_planificado_id`, `requiere_aprobacion`, `aprobado_por`, `fecha_aprobacion`, `estado_aprobacion_id`, `notas`, `adjunto_url`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 10, NULL, 7, 1, 'Comi una salchipapa', 'A las 12', 5.00, '2025-09-13', NULL, NULL, NULL, 0, 0, NULL, 0, NULL, NULL, 2, NULL, NULL, 10, '2025-09-13 06:33:09', '2025-09-13 06:33:09'),
(2, 10, NULL, 7, 1, 'ubu', '', 10.00, '2025-09-13', NULL, NULL, NULL, 0, 0, NULL, 0, NULL, NULL, 2, NULL, NULL, 10, '2025-09-13 07:58:20', '2025-09-13 07:58:20'),
(3, 10, NULL, 8, 1, 'sdfssdsfsds', NULL, 22.00, '2025-09-13', NULL, NULL, NULL, 0, 0, NULL, 0, NULL, NULL, 2, NULL, NULL, 10, '2025-09-13 08:11:40', '2025-09-13 08:11:40');

-- --------------------------------------------------------

--
-- Table structure for table `gastos_planificados`
--

CREATE TABLE `gastos_planificados` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `tipo_pago_id` int(11) DEFAULT NULL,
  `prioridad_id` int(11) NOT NULL,
  `estado_id` int(11) NOT NULL,
  `concepto` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `monto_estimado` decimal(12,2) NOT NULL,
  `fecha_planificada` date NOT NULL,
  `fecha_limite` date DEFAULT NULL,
  `es_recurrente` tinyint(1) DEFAULT 0,
  `frecuencia_dias` int(11) DEFAULT NULL,
  `proximo_gasto` date DEFAULT NULL,
  `fecha_fin_recurrencia` date DEFAULT NULL,
  `proveedor` varchar(100) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `notificar_dias_antes` int(11) DEFAULT 1,
  `ultima_notificacion` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gastos_planificados`
--

INSERT INTO `gastos_planificados` (`id`, `user_id`, `empresa_id`, `categoria_id`, `tipo_pago_id`, `prioridad_id`, `estado_id`, `concepto`, `descripcion`, `monto_estimado`, `fecha_planificada`, `fecha_limite`, `es_recurrente`, `frecuencia_dias`, `proximo_gasto`, `fecha_fin_recurrencia`, `proveedor`, `notas`, `notificar_dias_antes`, `ultima_notificacion`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 10, NULL, 9, 1, 1, 3, 'Me compre mi casita', 'cd', 300.00, '2025-09-17', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:29:14', '2025-09-13 07:47:19'),
(2, 10, NULL, 9, 1, 1, 3, 'Me compre mi casita', 'cd', 300.00, '2025-09-17', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:30:03', '2025-09-13 07:47:37'),
(3, 10, NULL, 13, 1, 1, 3, 'Yaaa weeeee', 'cscds', 100.00, '2025-09-27', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:46:54', '2025-09-13 07:49:21'),
(4, 10, NULL, 8, 1, 1, 3, 'Ya we porfavor', 'ggs', 123.00, '2025-09-26', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:52:47', '2025-09-13 07:54:04'),
(5, 10, NULL, 10, 1, 1, 3, 'cxxcxc', 'ds', 11.00, '2025-09-19', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:55:44', '2025-09-13 07:55:50'),
(6, 10, NULL, 7, 1, 1, 2, 'ubu', '', 10.00, '2025-09-25', NULL, 0, NULL, NULL, NULL, NULL, NULL, 1, NULL, 10, '2025-09-13 07:58:05', '2025-09-13 07:58:20');

-- --------------------------------------------------------

--
-- Table structure for table `ingresos`
--

CREATE TABLE `ingresos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `tipo_ingreso_id` int(11) NOT NULL,
  `concepto` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fuente` varchar(100) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha` date NOT NULL,
  `es_recurrente` tinyint(1) DEFAULT 0,
  `frecuencia_dias` int(11) DEFAULT NULL,
  `proximo_ingreso` date DEFAULT NULL,
  `numero_referencia` varchar(100) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `adjunto_url` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ingresos`
--

INSERT INTO `ingresos` (`id`, `user_id`, `empresa_id`, `categoria_id`, `tipo_ingreso_id`, `concepto`, `descripcion`, `fuente`, `monto`, `fecha`, `es_recurrente`, `frecuencia_dias`, `proximo_ingreso`, `numero_referencia`, `notas`, `adjunto_url`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 10, NULL, 1, 1, 'ME pagaron bro', NULL, 'Mi trabajo', 1000.00, '2025-09-13', 0, NULL, NULL, NULL, NULL, NULL, 10, '2025-09-13 14:24:02', '2025-09-13 14:24:02'),
(2, 10, NULL, 1, 1, 'prueba192929332', NULL, 'Elpanadero con El pan', 100.00, '2025-09-13', 0, NULL, NULL, NULL, NULL, NULL, 10, '2025-09-13 19:55:15', '2025-09-13 19:55:15');

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `leida` tinyint(1) DEFAULT 0,
  `fecha_envio` timestamp NOT NULL DEFAULT current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `objetivos`
--

CREATE TABLE `objetivos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `meta_total` decimal(12,2) NOT NULL,
  `ahorro_actual` decimal(12,2) DEFAULT 0.00,
  `fecha_limite` date DEFAULT NULL,
  `prioridad_id` int(11) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `es_activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `objetivos`
--

INSERT INTO `objetivos` (`id`, `user_id`, `empresa_id`, `nombre`, `descripcion`, `meta_total`, `ahorro_actual`, `fecha_limite`, `prioridad_id`, `categoria`, `es_activo`, `created_at`, `updated_at`) VALUES
(1, 10, NULL, 'NAVESOTA', 'Porfavor we', 14000.00, 1100.00, '2028-02-28', 2, 'Viaje', 1, '2025-09-13 15:04:40', '2025-09-13 17:39:05'),
(2, 10, NULL, 'Comprar laptop', 'Comprar una Asus tuf a16', 1800.00, 0.00, '2026-02-14', 2, 'Educación', 1, '2025-09-13 17:09:32', '2025-09-13 17:09:32');

-- --------------------------------------------------------

--
-- Table structure for table `objetivos_movimientos`
--

CREATE TABLE `objetivos_movimientos` (
  `id` int(11) NOT NULL,
  `objetivo_id` int(11) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `es_aporte` tinyint(1) DEFAULT 1,
  `descripcion` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `objetivos_movimientos`
--

INSERT INTO `objetivos_movimientos` (`id`, `objetivo_id`, `monto`, `es_aporte`, `descripcion`, `created_at`) VALUES
(1, 1, 100.00, 1, '', '2025-09-13 16:41:02'),
(2, 1, 1000.00, 1, '', '2025-09-13 17:39:05');

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
-- Table structure for table `presupuestos`
--

CREATE TABLE `presupuestos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `limite_mensual` decimal(12,2) NOT NULL,
  `mes` int(11) NOT NULL,
  `año` int(11) NOT NULL,
  `gastado_actual` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prioridades`
--

CREATE TABLE `prioridades` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `nivel_numerico` int(11) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `icono` varchar(50) DEFAULT NULL,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `prioridades`
--

INSERT INTO `prioridades` (`id`, `codigo`, `nombre`, `descripcion`, `nivel_numerico`, `color`, `icono`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'critica', 'Crítica', 'Requiere atención inmediata', 1, '#DC3545', 'alert-circle', 1, 1, '2025-09-09 05:19:36'),
(2, 'alta', 'Alta', 'Prioridad alta', 2, '#FD7E14', 'arrow-up-circle', 1, 2, '2025-09-09 05:19:36'),
(3, 'media', 'Media', 'Prioridad media', 3, '#FFC107', 'remove-circle', 1, 3, '2025-09-09 05:19:36'),
(4, 'baja', 'Baja', 'Prioridad baja', 4, '#28A745', 'arrow-down-circle', 1, 4, '2025-09-09 05:19:36');

-- --------------------------------------------------------

--
-- Table structure for table `rachas_usuario`
--

CREATE TABLE `rachas_usuario` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tipo_racha` varchar(20) NOT NULL,
  `racha_actual` int(11) DEFAULT 0,
  `mejor_racha` int(11) DEFAULT 0,
  `ultimo_registro` date DEFAULT NULL,
  `ultimo_logro` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rachas_usuario`
--

INSERT INTO `rachas_usuario` (`id`, `user_id`, `tipo_racha`, `racha_actual`, `mejor_racha`, `ultimo_registro`, `ultimo_logro`, `created_at`, `updated_at`) VALUES
(1, 10, 'registro', 1, 1, '2025-09-13', '2025-09-13', '2025-09-13 07:19:15', '2025-09-13 07:19:15'),
(2, 10, 'ahorro', 0, 0, '2025-09-13', NULL, '2025-09-13 07:19:15', '2025-09-13 15:02:30'),
(3, 10, 'objetivos', 0, 0, '2025-09-13', NULL, '2025-09-13 07:19:15', '2025-09-13 07:19:15'),
(4, 1, 'registro', 1, 1, '2025-09-13', '2025-09-13', '2025-09-13 19:20:20', '2025-09-13 19:20:20'),
(5, 1, 'ahorro', 0, 0, '2025-09-13', NULL, '2025-09-13 19:20:20', '2025-09-13 19:49:09'),
(6, 1, 'objetivos', 0, 0, '2025-09-13', NULL, '2025-09-13 19:20:20', '2025-09-13 19:49:09');

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
-- Table structure for table `tipos_factura`
--

CREATE TABLE `tipos_factura` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(50) DEFAULT 'document-text',
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipos_factura`
--

INSERT INTO `tipos_factura` (`id`, `nombre`, `descripcion`, `icono`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'Suscripción', 'Pagos recurrentes como Netflix, Spotify, etc.', 'card', 1, 1, '2025-09-13 18:23:53'),
(2, 'Servicios Públicos', 'Facturas de agua, luz, gas, etc.', 'flash', 1, 2, '2025-09-13 18:23:53'),
(3, 'Telefonía / Internet', 'Planes de celular, internet residencial.', 'wifi', 1, 3, '2025-09-13 18:23:53'),
(4, 'Alquiler / Hipoteca', 'Pago mensual de vivienda.', 'home', 1, 4, '2025-09-13 18:23:53'),
(5, 'Educación', 'Colegiaturas, cursos, etc.', 'school', 1, 5, '2025-09-13 18:23:53'),
(6, 'Salud', 'Seguro médico, consultas, farmacia.', 'medical', 1, 6, '2025-09-13 18:23:53'),
(7, 'Transporte', 'Mantenimiento de auto, transporte público.', 'car', 1, 7, '2025-09-13 18:23:53'),
(8, 'Otros', 'Cualquier otra factura no categorizada.', 'ellipsis-horizontal', 1, 99, '2025-09-13 18:23:53');

-- --------------------------------------------------------

--
-- Table structure for table `tipos_ingreso`
--

CREATE TABLE `tipos_ingreso` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `requiere_fuente` tinyint(1) DEFAULT 1,
  `es_recurrente_default` tinyint(1) DEFAULT 0,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipos_ingreso`
--

INSERT INTO `tipos_ingreso` (`id`, `codigo`, `nombre`, `descripcion`, `requiere_fuente`, `es_recurrente_default`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'salario', 'Salario', 'Ingreso por trabajo dependiente', 1, 1, 1, 1, '2025-09-09 05:19:36'),
(2, 'freelance', 'Freelance', 'Ingreso por trabajo independiente', 1, 0, 1, 2, '2025-09-09 05:19:36'),
(3, 'inversion', 'Inversión', 'Rendimientos de inversiones', 1, 0, 1, 3, '2025-09-09 05:19:36'),
(4, 'venta', 'Venta', 'Ingreso por venta de productos/servicios', 1, 0, 1, 4, '2025-09-09 05:19:36'),
(5, 'bonificacion', 'Bonificación', 'Bonos y bonificaciones', 1, 0, 1, 5, '2025-09-09 05:19:36'),
(6, 'regalo', 'Regalo', 'Dinero recibido como regalo', 0, 0, 1, 6, '2025-09-09 05:19:36'),
(7, 'reembolso', 'Reembolso', 'Devolución de dinero', 0, 0, 1, 7, '2025-09-09 05:19:36'),
(8, 'otro', 'Otro', 'Otros tipos de ingreso', 0, 0, 1, 8, '2025-09-09 05:19:36');

-- --------------------------------------------------------

--
-- Table structure for table `tipos_movimiento`
--

CREATE TABLE `tipos_movimiento` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipos_movimiento`
--

INSERT INTO `tipos_movimiento` (`id`, `codigo`, `nombre`, `descripcion`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'ingreso', 'Ingreso', 'Movimiento de entrada de dinero', 1, 1, '2025-09-09 05:19:36'),
(2, 'gasto', 'Gasto', 'Movimiento de salida de dinero', 1, 2, '2025-09-09 05:19:36'),
(3, 'ambos', 'Ambos', 'Categoría que aplica para ingresos y gastos', 1, 3, '2025-09-09 05:19:36');

-- --------------------------------------------------------

--
-- Table structure for table `tipos_pago`
--

CREATE TABLE `tipos_pago` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(50) DEFAULT NULL,
  `requiere_referencia` tinyint(1) DEFAULT 0,
  `es_digital` tinyint(1) DEFAULT 0,
  `es_activo` tinyint(1) DEFAULT 1,
  `orden_visualizacion` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipos_pago`
--

INSERT INTO `tipos_pago` (`id`, `codigo`, `nombre`, `descripcion`, `icono`, `requiere_referencia`, `es_digital`, `es_activo`, `orden_visualizacion`, `created_at`) VALUES
(1, 'efectivo', 'Efectivo', 'Pago en efectivo', 'cash', 0, 0, 1, 1, '2025-09-09 05:19:36'),
(2, 'tarjeta_debito', 'Tarjeta de Débito', 'Pago con tarjeta de débito', 'card', 1, 1, 1, 2, '2025-09-09 05:19:36'),
(3, 'tarjeta_credito', 'Tarjeta de Crédito', 'Pago con tarjeta de crédito', 'card-outline', 1, 1, 1, 3, '2025-09-09 05:19:36'),
(4, 'transferencia', 'Transferencia', 'Transferencia bancaria', 'swap-horizontal', 1, 1, 1, 4, '2025-09-09 05:19:36'),
(5, 'pago_movil', 'Pago Móvil', 'Pago móvil o digital', 'phone-portrait', 1, 1, 1, 5, '2025-09-09 05:19:36'),
(6, 'cheque', 'Cheque', 'Pago con cheque', 'document', 1, 0, 1, 6, '2025-09-09 05:19:36'),
(7, 'otro', 'Otro', 'Otro método de pago', 'ellipsis-horizontal', 0, 0, 1, 7, '2025-09-09 05:19:36');

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
(10, 'aureun', 'anthony.3719.donbosco@gmail.com', '$2b$12$iEkv71XIILmrErX9G.8aA.bQJrQedHZpRr16NVBAyBG4Y.oxh0B3y', 'Anthony', 'Ggs', 1, 1, '2025-09-02 16:58:31', '2025-09-13 20:18:57', '2025-09-13 20:18:57', NULL, NULL, '112313871072778612285', NULL, 4, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categorias_movimientos`
--
ALTER TABLE `categorias_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_tipo` (`user_id`,`tipo_movimiento_id`),
  ADD KEY `idx_empresa_tipo` (`empresa_id`,`tipo_movimiento_id`),
  ADD KEY `idx_tipo_movimiento` (`tipo_movimiento_id`),
  ADD KEY `idx_predeterminada` (`es_predeterminada`);

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
-- Indexes for table `estados_aprobacion`
--
ALTER TABLE `estados_aprobacion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `estados_gasto_planificado`
--
ALTER TABLE `estados_gasto_planificado`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `facturas`
--
ALTER TABLE `facturas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_vencimiento` (`user_id`,`fecha_vencimiento`),
  ADD KEY `idx_empresa_vencimiento` (`empresa_id`,`fecha_vencimiento`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `fk_facturas_tipo` (`tipo_factura_id`);

--
-- Indexes for table `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gasto_planificado_id` (`gasto_planificado_id`),
  ADD KEY `aprobado_por` (`aprobado_por`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_user_fecha` (`user_id`,`fecha`),
  ADD KEY `idx_empresa_fecha` (`empresa_id`,`fecha`),
  ADD KEY `idx_categoria` (`categoria_id`),
  ADD KEY `idx_tipo_pago` (`tipo_pago_id`),
  ADD KEY `idx_estado_aprobacion` (`estado_aprobacion_id`),
  ADD KEY `idx_proveedor` (`proveedor`),
  ADD KEY `idx_deducible` (`es_deducible`),
  ADD KEY `idx_monto` (`monto`);

--
-- Indexes for table `gastos_planificados`
--
ALTER TABLE `gastos_planificados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tipo_pago_id` (`tipo_pago_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_user_fecha` (`user_id`,`fecha_planificada`),
  ADD KEY `idx_empresa_fecha` (`empresa_id`,`fecha_planificada`),
  ADD KEY `idx_categoria` (`categoria_id`),
  ADD KEY `idx_estado` (`estado_id`),
  ADD KEY `idx_prioridad` (`prioridad_id`),
  ADD KEY `idx_fecha_limite` (`fecha_limite`);

--
-- Indexes for table `ingresos`
--
ALTER TABLE `ingresos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_user_fecha` (`user_id`,`fecha`),
  ADD KEY `idx_empresa_fecha` (`empresa_id`,`fecha`),
  ADD KEY `idx_categoria` (`categoria_id`),
  ADD KEY `idx_tipo_ingreso` (`tipo_ingreso_id`),
  ADD KEY `idx_fuente` (`fuente`),
  ADD KEY `idx_monto` (`monto`);

--
-- Indexes for table `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_leida` (`user_id`,`leida`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_fecha` (`fecha_envio`);

--
-- Indexes for table `objetivos`
--
ALTER TABLE `objetivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_activo` (`user_id`,`es_activo`),
  ADD KEY `idx_empresa_activo` (`empresa_id`,`es_activo`),
  ADD KEY `idx_prioridad` (`prioridad_id`),
  ADD KEY `idx_fecha_limite` (`fecha_limite`);

--
-- Indexes for table `objetivos_movimientos`
--
ALTER TABLE `objetivos_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_objetivo_fecha` (`objetivo_id`,`created_at`);

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
-- Indexes for table `presupuestos`
--
ALTER TABLE `presupuestos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_presupuesto_user` (`user_id`,`categoria_id`,`mes`,`año`),
  ADD UNIQUE KEY `unique_presupuesto_empresa` (`empresa_id`,`categoria_id`,`mes`,`año`),
  ADD KEY `idx_periodo` (`año`,`mes`),
  ADD KEY `idx_categoria` (`categoria_id`);

--
-- Indexes for table `prioridades`
--
ALTER TABLE `prioridades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `rachas_usuario`
--
ALTER TABLE `rachas_usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_racha` (`user_id`,`tipo_racha`),
  ADD KEY `idx_tipo_racha` (`tipo_racha`),
  ADD KEY `idx_usuario_tipo` (`user_id`,`tipo_racha`);

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
-- Indexes for table `tipos_factura`
--
ALTER TABLE `tipos_factura`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `tipos_ingreso`
--
ALTER TABLE `tipos_ingreso`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `tipos_pago`
--
ALTER TABLE `tipos_pago`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

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
-- AUTO_INCREMENT for table `categorias_movimientos`
--
ALTER TABLE `categorias_movimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `empleados_details`
--
ALTER TABLE `empleados_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `estados_aprobacion`
--
ALTER TABLE `estados_aprobacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `estados_gasto_planificado`
--
ALTER TABLE `estados_gasto_planificado`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `facturas`
--
ALTER TABLE `facturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `gastos`
--
ALTER TABLE `gastos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `gastos_planificados`
--
ALTER TABLE `gastos_planificados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `ingresos`
--
ALTER TABLE `ingresos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `objetivos`
--
ALTER TABLE `objetivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `objetivos_movimientos`
--
ALTER TABLE `objetivos_movimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `presupuestos`
--
ALTER TABLE `presupuestos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prioridades`
--
ALTER TABLE `prioridades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `rachas_usuario`
--
ALTER TABLE `rachas_usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `revoked_tokens`
--
ALTER TABLE `revoked_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tipos_factura`
--
ALTER TABLE `tipos_factura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tipos_ingreso`
--
ALTER TABLE `tipos_ingreso`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tipos_pago`
--
ALTER TABLE `tipos_pago`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `categorias_movimientos`
--
ALTER TABLE `categorias_movimientos`
  ADD CONSTRAINT `categorias_movimientos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `categorias_movimientos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `categorias_movimientos_ibfk_3` FOREIGN KEY (`tipo_movimiento_id`) REFERENCES `tipos_movimiento` (`id`);

--
-- Constraints for table `empleados_details`
--
ALTER TABLE `empleados_details`
  ADD CONSTRAINT `empleados_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `facturas`
--
ALTER TABLE `facturas`
  ADD CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `facturas_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_facturas_tipo` FOREIGN KEY (`tipo_factura_id`) REFERENCES `tipos_factura` (`id`);

--
-- Constraints for table `gastos`
--
ALTER TABLE `gastos`
  ADD CONSTRAINT `gastos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gastos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gastos_ibfk_3` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_movimientos` (`id`),
  ADD CONSTRAINT `gastos_ibfk_4` FOREIGN KEY (`tipo_pago_id`) REFERENCES `tipos_pago` (`id`),
  ADD CONSTRAINT `gastos_ibfk_5` FOREIGN KEY (`gasto_planificado_id`) REFERENCES `gastos_planificados` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `gastos_ibfk_6` FOREIGN KEY (`aprobado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `gastos_ibfk_7` FOREIGN KEY (`estado_aprobacion_id`) REFERENCES `estados_aprobacion` (`id`),
  ADD CONSTRAINT `gastos_ibfk_8` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `gastos_planificados`
--
ALTER TABLE `gastos_planificados`
  ADD CONSTRAINT `gastos_planificados_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gastos_planificados_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gastos_planificados_ibfk_3` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_movimientos` (`id`),
  ADD CONSTRAINT `gastos_planificados_ibfk_4` FOREIGN KEY (`tipo_pago_id`) REFERENCES `tipos_pago` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `gastos_planificados_ibfk_5` FOREIGN KEY (`prioridad_id`) REFERENCES `prioridades` (`id`),
  ADD CONSTRAINT `gastos_planificados_ibfk_6` FOREIGN KEY (`estado_id`) REFERENCES `estados_gasto_planificado` (`id`),
  ADD CONSTRAINT `gastos_planificados_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `ingresos`
--
ALTER TABLE `ingresos`
  ADD CONSTRAINT `ingresos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ingresos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ingresos_ibfk_3` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_movimientos` (`id`),
  ADD CONSTRAINT `ingresos_ibfk_4` FOREIGN KEY (`tipo_ingreso_id`) REFERENCES `tipos_ingreso` (`id`),
  ADD CONSTRAINT `ingresos_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `objetivos`
--
ALTER TABLE `objetivos`
  ADD CONSTRAINT `objetivos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `objetivos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `objetivos_ibfk_3` FOREIGN KEY (`prioridad_id`) REFERENCES `prioridades` (`id`);

--
-- Constraints for table `objetivos_movimientos`
--
ALTER TABLE `objetivos_movimientos`
  ADD CONSTRAINT `objetivos_movimientos_ibfk_1` FOREIGN KEY (`objetivo_id`) REFERENCES `objetivos` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `presupuestos`
--
ALTER TABLE `presupuestos`
  ADD CONSTRAINT `presupuestos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `presupuestos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `presupuestos_ibfk_3` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_movimientos` (`id`);

--
-- Constraints for table `rachas_usuario`
--
ALTER TABLE `rachas_usuario`
  ADD CONSTRAINT `rachas_usuario_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
