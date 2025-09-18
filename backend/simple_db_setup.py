#!/usr/bin/env python3
"""
Simple script to create missing database tables
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import get_db

def create_tables():
    """Create missing tables for tasks system"""

    print("Creating database tables...")

    try:
        db = get_db()
        print("Database connection established")

        # Create prioridades table
        print("Creating prioridades table...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `prioridades` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `codigo` varchar(20) NOT NULL,
          `nombre` varchar(50) NOT NULL,
          `descripcion` text DEFAULT NULL,
          `nivel_numerico` int(11) NOT NULL,
          `color` varchar(20) DEFAULT NULL,
          `icono` varchar(50) DEFAULT NULL,
          `es_activo` tinyint(1) DEFAULT 1,
          `orden_visualizacion` int(11) DEFAULT 0,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `codigo` (`codigo`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        # Insert priority data
        print("Inserting priority data...")
        db.execute_query("""
        INSERT IGNORE INTO `prioridades` (`id`, `codigo`, `nombre`, `descripcion`, `nivel_numerico`, `color`, `icono`, `es_activo`, `orden_visualizacion`) VALUES
        (1, 'urgente', 'Urgente', 'Prioridad urgente', 1, '#DC3545', 'alert-circle', 1, 1),
        (2, 'alta', 'Alta', 'Prioridad alta', 2, '#FD7E14', 'arrow-up-circle', 1, 2),
        (3, 'media', 'Media', 'Prioridad media', 3, '#FFC107', 'remove-circle', 1, 3),
        (4, 'baja', 'Baja', 'Prioridad baja', 4, '#28A745', 'arrow-down-circle', 1, 4)
        """)

        # Create estados_tarea table
        print("Creating estados_tarea table...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `estados_tarea` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `codigo` varchar(20) NOT NULL,
          `nombre` varchar(50) NOT NULL,
          `descripcion` text DEFAULT NULL,
          `color` varchar(20) DEFAULT NULL,
          `icono` varchar(50) DEFAULT NULL,
          `es_final` tinyint(1) DEFAULT 0,
          `es_activo` tinyint(1) DEFAULT 1,
          `orden_visualizacion` int(11) DEFAULT 0,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `codigo` (`codigo`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        # Insert task states
        print("Inserting task states...")
        db.execute_query("""
        INSERT IGNORE INTO `estados_tarea` (`id`, `codigo`, `nombre`, `descripcion`, `color`, `icono`, `es_final`, `es_activo`, `orden_visualizacion`) VALUES
        (1, 'pendiente', 'Pendiente', 'Tarea pendiente de iniciar', '#6C757D', 'clock', 0, 1, 1),
        (2, 'en_progreso', 'En Progreso', 'Tarea en desarrollo', '#007BFF', 'play-circle', 0, 1, 2),
        (3, 'en_revision', 'En Revision', 'Tarea esperando revision', '#FFC107', 'eye', 0, 1, 3),
        (4, 'completada', 'Completada', 'Tarea finalizada exitosamente', '#28A745', 'checkmark-circle', 1, 1, 4),
        (5, 'cancelada', 'Cancelada', 'Tarea cancelada', '#DC3545', 'close-circle', 1, 1, 5),
        (6, 'pausada', 'Pausada', 'Tarea temporalmente pausada', '#FD7E14', 'pause-circle', 0, 1, 6)
        """)

        # Create tareas_asignadas table
        print("Creating tareas_asignadas table...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `tareas_asignadas` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `titulo` varchar(200) NOT NULL,
          `descripcion` text DEFAULT NULL,
          `empresa_id` int(11) NOT NULL,
          `empleado_id` int(11) NOT NULL,
          `prioridad_id` int(11) NOT NULL,
          `estado_id` int(11) NOT NULL DEFAULT 1,
          `fecha_asignacion` timestamp NOT NULL DEFAULT current_timestamp(),
          `fecha_limite` datetime DEFAULT NULL,
          `fecha_inicio` datetime DEFAULT NULL,
          `fecha_completada` datetime DEFAULT NULL,
          `tiempo_estimado_horas` decimal(5,2) DEFAULT NULL,
          `tiempo_real_horas` decimal(5,2) DEFAULT NULL,
          `categoria` varchar(50) DEFAULT NULL,
          `ubicacion` varchar(200) DEFAULT NULL,
          `requiere_aprobacion` tinyint(1) DEFAULT 0,
          `aprobada_por` int(11) DEFAULT NULL,
          `fecha_aprobacion` datetime DEFAULT NULL,
          `notas_empresa` text DEFAULT NULL,
          `notas_empleado` text DEFAULT NULL,
          `adjuntos_url` text DEFAULT NULL,
          `es_recurrente` tinyint(1) DEFAULT 0,
          `frecuencia_dias` int(11) DEFAULT NULL,
          `proxima_tarea` datetime DEFAULT NULL,
          `asignada_por` int(11) NOT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `idx_empresa` (`empresa_id`),
          KEY `idx_empleado` (`empleado_id`),
          KEY `idx_estado` (`estado_id`),
          KEY `idx_prioridad` (`prioridad_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        # Create other tables
        print("Creating tareas_comentarios table...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `tareas_comentarios` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `tarea_id` int(11) NOT NULL,
          `user_id` int(11) NOT NULL,
          `comentario` text NOT NULL,
          `es_interno` tinyint(1) DEFAULT 0,
          `adjunto_url` varchar(500) DEFAULT NULL,
          `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `idx_tarea` (`tarea_id`),
          KEY `idx_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        print("Creating tareas_historial table...")
        db.execute_query("""
        CREATE TABLE IF NOT EXISTS `tareas_historial` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `tarea_id` int(11) NOT NULL,
          `estado_anterior_id` int(11) DEFAULT NULL,
          `estado_nuevo_id` int(11) NOT NULL,
          `user_id` int(11) NOT NULL,
          `motivo` text DEFAULT NULL,
          `fecha_cambio` timestamp NOT NULL DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          KEY `idx_tarea` (`tarea_id`),
          KEY `idx_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        """)

        # Verify tables exist
        print("Verifying tables...")
        tables = ['prioridades', 'estados_tarea', 'tareas_asignadas', 'tareas_comentarios', 'tareas_historial']

        for table in tables:
            result = db.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
            count = result['count'] if result else 0
            print(f"Table {table}: {count} records")

        print("All tables created successfully!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Database Setup Script")
    print("=" * 40)

    if create_tables():
        print("Setup completed successfully!")
    else:
        print("Setup failed!")
        sys.exit(1)