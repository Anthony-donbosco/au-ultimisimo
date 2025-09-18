#!/usr/bin/env python3
"""
Script para crear la tabla de categorías de tareas
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import get_db

def create_categorias_tareas():
    """Crea la tabla de categorías de tareas"""

    print("Creando tabla de categorias de tareas...")

    try:
        db = get_db()
        print("Conexion a la base de datos establecida")

        # Crear tabla categorias_tareas
        print("Creando tabla categorias_tareas...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `categorias_tareas` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `codigo` varchar(20) NOT NULL,
          `nombre` varchar(50) NOT NULL,
          `descripcion` text DEFAULT NULL,
          `color` varchar(20) DEFAULT NULL,
          `icono` varchar(50) DEFAULT NULL,
          `es_activa` tinyint(1) DEFAULT 1,
          `orden_visualizacion` int(11) DEFAULT 0,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `codigo` (`codigo`),
          KEY `idx_activa` (`es_activa`),
          KEY `idx_orden` (`orden_visualizacion`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        # Insertar categorías predeterminadas
        print("Insertando categorias predeterminadas...")
        db.execute_query("""
        INSERT IGNORE INTO `categorias_tareas` (`id`, `codigo`, `nombre`, `descripcion`, `color`, `icono`, `es_activa`, `orden_visualizacion`) VALUES
        (1, 'desarrollo', 'Desarrollo', 'Tareas relacionadas con programacion y desarrollo de software', '#007BFF', 'code-slash', 1, 1),
        (2, 'diseno', 'Diseño', 'Tareas de diseño grafico, UI/UX y creatividad', '#6F42C1', 'brush', 1, 2),
        (3, 'marketing', 'Marketing', 'Campañas publicitarias, SEO, redes sociales', '#FD7E14', 'megaphone', 1, 3),
        (4, 'ventas', 'Ventas', 'Prospeccion, seguimiento de clientes, cierres', '#28A745', 'trending-up', 1, 4),
        (5, 'administracion', 'Administracion', 'Tareas administrativas, documentacion, procesos', '#6C757D', 'folder', 1, 5),
        (6, 'soporte', 'Soporte', 'Atencion al cliente, resolucion de problemas', '#DC3545', 'headset', 1, 6),
        (7, 'recursos_humanos', 'Recursos Humanos', 'Contratacion, capacitacion, evaluaciones', '#17A2B8', 'people', 1, 7),
        (8, 'finanzas', 'Finanzas', 'Contabilidad, presupuestos, reportes financieros', '#20C997', 'calculator', 1, 8),
        (9, 'operaciones', 'Operaciones', 'Logistica, produccion, cadena de suministro', '#FFC107', 'layers', 1, 9),
        (10, 'investigacion', 'Investigacion', 'Analisis de mercado, estudios, investigacion', '#E83E8C', 'search', 1, 10)
        """)

        # Agregar columna categoria_id a tareas_asignadas si no existe
        print("Actualizando tabla tareas_asignadas...")
        try:
            db.execute_query("ALTER TABLE `tareas_asignadas` ADD COLUMN `categoria_id` int(11) DEFAULT NULL AFTER `categoria`")
            print("Columna categoria_id agregada")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Columna categoria_id ya existe")
            else:
                print(f"Error agregando columna: {e}")

        try:
            db.execute_query("ALTER TABLE `tareas_asignadas` ADD KEY `idx_categoria` (`categoria_id`)")
            print("Indice para categoria_id agregado")
        except Exception as e:
            if "Duplicate key name" in str(e):
                print("Indice para categoria_id ya existe")
            else:
                print(f"Error agregando indice: {e}")

        # Verificar resultados
        print("Verificando categorias...")
        result = db.fetch_one("SELECT COUNT(*) as count FROM categorias_tareas WHERE es_activa = 1")
        count = result['count'] if result else 0
        print(f"Total de categorias activas: {count}")

        print("Tabla de categorias de tareas creada exitosamente!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Script de Creacion de Categorias de Tareas")
    print("=" * 50)

    if create_categorias_tareas():
        print("Setup completado exitosamente!")
    else:
        print("Setup fallo!")
        sys.exit(1)