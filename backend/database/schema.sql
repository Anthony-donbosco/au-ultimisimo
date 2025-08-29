-- Base de datos para sistema de autenticación
-- Compatible con phpMyAdmin/MySQL

-- Crear la base de datos (opcional, puede hacerse desde phpMyAdmin)
CREATE DATABASE IF NOT EXISTS mi_app_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE mi_app_db;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- Índices para mejorar el rendimiento
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Tabla para tokens de verificación de email (opcional)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
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
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified) VALUES 
(
    'admin', 
    'admin@ejemplo.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 
    'Admin', 
    'User',
    TRUE
),
(
    'usuario_test', 
    'test@ejemplo.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYRjILBFbZPkh8m', 
    'Usuario', 
    'Prueba',
    FALSE
);

-- Mostrar información de las tablas creadas
SHOW TABLES;
DESCRIBE users;