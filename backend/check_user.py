#!/usr/bin/env python3
"""
Script para verificar y crear usuarios en la base de datos
"""

import os
import sys
from dotenv import load_dotenv
import mysql.connector
import bcrypt

# Cargar variables de entorno
load_dotenv()

def create_test_user():
    """Crear un usuario de prueba con contraseña conocida"""
    
    # Conectar a la base de datos
    try:
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'mi_app_db'),
        }
        
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        print("🔍 VERIFICACIÓN Y CREACIÓN DE USUARIOS")
        print("=" * 50)
        
        # 1. Mostrar usuarios existentes
        print("\n1. 📋 Usuarios existentes:")
        cursor.execute("SELECT id, username, email, is_active, is_verified FROM users")
        users = cursor.fetchall()
        
        if users:
            for user in users:
                status = "✅ Activo" if user['is_active'] else "❌ Inactivo"
                verified = "✅ Verificado" if user['is_verified'] else "⚠️ No verificado"
                print(f"   ID: {user['id']} | {user['username']} | {user['email']} | {status} | {verified}")
        else:
            print("   ❌ No hay usuarios en la base de datos")
        
        # 2. Crear usuario de prueba
        print("\n2. 🛠️ Creando usuario de prueba...")
        
        # Datos del nuevo usuario
        username = "testuser"
        email = "test@aureum.com"
        password = "123456789"  # Contraseña simple para pruebas
        
        # Generar hash de la contraseña
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        try:
            # Verificar si ya existe
            cursor.execute("SELECT id FROM users WHERE email = %s OR username = %s", (email, username))
            existing = cursor.fetchone()
            
            if existing:
                print(f"   ⚠️ Usuario '{username}' ya existe, actualizando contraseña...")
                cursor.execute(
                    "UPDATE users SET password_hash = %s, is_active = TRUE WHERE username = %s OR email = %s",
                    (password_hash, username, email)
                )
            else:
                print(f"   ➕ Creando nuevo usuario '{username}'...")
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, is_verified)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (username, email, password_hash, "Test", "User", True, True))
            
            connection.commit()
            print("   ✅ Usuario de prueba creado/actualizado exitosamente!")
            
        except Exception as e:
            print(f"   ❌ Error creando usuario: {e}")
            connection.rollback()
        
        # 3. Mostrar credenciales finales
        print("\n3. 🔐 CREDENCIALES DE PRUEBA:")
        print("=" * 30)
        print(f"📧 Email: {email}")
        print(f"🔑 Contraseña: {password}")
        print(f"👤 Username: {username}")
        print("=" * 30)
        
        # 4. Verificar que la contraseña funciona
        print("\n4. 🧪 Verificando contraseña...")
        cursor.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
        result = cursor.fetchone()
        
        if result and bcrypt.checkpw(password.encode('utf-8'), result['password_hash'].encode('utf-8')):
            print("   ✅ Verificación de contraseña exitosa!")
        else:
            print("   ❌ Error en verificación de contraseña")
        
        # 5. Mostrar usuarios finales
        print("\n5. 📋 Usuarios finales en la base de datos:")
        cursor.execute("SELECT id, username, email, is_active, is_verified, created_at FROM users ORDER BY id")
        final_users = cursor.fetchall()
        
        for user in final_users:
            status = "✅" if user['is_active'] else "❌"
            verified = "✅" if user['is_verified'] else "⚠️"
            print(f"   {status} {user['username']} | {user['email']} | Creado: {user['created_at']}")
        
        cursor.close()
        connection.close()
        
        print("\n🎯 USA ESTAS CREDENCIALES EN LA APP:")
        print(f"   Email: {email}")
        print(f"   Contraseña: {password}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_test_user()