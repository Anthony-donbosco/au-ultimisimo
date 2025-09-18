#!/usr/bin/env python3
"""
Script simple para probar la logica de aprobacion automatica de gastos
"""

import sys
import os
from datetime import date

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.empleado_service import EmpleadoService
from utils.database import get_db

def test_approval_logic():
    print("Probando logica de aprobacion automatica de gastos")
    print("=" * 60)

    # Inicializar servicio
    empleado_service = EmpleadoService()

    # Obtener un empleado de prueba
    db = get_db()
    empleado = db.fetch_one('SELECT * FROM users WHERE id_rol = 3 LIMIT 1')

    if not empleado:
        print("ERROR: No hay empleados en la base de datos para probar")
        return False

    empleado_id = empleado['id']
    print(f"Empleado de prueba: {empleado['username']} (ID: {empleado_id})")
    print(f"Empresa asociada: {empleado['created_by_empresa_id']}")
    print()

    # Caso 1: Gasto menor a $100 (deberia ser aprobado automaticamente)
    print("PRUEBA 1: Gasto menor a $100")
    print("Monto: $45.50")
    datos_gasto_1 = {
        'categoria_id': 7,  # Alimentacion
        'tipo_pago_id': 1,
        'concepto': 'Almuerzo de trabajo',
        'descripcion': 'Almuerzo con cliente potencial',
        'monto': 45.50,
        'fecha': str(date.today()),
        'proveedor': 'Restaurante ABC'
    }

    try:
        success, message, gasto_data = empleado_service.crear_gasto_con_aprobacion(
            empleado_id, datos_gasto_1
        )
        if success:
            print(f"EXITO: {message}")
            print(f"Estado: {gasto_data['estado']}")
            print(f"Requiere aprobacion: {gasto_data['requiereAprobacion']}")
        else:
            print(f"ERROR: {message}")
    except Exception as e:
        print(f"EXCEPCION: {e}")

    print("-" * 50)

    # Caso 2: Gasto mayor a $100 (deberia requerir aprobacion)
    print("PRUEBA 2: Gasto mayor a $100")
    print("Monto: $150.00")
    datos_gasto_2 = {
        'categoria_id': 14,  # Servicios
        'tipo_pago_id': 2,
        'concepto': 'Equipo de oficina',
        'descripcion': 'Impresora para el departamento',
        'monto': 150.00,
        'fecha': str(date.today()),
        'proveedor': 'Office Depot'
    }

    try:
        success, message, gasto_data = empleado_service.crear_gasto_con_aprobacion(
            empleado_id, datos_gasto_2
        )
        if success:
            print(f"EXITO: {message}")
            print(f"Estado: {gasto_data['estado']}")
            print(f"Requiere aprobacion: {gasto_data['requiereAprobacion']}")
        else:
            print(f"ERROR: {message}")
    except Exception as e:
        print(f"EXCEPCION: {e}")

    print("-" * 50)

    # Verificar en base de datos
    print("Verificando gastos en la base de datos:")
    gastos_recientes = db.fetch_all("""
        SELECT g.id, g.concepto, g.monto, g.requiere_aprobacion,
               ea.nombre as estado_aprobacion
        FROM gastos g
        LEFT JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
        WHERE g.created_by = %s
        ORDER BY g.created_at DESC
        LIMIT 3
    """, (empleado_id,))

    for gasto in gastos_recientes:
        print(f"- ID {gasto['id']}: {gasto['concepto']} (${gasto['monto']})")
        print(f"  Estado: {gasto['estado_aprobacion']}")
        print(f"  Requiere aprobacion: {gasto['requiere_aprobacion']}")
        print()

    return True

if __name__ == "__main__":
    try:
        test_approval_logic()
        print("Pruebas completadas!")
    except Exception as e:
        print(f"Error ejecutando pruebas: {e}")
        sys.exit(1)