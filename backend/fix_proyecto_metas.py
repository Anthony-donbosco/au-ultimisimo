#!/usr/bin/env python3
"""
Script para verificar y crear la tabla proyecto_metas si no existe
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import db_manager

def verificar_y_crear_tabla_metas():
    """Verificar si la tabla proyecto_metas existe y crearla si no existe"""
    try:
        # Verificar si la tabla existe
        check_table_query = """
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'proyecto_metas'
        """

        result = db_manager.fetch_one(check_table_query)

        if result and result['count'] > 0:
            print("La tabla proyecto_metas ya existe")

            # Verificar si tiene datos
            count_query = "SELECT COUNT(*) as count FROM proyecto_metas"
            count_result = db_manager.fetch_one(count_query)
            print(f"La tabla tiene {count_result['count']} registros")

        else:
            print("La tabla proyecto_metas no existe. Creandola...")

            # Crear la tabla
            create_table_query = """
            CREATE TABLE IF NOT EXISTS proyecto_metas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                proyecto_id INT NOT NULL,
                titulo VARCHAR(150) NOT NULL,
                descripcion TEXT,
                completado BOOLEAN DEFAULT FALSE,
                orden INT DEFAULT 0,
                fecha_limite DATE,
                fecha_completado DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_proyecto_meta (proyecto_id),
                INDEX idx_completado (completado),
                INDEX idx_orden (orden),

                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            )
            """

            db_manager.execute_query(create_table_query)
            print("Tabla proyecto_metas creada exitosamente")

        return True

    except Exception as e:
        print(f"Error verificando/creando tabla proyecto_metas: {e}")
        return False

if __name__ == "__main__":
    print("Verificando tabla proyecto_metas...")
    success = verificar_y_crear_tabla_metas()

    if success:
        print("Verificacion completada")
    else:
        print("Error en la verificacion")
        sys.exit(1)