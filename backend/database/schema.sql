-- Base de datos para sistema de autenticación
-- Compatible con phpMyAdmin/MySQL

-- Crear la base de datos (opcional, puede hacerse desde phpMyAdmin)
CREATE DATABASE IF NOT EXISTS mi_app_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE mi_app_db;

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB;

-- Insertar roles fijos
INSERT INTO roles (id, nombre, descripcion) VALUES 
(1, 'administrador', 'Administrador del sistema con acceso completo'),
(2, 'empresa', 'Cuenta de empresa que puede gestionar empleados y productos'),
(3, 'empleado', 'Empleado de una empresa con acceso limitado'),
(4, 'usuario', 'Usuario normal del sistema')
ON DUPLICATE KEY UPDATE 
nombre = VALUES(nombre), 
descripcion = VALUES(descripcion);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone_number VARCHAR(20),
    profile_picture VARCHAR(500),
    google_id VARCHAR(100),
    firebase_uid VARCHAR(128) UNIQUE,
    id_rol INT NOT NULL DEFAULT 4,
    created_by_empresa_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    FOREIGN KEY (created_by_empresa_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices para mejorar el rendimiento
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_active (is_active),
    INDEX idx_id_rol (id_rol),
    INDEX idx_created_by_empresa_id (created_by_empresa_id),
    
    -- Índice único para Google ID (si existe)
    UNIQUE KEY uk_google_id (google_id)
) ENGINE=InnoDB;

-- Tabla de detalles de empleados
CREATE TABLE IF NOT EXISTS empleados_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    puesto VARCHAR(100),
    sueldo DECIMAL(10,2),
    fecha_contratacion DATE DEFAULT (CURRENT_DATE),
    telefono VARCHAR(20),
    direccion TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_puesto (puesto),
    INDEX idx_fecha_contratacion (fecha_contratacion)
) ENGINE=InnoDB;

-- Tabla para tokens de verificación de email (modificada para registro)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_user_email (user_email)
) ENGINE=InnoDB;

-- Tabla para tokens de reseteo de contraseña (opcional)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- Tabla de sesiones/tokens JWT revocados (para logout seguro) - opcional
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    jti VARCHAR(255) NOT NULL UNIQUE COMMENT 'JWT ID',
    user_id INT NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_jti (jti),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Insertar algunos usuarios de prueba (contraseñas: "password123")
INSERT INTO users (username, email, password_hash, first_name, last_name, id_rol, is_verified) VALUES 
(
    'admin', 
    'admin@ejemplo.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 
    'Admin', 
    'Sistema',
    1,  -- administrador
    TRUE
),
(
    'empresa_test', 
    'empresa@ejemplo.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 
    'Empresa', 
    'Demo',
    2,  -- empresa
    TRUE
),
(
    'usuario_test', 
    'usuario@ejemplo.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 
    'Usuario', 
    'Prueba',
    4,  -- usuario
    TRUE
);

-- Crear un empleado de prueba (creado por empresa_test)
INSERT INTO users (username, email, password_hash, first_name, last_name, id_rol, created_by_empresa_id, is_verified) VALUES 
(
    'empleado_test',
    'empleado@ejemplo.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m',
    'Juan',
    'Empleado',
    3,  -- empleado
    2,  -- creado por empresa_test (ID=2)
    TRUE
);

-- Agregar detalles del empleado
INSERT INTO empleados_details (user_id, puesto, sueldo, telefono, direccion) VALUES 
(
    LAST_INSERT_ID(),
    'Vendedor',
    25000.00,
    '+1234567890',
    'Calle Falsa 123, Ciudad Ejemplo'
);

-- Mostrar información de las tablas creadas
SHOW TABLES;
DESCRIBE users;