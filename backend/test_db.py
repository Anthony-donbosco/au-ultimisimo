#!/usr/bin/env python3
"""
Script de diagnóstico para verificar la conexión a la base de datos
Ejecutar desde el directorio backend/
"""

import os
import sys
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Cargar variables de entorno
load_dotenv()

def test_database_connection():
    print("🔍 DIAGNÓSTICO DE CONEXIÓN A BASE DE DATOS")
    print("=" * 50)
    
    # 1. Verificar archivo .env
    print("\n1. ✅ Verificando archivo .env...")
    env_path = os.path.join(os.getcwd(), '.env')
    print(f"   Buscando .env en: {env_path}")
    
    if os.path.exists(env_path):
        print("   ✅ Archivo .env encontrado")
        try:
            # Intentar leer con diferentes codificaciones
            content = ""
            for encoding in ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']:
                try:
                    with open(env_path, 'r', encoding=encoding) as f:
                        content = f.read()
                        print(f"   ✅ Archivo .env leído correctamente (encoding: {encoding})")
                        break
                except UnicodeDecodeError:
                    continue
            
            if content:
                if 'DB_NAME' in content:
                    print("   ✅ Configuración DB encontrada en .env")
                else:
                    print("   ❌ No se encuentra DB_NAME en .env")
                
                # Mostrar contenido del .env (sin contraseñas)
                print("\n   📄 Contenido del .env:")
                lines = content.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if 'PASSWORD' in line.upper():
                            key = line.split('=')[0]
                            print(f"      {key}=***")
                        else:
                            print(f"      {line}")
            else:
                print("   ❌ No se pudo leer el archivo .env")
        except Exception as e:
            print(f"   ❌ Error leyendo .env: {e}")
    else:
        print("   ❌ Archivo .env NO encontrado")
        print("   💡 Crear archivo .env en el directorio backend/")
        print("\n   🔧 Contenido sugerido para .env:")
        print("      SECRET_KEY=desarrollo_aureum_secretkey_2024")
        print("      JWT_SECRET_KEY=jwt_aureum_token_desarrollo_clave")
        print("      DB_HOST=localhost")
        print("      DB_PORT=3306")
        print("      DB_USER=root")
        print("      DB_PASSWORD=")
        print("      DB_NAME=mi_app_db")
        return
    
    # 2. Mostrar configuración cargada por dotenv
    print("\n2. 📋 Variables cargadas por python-dotenv:")
    try:
        load_dotenv(env_path)
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'mi_app_db'),
        }
        
        for key, value in db_config.items():
            if key == 'password':
                print(f"   {key}: {'(vacía)' if value == '' else '(configurada)'}")
            else:
                print(f"   {key}: {value}")
    except Exception as e:
        print(f"   ❌ Error cargando variables: {e}")
        return
    
    # 3. Verificar que mysql-connector-python está instalado
    print("\n3. 📦 Verificando dependencias...")
    try:
        import mysql.connector
        print("   ✅ mysql-connector-python instalado")
    except ImportError as e:
        print("   ❌ mysql-connector-python NO instalado")
        print("   💡 Ejecutar: pip install mysql-connector-python")
        return
    # 4. Probar conexión sin base de datos específica
    print("\n4. 🔌 Probando conexión a MySQL...")
    try:
        test_config = db_config.copy()
        test_config.pop('database')  # Conectar sin especificar BD
        
        connection = mysql.connector.connect(**test_config)
        if connection.is_connected():
            print("   ✅ Conexión a MySQL exitosa")
            
            cursor = connection.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"   📊 Versión MySQL: {version[0]}")
            
            # 5. Listar bases de datos
            print("\n5. 📋 Bases de datos disponibles:")
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            
            db_names = [db[0] for db in databases]
            for db in db_names:
                if db == os.getenv('DB_NAME', 'mi_app_db'):
                    print(f"   ✅ {db} (¡ENCONTRADA!)")
                else:
                    print(f"   📁 {db}")
            
            # 6. Verificar si existe nuestra base de datos
            target_db = os.getenv('DB_NAME', 'mi_app_db')
            if target_db in db_names:
                print(f"\n6. ✅ Base de datos '{target_db}' existe")
                
                # Conectar específicamente a nuestra BD
                connection.close()
                connection = mysql.connector.connect(**db_config)
                cursor = connection.cursor()
                
                # Mostrar tablas
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"   📋 Tablas encontradas ({len(tables)}):")
                for table in tables:
                    print(f"      - {table[0]}")
                
                if not tables:
                    print("   ⚠️  Base de datos vacía - ejecutar schema.sql")
                
            else:
                print(f"\n6. ❌ Base de datos '{target_db}' NO existe")
                print("   💡 Ejecutar el script SQL para crearla")
            
            cursor.close()
            connection.close()
            
        else:
            print("   ❌ No se pudo conectar a MySQL")
            
    except Error as e:
        print(f"   ❌ Error de conexión: {e}")
        print(f"   🔧 Código de error: {e.errno}")
        
        if e.errno == 1045:
            print("   💡 Error de autenticación - verificar usuario/contraseña")
        elif e.errno == 2003:
            print("   💡 MySQL no está corriendo o puerto incorrecto")
        elif e.errno == 1049:
            print("   💡 Base de datos no existe")
    except Exception as e:
        print(f"   ❌ Error inesperado: {e}")
    
    # 7. Verificar servicios
    print("\n7. 🔧 Recomendaciones:")
    print("   - Verificar que MySQL/XAMPP esté corriendo")
    print("   - Comprobar que el puerto 3306 esté disponible")
    print("   - Ejecutar: netstat -an | findstr 3306 (para verificar puerto)")
    print("   - Si usas XAMPP, verificar el panel de control")

if __name__ == "__main__":
    test_database_connection()