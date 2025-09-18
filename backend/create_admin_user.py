#!/usr/bin/env python3
"""
Script para crear el usuario administrador AdminAURA
"""

import bcrypt
import sys
import os

# Añadir el directorio del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import db_manager

def hash_password(password: str) -> str:
    """Hashear contraseña usando bcrypt"""
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')

def create_admin_user():
    """Crear usuario administrador"""
    try:
        # Datos del admin
        username = "AdminAURA"
        email = "aureumxcreaj2025@gmail.com"
        password = "admin123"
        first_name = "aureum"
        last_name = "sistema"
        id_rol = 1  # Admin
        is_active = 1
        is_verified = 1

        # Hashear contraseña
        password_hash = hash_password(password)
        print(f"Password hash generado: {password_hash}")

        # Verificar si el usuario ya existe
        check_query = """
            SELECT id FROM users
            WHERE username = %s OR email = %s
        """
        existing_user = db_manager.fetch_one(check_query, (username, email))

        if existing_user:
            print(f"ERROR: El usuario ya existe con ID: {existing_user['id']}")
            return False

        # Crear el usuario
        insert_query = """
            INSERT INTO users (
                username, email, password_hash, first_name, last_name,
                id_rol, is_active, is_verified
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        params = (
            username, email, password_hash, first_name, last_name,
            id_rol, is_active, is_verified
        )

        user_id = db_manager.execute_query(insert_query, params)

        if user_id:
            print(f"EXITO: Usuario administrador creado con ID: {user_id}")
            print(f"Username: {username}")
            print(f"Email: {email}")
            print(f"Password: {password}")
            print(f"Rol ID: {id_rol} (Administrador)")
            return True
        else:
            print("ERROR: No se pudo crear el usuario")
            return False

    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Creando usuario administrador AdminAURA...")
    success = create_admin_user()

    if success:
        print("\nUsuario administrador creado exitosamente!")
        print("Ahora puedes hacer login con:")
        print("Username: AdminAURA")
        print("Password: admin123")
    else:
        print("\nNo se pudo crear el usuario administrador")