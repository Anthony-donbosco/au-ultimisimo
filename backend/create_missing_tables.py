#!/usr/bin/env python3
"""
Script para crear las tablas faltantes en la base de datos
Ejecuta este script para asegurar que todas las tablas necesarias existan
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import get_db
from config import Config

def create_missing_tables():
    """Crea las tablas faltantes para el sistema de tareas"""

    print("Iniciando creacion de tablas faltantes...")

    try:
        # Obtener conexión a la base de datos
        db = get_db()
        print("Conexion a la base de datos establecida")

        # Leer el script SQL
        sql_file_path = os.path.join(os.path.dirname(__file__), 'database', 'create_complete_schema.sql')

        if not os.path.exists(sql_file_path):
            print(f"❌ No se encontró el archivo SQL: {sql_file_path}")
            return False

        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
            print("📄 Script SQL cargado exitosamente")

        # Dividir el contenido en statements individuales
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]

        # Ejecutar cada statement
        success_count = 0
        total_count = len(statements)

        for i, statement in enumerate(statements, 1):
            if statement.strip():
                try:
                    print(f"📝 Ejecutando statement {i}/{total_count}...")
                    result = db.execute(statement)

                    # Si es un SELECT, mostrar resultados
                    if statement.strip().upper().startswith('SELECT'):
                        if result:
                            for row in result:
                                print(f"   📊 {row}")

                    success_count += 1
                    print(f"   ✅ Statement {i} ejecutado exitosamente")

                except Exception as e:
                    # Algunos errores son esperables (tabla ya existe, etc.)
                    error_msg = str(e).lower()
                    if 'already exists' in error_msg or 'duplicate' in error_msg:
                        print(f"   ℹ️  Statement {i}: {e} (ignorado)")
                        success_count += 1
                    else:
                        print(f"   ❌ Error en statement {i}: {e}")

        print(f"\n🎯 Resumen: {success_count}/{total_count} statements ejecutados exitosamente")

        # Verificar que las tablas críticas existen
        print("\n🔍 Verificando tablas críticas...")
        critical_tables = ['prioridades', 'estados_tarea', 'tareas_asignadas']

        for table in critical_tables:
            try:
                result = db.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
                count = result['count'] if result else 0
                print(f"   ✅ Tabla '{table}': {count} registros")
            except Exception as e:
                print(f"   ❌ Tabla '{table}': Error - {e}")
                return False

        print("\n🎉 ¡Todas las tablas fueron creadas/verificadas exitosamente!")
        return True

    except Exception as e:
        print(f"❌ Error general: {e}")
        return False

def verify_tables():
    """Verifica que todas las tablas necesarias existan y tengan datos"""

    print("\n🔍 VERIFICANDO ESTADO DE LAS TABLAS...")

    try:
        db = get_db()

        # Tablas requeridas con sus verificaciones
        required_tables = {
            'prioridades': 'SELECT COUNT(*) as count FROM prioridades WHERE es_activo = 1',
            'estados_tarea': 'SELECT COUNT(*) as count FROM estados_tarea WHERE es_activo = 1',
            'tareas_asignadas': 'SELECT COUNT(*) as count FROM tareas_asignadas',
            'tareas_comentarios': 'SELECT COUNT(*) as count FROM tareas_comentarios',
            'tareas_historial': 'SELECT COUNT(*) as count FROM tareas_historial'
        }

        print("\n📊 ESTADO DE TABLAS:")
        print("-" * 50)

        all_ok = True
        for table, query in required_tables.items():
            try:
                result = db.fetch_one(query)
                count = result['count'] if result else 0
                status = "✅" if count >= 0 else "❌"
                print(f"{status} {table:20} : {count:5} registros")

                # Para prioridades y estados, verificar que tengan datos básicos
                if table in ['prioridades', 'estados_tarea'] and count == 0:
                    print(f"   ⚠️  ADVERTENCIA: La tabla {table} está vacía!")
                    all_ok = False

            except Exception as e:
                print(f"❌ {table:20} : Error - {e}")
                all_ok = False

        print("-" * 50)

        if all_ok:
            print("🎉 TODAS LAS TABLAS ESTÁN LISTAS!")
        else:
            print("⚠️  HAY PROBLEMAS CON ALGUNAS TABLAS")

        return all_ok

    except Exception as e:
        print(f"❌ Error verificando tablas: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 SCRIPT DE CREACIÓN DE TABLAS - SISTEMA DE TAREAS")
    print("=" * 60)

    # Crear tablas faltantes
    if create_missing_tables():
        # Verificar estado final
        verify_tables()
        print("\n✅ Script completado exitosamente!")
        sys.exit(0)
    else:
        print("\n❌ Script falló. Revisa los errores anteriores.")
        sys.exit(1)