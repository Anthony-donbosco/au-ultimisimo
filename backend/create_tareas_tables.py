#!/usr/bin/env python3
"""
Script para crear las tablas de tareas asignadas
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import get_db

def create_tareas_tables():
    """Crea las tablas de tareas asignadas"""

    print("Creando tablas de tareas asignadas...")

    try:
        db = get_db()
        print("Conexion a la base de datos establecida")

        # Leer el archivo SQL
        sql_file_path = os.path.join(os.path.dirname(__file__), 'database', 'create_tareas_asignadas.sql')

        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()

        # Dividir en declaraciones individuales
        sql_statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--') and not stmt.strip().startswith('USE')]

        print(f"Ejecutando {len(sql_statements)} declaraciones SQL...")

        for i, statement in enumerate(sql_statements, 1):
            if statement:
                try:
                    print(f"Ejecutando declaracion {i}...")
                    db.execute_query(statement)
                    print(f"✓ Declaracion {i} ejecutada exitosamente")
                except Exception as e:
                    if "already exists" in str(e) or "Duplicate" in str(e):
                        print(f"⚠ Declaracion {i} - Elemento ya existe: {e}")
                    else:
                        print(f"✗ Error en declaracion {i}: {e}")

        # Verificar resultados
        print("Verificando tablas creadas...")

        # Verificar estados_tarea
        try:
            result = db.fetch_one("SELECT COUNT(*) as count FROM estados_tarea")
            count = result['count'] if result else 0
            print(f"Estados de tarea: {count}")
        except Exception as e:
            print(f"Error verificando estados_tarea: {e}")

        # Verificar tareas_asignadas
        try:
            result = db.fetch_one("SELECT COUNT(*) as count FROM tareas_asignadas")
            count = result['count'] if result else 0
            print(f"Tareas asignadas: {count}")
        except Exception as e:
            print(f"Error verificando tareas_asignadas: {e}")

        # Verificar tareas_comentarios
        try:
            result = db.fetch_one("SELECT COUNT(*) as count FROM tareas_comentarios")
            count = result['count'] if result else 0
            print(f"Comentarios de tareas: {count}")
        except Exception as e:
            print(f"Error verificando tareas_comentarios: {e}")

        # Verificar tareas_historial
        try:
            result = db.fetch_one("SELECT COUNT(*) as count FROM tareas_historial")
            count = result['count'] if result else 0
            print(f"Historial de tareas: {count}")
        except Exception as e:
            print(f"Error verificando tareas_historial: {e}")

        print("Tablas de tareas creadas exitosamente!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Script de Creacion de Tablas de Tareas")
    print("=" * 50)

    if create_tareas_tables():
        print("Setup completado exitosamente!")
    else:
        print("Setup fallo!")
        sys.exit(1)