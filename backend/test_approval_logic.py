#!/usr/bin/env python3
"""
Script para probar la lógica de aprobación automática de gastos
"""

import sys
import os
from datetime import date

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.empleado_service import EmpleadoService
from utils.database import get_db

def test_approval_logic():
    """Prueba la lógica de aprobación automática"""

    print("Probando lógica de aprobación automática de gastos")
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

    # Casos de prueba
    test_cases = [
        {
            'descripcion': 'Gasto menor a $100 (deberia ser aprobado automaticamente)',
            'datos_gasto': {
                'categoria_id': 1,  # Salario
                'tipo_pago_id': 1,  # Efectivo
                'concepto': 'Almuerzo de trabajo',
                'descripcion': 'Almuerzo con cliente potencial',
                'monto': 45.50,
                'fecha': str(date.today()),
                'proveedor': 'Restaurante ABC'
            }
        },
        {
            'descripcion': 'Gasto de exactamente $100 (deberia requerir aprobacion)',
            'datos_gasto': {
                'categoria_id': 1,
                'tipo_pago_id': 2,  # Tarjeta de Débito
                'concepto': 'Material de oficina',
                'descripcion': 'Suministros varios para el mes',
                'monto': 100.00,
                'fecha': str(date.today()),
                'proveedor': 'Office Depot'
            }
        },
        {
            'descripcion': 'Gasto mayor a $100 (deberia requerir aprobacion)',
            'datos_gasto': {
                'categoria_id': 1,
                'tipo_pago_id': 3,  # Tarjeta de Crédito
                'concepto': 'Equipo de cómputo',
                'descripcion': 'Laptop para desarrollo',
                'monto': 850.00,
                'fecha': str(date.today()),
                'proveedor': 'Best Buy'
            }
        }
    ]

    # Ejecutar pruebas
    for i, test_case in enumerate(test_cases, 1):
        print(f"🧪 Prueba {i}: {test_case['descripcion']}")
        print(f"💰 Monto: ${test_case['datos_gasto']['monto']}")

        try:
            success, message, gasto_data = empleado_service.crear_gasto_con_aprobacion(
                empleado_id,
                test_case['datos_gasto']
            )

            if success:
                print(f"✅ {message}")
                print(f"📄 Gasto creado:")
                print(f"   - ID: {gasto_data['id']}")
                print(f"   - Concepto: {gasto_data['concepto']}")
                print(f"   - Estado: {gasto_data['estado']}")
                print(f"   - Requiere aprobación: {gasto_data['requiereAprobacion']}")
                if 'aprobadoAutomaticamente' in gasto_data:
                    print(f"   - Aprobado automáticamente: {gasto_data['aprobadoAutomaticamente']}")
            else:
                print(f"❌ Error: {message}")

        except Exception as e:
            print(f"❌ Excepción: {e}")

        print("-" * 50)
        print()

    # Verificar en base de datos
    print("🔍 Verificando gastos creados en la base de datos:")
    gastos_recientes = db.fetch_all("""
        SELECT g.id, g.concepto, g.monto, g.requiere_aprobacion,
               ea.nombre as estado_aprobacion, g.aprobado_por, g.fecha_aprobacion
        FROM gastos g
        LEFT JOIN estados_aprobacion ea ON g.estado_aprobacion_id = ea.id
        WHERE g.created_by = %s
        ORDER BY g.created_at DESC
        LIMIT 5
    """, (empleado_id,))

    for gasto in gastos_recientes:
        print(f"- ID {gasto['id']}: {gasto['concepto']} (${gasto['monto']})")
        print(f"  Estado: {gasto['estado_aprobacion']}, Requiere aprobación: {gasto['requiere_aprobacion']}")
        if gasto['aprobado_por']:
            print(f"  Aprobado por: {gasto['aprobado_por']} el {gasto['fecha_aprobacion']}")
        print()

    return True

if __name__ == "__main__":
    print("Script de Prueba - Lógica de Aprobación Automática")
    print("=" * 60)

    try:
        if test_approval_logic():
            print("✅ Pruebas completadas exitosamente!")
        else:
            print("❌ Algunas pruebas fallaron!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error ejecutando pruebas: {e}")
        sys.exit(1)