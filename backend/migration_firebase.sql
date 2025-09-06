-- Migración para agregar soporte Firebase a la tabla de usuarios
-- Ejecutar este script en tu base de datos MySQL

USE mi_app_db;

-- Agregar columna firebase_uid si no existe
ALTER TABLE users 
ADD COLUMN firebase_uid VARCHAR(128) UNIQUE NULL
AFTER google_id;

-- Agregar índice para firebase_uid para mejores consultas
ALTER TABLE users 
ADD INDEX idx_firebase_uid (firebase_uid);

-- Verificar la estructura actualizada
DESCRIBE users;

-- Mostrar usuarios existentes (opcional)
SELECT id, username, email, google_id, firebase_uid, is_active, is_verified, created_at
FROM users 
LIMIT 10;