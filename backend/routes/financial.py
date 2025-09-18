"""
API REST Controllers para el sistema financiero - Enterprise Level
¡Los endpoints más robustos que verás en tu vida! 🔥
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from typing import Dict, Any, List
from dataclasses import asdict


from services.financial_service import (
    categoria_service, ingreso_service, gasto_service, 
    objetivo_service, dashboard_service, factura_service,
    BusinessLogicError, InsufficientPermissionsError
)

from utils.auth import token_required
from utils.security import SecurityUtils
from models.financial_repository import ValidationError, DatabaseError

import os
import google.generativeai as genai

system_prompt = """
Eres "Aureumsito", un asistente virtual en desarrollo especializado en finanzas personales y economía. 

### Identidad:
- Cuando te pregunten "¿cómo te llamas?", responde: 
  "Me llamo Aureumsito, fui desarrollado por estudiantes del CDB y estoy aquí para ayudarte con cualquier duda sobre finanzas."
- Cuando te pregunten "¿qué modelo eres?" o "¿quién te desarrolló?", responde: 
  "Fui desarrollado por un grupo de visionarios estudiantes de DSW del DB. También necesitaron ayuda de otros modelos y de información recopilada para darte esta experiencia."
- Nunca menciones que fuiste entrenado por Google ni que eres un modelo de lenguaje grande.

### Reglas de operación:
- Tu propósito exclusivo es responder preguntas y dar consejos sobre:
  ahorro, inversión, presupuestos, economía, mercados financieros, chistes y conceptos financieros.  
- No puedes responder sobre otros temas (historia, ciencia, entretenimiento, etc.).  

### Manejo de temas fuera de alcance:
- Si un usuario te pregunta sobre un tema no permitido, debes rechazar amablemente y redirigir la conversación hacia las finanzas.  
  Ejemplo de respuesta:  
  "Lo siento, no fui entrenado con ese tipo de datos, mi especialidad son las finanzas. ¿Cómo puedo ayudarte con tus ahorros o inversiones hoy?"
"""


try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: La variable GEMINI_API_KEY no está en el archivo .env")
        model = None
    else:
        genai.configure(api_key=api_key)
        # Aquí pasamos las instrucciones al modelo
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=system_prompt
        )
        print("INFO: 🤖 Modelo de Gemini configurado con personalidad de experto financiero.")
except Exception as e:
    model = None
    print(f"ERROR: No se pudo configurar el modelo de Gemini: {e}")

def get_current_user_id(current_user=None):
    """Extract user ID from JWT token payload"""
    if current_user and 'user_id' in current_user:
        logger.info(f"✅ Using authenticated user ID: {current_user['user_id']}")
        return current_user['user_id']
    else:
        # Fallback for endpoints without authentication
        logger.info("⚠️ Using fallback user ID: 10 (test user)")
        return 10  # Test user ID from database


logger = logging.getLogger(__name__)

# Crear Blueprint
financial_bp = Blueprint('financial', __name__, url_prefix='/api/v1/financial')


def handle_errors(f):
    """Decorator para manejo centralizado de errores"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except BusinessLogicError as e:
            logger.warning(f"Business logic error: {e}")
            return jsonify({
                'success': False,
                'error': 'BUSINESS_LOGIC_ERROR',
                'message': str(e)
            }), 400
        except InsufficientPermissionsError as e:
            logger.warning(f"Permission error: {e}")
            return jsonify({
                'success': False,
                'error': 'INSUFFICIENT_PERMISSIONS',
                'message': 'You do not have permission to perform this action'
            }), 403
        except ValidationError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({
                'success': False,
                'error': 'VALIDATION_ERROR',
                'message': str(e)
            }), 400
        except DatabaseError as e:
            logger.error(f"Database error: {e}")
            return jsonify({
                'success': False,
                'error': 'DATABASE_ERROR',
                'message': 'A database error occurred'
            }), 500
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred'
            }), 500
    return decorated_function


def validate_decimal(value: Any, field_name: str) -> Decimal:
    """Valida y convierte a Decimal"""
    try:
        decimal_value = Decimal(str(value))
        if decimal_value < 0:
            raise ValidationError(f"{field_name} cannot be negative")
        return decimal_value
    except (InvalidOperation, TypeError):
        raise ValidationError(f"{field_name} must be a valid number")


def validate_date(value: str, field_name: str) -> date:
    """Valida y convierte fecha"""
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be in YYYY-MM-DD format")


# ============================================================================
# ENDPOINTS DE CATEGORÍAS
# ============================================================================

@financial_bp.route('/categories/<tipo_movimiento>', methods=['GET'])
@token_required  # Re-enabled for production
# @rate_limit(limit=100, per=60)  # 100 requests per minute
@handle_errors
def get_categorias(current_user, tipo_movimiento: str):
    """Obtiene categorías por tipo de movimiento"""
    user_id = get_current_user_id(current_user)
    
    # Validar tipo de movimiento
    if tipo_movimiento not in ['ingreso', 'gasto']:
        return jsonify({
            'success': False,
            'error': 'INVALID_TYPE',
            'message': 'Type must be "ingreso" or "gasto"'
        }), 400
    
    categorias = categoria_service.get_categorias_por_tipo(user_id, tipo_movimiento)
    
    return jsonify({
        'success': True,
        'data': {
            'tipo_movimiento': tipo_movimiento,
            'categorias': [categoria.to_dict() for categoria in categorias]
        }
    })


@financial_bp.route('/categories', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_todas_categorias(current_user):
    """Obtiene todas las categorías del usuario"""
    user_id = get_current_user_id(current_user)
    
    categorias = categoria_service.get_todas_las_categorias(user_id)
    
    return jsonify({
        'success': True,
        'data': categorias
    })


@financial_bp.route('/categories', methods=['POST'])
@token_required
# @rate_limit(limit=20, per=60)  # Máximo 20 categorías nuevas por minuto
@handle_errors
def crear_categoria(current_user):
    """Crea una nueva categoría personalizada"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['tipo_movimiento_id', 'nombre']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'error': 'MISSING_FIELD',
                'message': f'Field "{field}" is required'
            }), 400
    
    # Sanitizar entrada
    data['nombre'] = SecurityUtils.sanitize_input(data['nombre'])
    if data.get('descripcion'):
        data['descripcion'] = SecurityUtils.sanitize_input(data['descripcion'])
    
    categoria = categoria_service.crear_categoria_personalizada(user_id, data)
    
    return jsonify({
        'success': True,
        'data': categoria.to_dict(),
        'message': 'Category created successfully'
    }), 201


# ============================================================================
# ENDPOINTS DE INGRESOS
# ============================================================================

@financial_bp.route('/income', methods=['GET'])
@token_required
# @rate_limit(limit=100, per=60)
@handle_errors
def get_ingresos(current_user):
    """Obtiene ingresos del usuario"""
    user_id = get_current_user_id(current_user)
    # Support both 'period' and 'periodo' parameter names
    periodo = request.args.get('period') or request.args.get('periodo', 'current_month')
    
    # Map English period names to Spanish ones
    period_mapping = {
        'current_month': 'mes_actual',
        'previous_month': 'mes_anterior', 
        'current_year': 'año_actual',
        'current_week': 'semana_actual',
        'today': 'hoy',
        # Also support original Spanish names
        'mes_actual': 'mes_actual',
        'mes_anterior': 'mes_anterior',
        'año_actual': 'año_actual', 
        'semana_actual': 'semana_actual',
        'hoy': 'hoy'
    }
    
    # Convert to internal format
    periodo_interno = period_mapping.get(periodo, 'mes_actual')
    
    # Validate internal period
    periodos_validos = ['hoy', 'semana_actual', 'mes_actual', 'mes_anterior', 'año_actual']
    if periodo_interno not in periodos_validos:
        return jsonify({
            'success': False,
            'error': 'INVALID_PERIOD',
            'message': f'Period must be one of: {list(period_mapping.keys())}'
        }), 400
    
    ingresos = ingreso_service.get_ingresos_por_periodo(user_id, periodo_interno)
    
    return jsonify({
        'success': True,
        'data': {
            'items': [ingreso.to_dict() for ingreso in ingresos],
            'pagination': {
                'total': len(ingresos),
                'page': int(request.args.get('page', 1)),
                'limit': int(request.args.get('limit', 20)),
                'has_more': False  # For now, we don't implement pagination
            },
            'periodo': periodo
        }
    })


@financial_bp.route('/income/summary', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_resumen_ingresos(current_user):
    """Obtiene resumen de ingresos"""
    user_id = get_current_user_id(current_user)
    
    # Mapeo de parámetros de período (inglés -> español)
    period_mapping = {
        'current_month': 'mes_actual',
        'last_month': 'mes_anterior',
        'current_year': 'año_actual',
        'last_year': 'año_anterior',
        'current_week': 'semana_actual',
        'last_week': 'semana_anterior'
    }
    
    # Obtener período y mapear si es necesario
    periodo = request.args.get('period') or request.args.get('periodo', 'mes_actual')
    periodo_interno = period_mapping.get(periodo, periodo)
    
    resumen = ingreso_service.get_resumen_ingresos(user_id, periodo_interno)
    
    return jsonify({
        'success': True,
        'data': resumen
    })


@financial_bp.route('/income', methods=['POST'])
@token_required
# @rate_limit(limit=30, per=60)  # Máximo 30 ingresos por minuto
@handle_errors
def crear_ingreso(current_user):
    """Crea un nuevo ingreso"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['categoria_id', 'tipo_ingreso_id', 'concepto', 'fuente', 'monto', 'fecha']
    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({
                'success': False,
                'error': 'MISSING_FIELD',
                'message': f'Field "{field}" is required'
            }), 400
    
    # Validar y sanitizar datos
    data['concepto'] = SecurityUtils.sanitize_input(data['concepto'])
    data['fuente'] = SecurityUtils.sanitize_input(data['fuente'])
    if data.get('descripcion'):
        data['descripcion'] = SecurityUtils.sanitize_input(data['descripcion'])
    
    # Validar monto
    validate_decimal(data['monto'], 'monto')
    
    # Validar fecha
    validate_date(data['fecha'], 'fecha')
    
    # Validar campos de recurrencia
    if data.get('es_recurrente') and not data.get('frecuencia_dias'):
        return jsonify({
            'success': False,
            'error': 'MISSING_FREQUENCY',
            'message': 'frecuencia_dias is required for recurring income'
        }), 400
    
    ingreso = ingreso_service.crear_ingreso(user_id, data)
    
    return jsonify({
        'success': True,
        'data': ingreso.to_dict(),
        'message': 'Income created successfully'
    }), 201


@financial_bp.route('/income/<int:ingreso_id>', methods=['DELETE'])
@token_required
# @rate_limit(limit=20, per=60)
@handle_errors
def eliminar_ingreso(current_user, ingreso_id: int):
    """Elimina un ingreso del usuario"""
    user_id = get_current_user_id(current_user)

    try:
        # Verificar que el ingreso pertenece al usuario
        ingreso = ingreso_service.get_ingreso_by_id(ingreso_id, user_id)
        if not ingreso:
            return jsonify({
                'success': False,
                'error': 'NOT_FOUND',
                'message': 'Ingreso no encontrado o no pertenece al usuario'
            }), 404

        # Eliminar el ingreso
        success = ingreso_service.eliminar_ingreso(ingreso_id, user_id)

        if success:
            logger.info(f"✅ Ingreso {ingreso_id} eliminado por usuario {user_id}")
            return jsonify({
                'success': True,
                'message': 'Ingreso eliminado exitosamente'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'DELETE_FAILED',
                'message': 'No se pudo eliminar el ingreso'
            }), 500

    except Exception as e:
        logger.error(f"Error eliminando ingreso {ingreso_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500


# ============================================================================
# ENDPOINTS DE GASTOS
# ============================================================================

@financial_bp.route('/expenses', methods=['GET'])
@token_required  # Re-enabled for production
# @rate_limit(limit=100, per=60)
@handle_errors
def get_gastos(current_user):
    """Obtiene gastos del usuario"""
    user_id = get_current_user_id(current_user)
    periodo = request.args.get('periodo', 'mes_actual')
    
    gastos = gasto_service.get_gastos_por_periodo(user_id, periodo)
    
    return jsonify({
        'success': True,
        'data': {
            'periodo': periodo,
            'gastos': [gasto.to_dict() for gasto in gastos],
            'total': len(gastos)
        }
    })


@financial_bp.route('/expenses/by-category', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_gastos_por_categoria(current_user):
    """Obtiene resumen de gastos por categoría"""
    user_id = get_current_user_id(current_user)
    periodo = request.args.get('periodo', 'mes_actual')
    
    resumen = gasto_service.get_resumen_gastos_por_categoria(user_id, periodo)
    
    return jsonify({
        'success': True,
        'data': {
            'periodo': periodo,
            'categorias': resumen
        }
    })


@financial_bp.route('/expenses', methods=['POST'])
@token_required  # Re-enabled for production
# @rate_limit(limit=30, per=60)
@handle_errors
def crear_gasto(current_user):
    """Crea un nuevo gasto"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['categoria_id', 'tipo_pago_id', 'concepto', 'monto', 'fecha']
    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({
                'success': False,
                'error': 'MISSING_FIELD',
                'message': f'Field "{field}" is required'
            }), 400
    
    # Validar y sanitizar datos
    data['concepto'] = SecurityUtils.sanitize_input(data['concepto'])
    if data.get('descripcion'):
        data['descripcion'] = SecurityUtils.sanitize_input(data['descripcion'])
    if data.get('proveedor'):
        data['proveedor'] = SecurityUtils.sanitize_input(data['proveedor'])
    
    # Validar monto
    validate_decimal(data['monto'], 'monto')
    
    # Validar fecha
    validate_date(data['fecha'], 'fecha')
    
    gasto = gasto_service.crear_gasto(user_id, data)
    
    return jsonify({
        'success': True,
        'data': gasto.to_dict(),
        'message': 'Expense created successfully'
    }), 201


@financial_bp.route('/expenses/<int:gasto_id>', methods=['DELETE'])
@token_required
# @rate_limit(limit=20, per=60)
@handle_errors
def eliminar_gasto(current_user, gasto_id: int):
    """Elimina un gasto del usuario"""
    user_id = get_current_user_id(current_user)

    try:
        # Verificar que el gasto pertenece al usuario
        gasto = gasto_service.get_gasto_by_id(gasto_id, user_id)
        if not gasto:
            return jsonify({
                'success': False,
                'error': 'NOT_FOUND',
                'message': 'Gasto no encontrado o no pertenece al usuario'
            }), 404

        # Eliminar el gasto
        success = gasto_service.eliminar_gasto(gasto_id, user_id)

        if success:
            logger.info(f"✅ Gasto {gasto_id} eliminado por usuario {user_id}")
            return jsonify({
                'success': True,
                'message': 'Gasto eliminado exitosamente'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'DELETE_FAILED',
                'message': 'No se pudo eliminar el gasto'
            }), 500

    except Exception as e:
        logger.error(f"Error eliminando gasto {gasto_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500


# ============================================================================
# ENDPOINTS DE GASTOS PLANIFICADOS
# ============================================================================

@financial_bp.route('/expenses/planned', methods=['GET'])
@token_required
@handle_errors
def get_planned_expenses(current_user):
    """Obtiene todos los gastos planificados del usuario"""
    current_user_id = current_user['user_id']

    gastos_planificados = gasto_service.get_gastos_planificados(current_user_id)

    return jsonify({
        'success': True,
        'data': [asdict(gasto) for gasto in gastos_planificados]
    })


@financial_bp.route('/expenses/planned', methods=['POST'])
@token_required
@handle_errors
def create_planned_expense(current_user):
    """Crea un nuevo gasto planificado"""
    current_user_id = current_user['user_id']
    data = request.get_json()

    required_fields = ['concepto', 'categoria_id', 'monto', 'fecha']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'message': f'Campo requerido: {field}'}), 400

    try:
        gasto_planificado = gasto_service.crear_gasto_planificado(current_user_id, data)
        return jsonify({
            'success': True,
            'message': 'Gasto planificado creado exitosamente',
            'data': asdict(gasto_planificado)
        }), 201
    except Exception as e:
        logger.error(f"Error creating planned expense: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400


@financial_bp.route('/expenses/planned/<int:gasto_id>/execute', methods=['POST'])
@token_required
@handle_errors
def execute_planned_expense(current_user, gasto_id):
    """Ejecuta un gasto planificado convirtiéndolo en gasto real"""
    current_user_id = current_user['user_id']

    try:
        gasto_real = gasto_service.ejecutar_gasto_planificado(current_user_id, gasto_id)
        return jsonify({
            'success': True,
            'message': 'Gasto planificado ejecutado exitosamente',
            'data': asdict(gasto_real)
        })
    except Exception as e:
        logger.error(f"Error executing planned expense: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400


@financial_bp.route('/expenses/planned/<int:gasto_id>/cancel', methods=['POST'])
@token_required
@handle_errors
def cancel_planned_expense(current_user, gasto_id):
    """Cancela un gasto planificado"""
    current_user_id = current_user['user_id']

    try:
        success = gasto_service.cancelar_gasto_planificado(current_user_id, gasto_id)
        if success:
            return jsonify({
                'success': True,
                'message': 'Gasto planificado cancelado exitosamente'
            })
        else:
            return jsonify({'success': False, 'message': 'No se pudo cancelar el gasto planificado'}), 400
    except Exception as e:
        logger.error(f"Error cancelling planned expense: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400


# ============================================================================
# ENDPOINTS DE OBJETIVOS
# ============================================================================

@financial_bp.route('/goals', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_objetivos(current_user):
    """Obtiene objetivos del usuario"""
    user_id = get_current_user_id(current_user)
    
    objetivos = objetivo_service.get_objetivos_usuario(user_id)
    
    return jsonify({
        'success': True,
        'data': {
            'objetivos': [objetivo.to_dict() for objetivo in objetivos],
            'total': len(objetivos)
        }
    })


@financial_bp.route('/goals/summary', methods=['GET'])
@token_required
# @rate_limit(limit=30, per=60)
@handle_errors
def get_resumen_objetivos(current_user):
    """Obtiene resumen de objetivos"""
    user_id = get_current_user_id(current_user)
    
    resumen = objetivo_service.get_resumen_objetivos(user_id)
    
    return jsonify({
        'success': True,
        'data': resumen
    })


@financial_bp.route('/goals', methods=['POST'])
@token_required
# @rate_limit(limit=10, per=60)  # Máximo 10 objetivos por minuto
@handle_errors
def crear_objetivo(current_user):
    """Crea un nuevo objetivo"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['nombre', 'meta_total', 'prioridad_id']
    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({
                'success': False,
                'error': 'MISSING_FIELD',
                'message': f'Field "{field}" is required'
            }), 400
    
    # Validar y sanitizar datos
    data['nombre'] = SecurityUtils.sanitize_input(data['nombre'])
    if data.get('descripcion'):
        data['descripcion'] = SecurityUtils.sanitize_input(data['descripcion'])
    
    # Validar meta_total
    validate_decimal(data['meta_total'], 'meta_total')
    
    # Validar fecha_limite si existe
    if data.get('fecha_limite'):
        validate_date(data['fecha_limite'], 'fecha_limite')
    
    objetivo = objetivo_service.crear_objetivo(user_id, data)
    
    return jsonify({
        'success': True,
        'data': objetivo.to_dict(),
        'message': 'Goal created successfully'
    }), 201


@financial_bp.route('/goals/<int:objetivo_id>', methods=['DELETE'])
@token_required
# @rate_limit(limit=20, per=60)
@handle_errors
def eliminar_objetivo(current_user, objetivo_id: int):
    """Elimina un objetivo del usuario"""
    user_id = get_current_user_id(current_user)

    try:
        # Verificar que el objetivo pertenece al usuario
        objetivo = objetivo_service.get_objetivo_by_id(objetivo_id, user_id)
        if not objetivo:
            return jsonify({
                'success': False,
                'error': 'NOT_FOUND',
                'message': 'Objetivo no encontrado o no pertenece al usuario'
            }), 404

        # Eliminar el objetivo
        success = objetivo_service.eliminar_objetivo(objetivo_id, user_id)

        if success:
            logger.info(f"✅ Objetivo {objetivo_id} eliminado por usuario {user_id}")
            return jsonify({
                'success': True,
                'message': 'Objetivo eliminado exitosamente'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'DELETE_FAILED',
                'message': 'No se pudo eliminar el objetivo'
            }), 500

    except Exception as e:
        logger.error(f"Error eliminando objetivo {objetivo_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500


@financial_bp.route('/goals/<int:objetivo_id>/add-money', methods=['POST'])
@token_required
# @rate_limit(limit=20, per=60)
@handle_errors
def agregar_dinero_objetivo(current_user, objetivo_id: int):
    """Agrega dinero a un objetivo"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    if 'monto' not in data:
        return jsonify({
            'success': False,
            'error': 'MISSING_FIELD',
            'message': 'Field "monto" is required'
        }), 400
    
    monto = validate_decimal(data['monto'], 'monto')
    descripcion = SecurityUtils.sanitize_input(data.get('descripcion', ''))
    
    objetivo = objetivo_service.agregar_dinero_objetivo(user_id, objetivo_id, monto, descripcion)
    
    return jsonify({
        'success': True,
        'data': objetivo.to_dict(),
        'message': 'Money added to goal successfully'
    })


@financial_bp.route('/goals/<int:objetivo_id>/withdraw-money', methods=['POST'])
@token_required
# @rate_limit(limit=10, per=60)
@handle_errors
def retirar_dinero_objetivo(current_user, objetivo_id: int):
    """Retira dinero de un objetivo"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()

    if 'monto' not in data:
        return jsonify({
            'success': False,
            'error': 'MISSING_FIELD',
            'message': 'Field "monto" is required'
        }), 400

    monto = validate_decimal(data['monto'], 'monto')
    descripcion = SecurityUtils.sanitize_input(data.get('descripcion', ''))

    objetivo = objetivo_service.retirar_dinero_objetivo(user_id, objetivo_id, monto, descripcion)

    return jsonify({
        'success': True,
        'data': objetivo.to_dict(),
        'message': 'Money withdrawn from goal successfully'
    })


@financial_bp.route('/goals/<int:objetivo_id>/movements', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_historial_movimientos_objetivo(current_user, objetivo_id: int):
    """Obtiene el historial de movimientos de un objetivo"""
    user_id = get_current_user_id(current_user)

    historial = objetivo_service.get_historial_movimientos_objetivo(user_id, objetivo_id)

    return jsonify({
        'success': True,
        'data': {
            'objetivo_id': objetivo_id,
            'movimientos': historial,
            'total_movimientos': len(historial)
        }
    })


# ============================================================================
# ENDPOINTS DE FACTURAS
# ============================================================================

@financial_bp.route('/bills', methods=['GET'])
@token_required
# @rate_limit(limit=100, per=60)
@handle_errors
def get_facturas(current_user):
    """Obtiene facturas del usuario"""
    user_id = get_current_user_id(current_user)
    filtro_estado = request.args.get('estado', 'all')
    
    facturas = factura_service.get_facturas(user_id, filtro_estado)
    
    return jsonify({
        'success': True,
        'data': {
            'facturas': [factura.to_dict() for factura in facturas],
            'total': len(facturas)
        }
    })


@financial_bp.route('/bills', methods=['POST'])
@token_required
# @rate_limit(limit=10, per=60)
@handle_errors
def crear_factura(current_user):
    """Crea una nueva factura"""
    user_id = get_current_user_id(current_user)
    data = request.get_json()
    
    # Validar datos requeridos (cambiamos 'tipo' por 'tipo_factura_id')
    required_fields = ['nombre', 'tipo_factura_id', 'monto', 'fechaVencimiento']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'error': 'MISSING_FIELD',
                'message': f'Field "{field}" is required'
            }), 400
    
    # ... (el resto de la validación se queda igual) ...
    
    # Sanitizar inputs
    data['nombre'] = SecurityUtils.sanitize_input(data['nombre'])
    if 'descripcion' in data:
        data['descripcion'] = SecurityUtils.sanitize_input(data['descripcion'])
    
    factura = factura_service.crear_factura(user_id, data)
    
    return jsonify({
        'success': True,
        'data': factura.to_dict(),
        'message': 'Bill created successfully'
    }), 201


@financial_bp.route('/bills/<int:factura_id>', methods=['DELETE'])
@token_required
# @rate_limit(limit=20, per=60)
@handle_errors
def eliminar_factura(current_user, factura_id: int):
    """Elimina una factura del usuario"""
    user_id = get_current_user_id(current_user)

    try:
        # Verificar que la factura pertenece al usuario
        factura = factura_service.get_factura_by_id(factura_id, user_id)
        if not factura:
            return jsonify({
                'success': False,
                'error': 'NOT_FOUND',
                'message': 'Factura no encontrada o no pertenece al usuario'
            }), 404

        # Eliminar la factura
        success = factura_service.eliminar_factura(factura_id, user_id)

        if success:
            logger.info(f"✅ Factura {factura_id} eliminada por usuario {user_id}")
            return jsonify({
                'success': True,
                'message': 'Factura eliminada exitosamente'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'DELETE_FAILED',
                'message': 'No se pudo eliminar la factura'
            }), 500

    except Exception as e:
        logger.error(f"Error eliminando factura {factura_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500


@financial_bp.route('/bills/<int:factura_id>/mark-paid', methods=['POST'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def marcar_factura_pagada(current_user, factura_id: int):
    """Marca una factura como pagada"""
    user_id = get_current_user_id(current_user)
    
    success = factura_service.marcar_como_pagada(user_id, factura_id)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Bill marked as paid successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'UPDATE_FAILED',
            'message': 'Failed to mark bill as paid'
        }), 500


@financial_bp.route('/bills/summary', methods=['GET'])
@token_required
# @rate_limit(limit=100, per=60)
@handle_errors
def get_resumen_facturas(current_user):
    """Obtiene resumen de facturas del usuario"""
    user_id = get_current_user_id(current_user)
    
    resumen = factura_service.get_resumen_facturas(user_id)
    
    return jsonify({
        'success': True,
        'data': resumen
    })


# ============================================================================
# ENDPOINT DE DASHBOARD
# ============================================================================

@financial_bp.route('/test', methods=['GET'])
def test_financial_endpoint():
    """Endpoint de prueba para verificar conectividad"""
    return jsonify({
        'success': True,
        'message': 'Financial API funcionando correctamente',
        'timestamp': datetime.now().isoformat()
    })

@financial_bp.route('/bills/types', methods=['GET'])
@token_required
# @rate_limit(limit=100, per=60)
@handle_errors
def get_bill_types(current_user):
    """Obtiene todos los tipos de factura disponibles"""
    try:
        tipos = factura_service.get_tipos_factura()

        return jsonify({
            'success': True,
            'tipos_factura': [
                {
                    'id': tipo.id,
                    'nombre': tipo.nombre,
                    'icono': tipo.icono
                }
                for tipo in tipos
            ]
        })

    except Exception as e:
        logger.error(f"Error getting bill types: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500

@financial_bp.route('/bills/statuses', methods=['GET'])
@token_required
# @rate_limit(limit=100, per=60)
@handle_errors
def get_bill_statuses(current_user):
    """Obtiene todos los estados de factura disponibles"""
    try:
        estados = factura_service.get_estados_factura()

        return jsonify({
            'success': True,
            'estados_factura': [
                {
                    'id': estado.id,
                    'nombre': estado.nombre,
                    'color': estado.color,
                    'icono': estado.icono,
                    'orden': estado.orden
                }
                for estado in estados
            ]
        })

    except Exception as e:
        logger.error(f"Error getting bill statuses: {e}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': 'Error interno del servidor'
        }), 500

@financial_bp.route('/debug/bills', methods=['GET'])
def debug_facturas():
    """Endpoint de debug para verificar datos de facturas"""
    try:
        user_id = 1  # Admin user ID
        logger.info(f"🔍 Debug: Buscando facturas para user_id: {user_id}")

        # Probar conexión directa al repositorio
        facturas = factura_service.get_facturas(user_id, 'all')
        logger.info(f"🔍 Debug: Encontradas {len(facturas)} facturas")

        # También obtener resumen
        resumen = factura_service.get_resumen_facturas(user_id)
        logger.info(f"🔍 Debug: Resumen: {resumen}")

        return jsonify({
            'success': True,
            'debug_info': {
                'user_id': user_id,
                'facturas_count': len(facturas),
                'facturas': [factura.to_dict() for factura in facturas],
                'resumen': resumen
            }
        })
    except Exception as e:
        logger.error(f"❌ Error en debug facturas: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'debug_info': {
                'user_id': user_id,
                'error_type': type(e).__name__
            }
        })

@financial_bp.route('/debug/database', methods=['GET'])
def debug_database():
    """Endpoint de debug para verificar datos en las tablas"""
    try:
        from utils.database import db_manager

        debug_info = {}

        # Verificar tabla usuarios
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()

            # Usuarios
            cursor.execute("SELECT id, username, email FROM users LIMIT 5")
            users = cursor.fetchall()
            debug_info['users'] = users

            # Tipos de factura
            cursor.execute("SELECT * FROM tipos_factura LIMIT 10")
            tipos_factura = cursor.fetchall()
            debug_info['tipos_factura'] = tipos_factura

            # Facturas totales
            cursor.execute("SELECT COUNT(*) as total FROM facturas")
            total_facturas = cursor.fetchone()
            debug_info['total_facturas'] = total_facturas[0] if total_facturas else 0

            # Facturas por usuario
            cursor.execute("SELECT user_id, COUNT(*) as count FROM facturas GROUP BY user_id")
            facturas_por_usuario = cursor.fetchall()
            debug_info['facturas_por_usuario'] = facturas_por_usuario

            # Algunas facturas de ejemplo
            cursor.execute("""
                SELECT f.id, f.user_id, f.nombre, f.monto, f.estado, f.tipo_factura_id,
                       tf.nombre as tipo_nombre
                FROM facturas f
                LEFT JOIN tipos_factura tf ON f.tipo_factura_id = tf.id
                LIMIT 5
            """)
            facturas_ejemplo = cursor.fetchall()
            debug_info['facturas_ejemplo'] = facturas_ejemplo

        return jsonify({
            'success': True,
            'debug_info': debug_info
        })
    except Exception as e:
        logger.error(f"❌ Error en debug database: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@financial_bp.route('/debug/objectives', methods=['GET'])
def debug_objectives():
    """Endpoint de debug para verificar datos de objetivos"""
    try:
        user_id = 10  # Test user ID
        logger.info(f"🔍 Debug: Buscando objetivos para user_id: {user_id}")

        # Probar conexión directa al repositorio
        objetivos = objetivo_service.get_objetivos_usuario(user_id)
        logger.info(f"🔍 Debug: Encontrados {len(objetivos)} objetivos")

        # También obtener resumen
        resumen = objetivo_service.get_resumen_objetivos(user_id)
        logger.info(f"🔍 Debug: Resumen: {resumen}")

        return jsonify({
            'success': True,
            'debug_info': {
                'user_id': user_id,
                'objetivos_count': len(objetivos),
                'objetivos': [objetivo.to_dict() for objetivo in objetivos],
                'resumen': resumen
            }
        })
    except Exception as e:
        logger.error(f"❌ Error en debug objetivos: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'debug_info': {
                'user_id': user_id,
                'error_type': type(e).__name__
            }
        })

@financial_bp.route('/debug/raw-query', methods=['GET'])
def debug_raw_query():
    """Endpoint de debug para probar la consulta SQL directamente"""
    try:
        from utils.database import db_manager
        import pymysql

        user_id = 1
        debug_info = {}

        with db_manager.get_connection() as conn:
            # Usar DictCursor para obtener resultados como diccionarios
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            # Ejecutar la consulta exacta del repositorio
            query = """
                SELECT f.*, tf.nombre as tipo_factura_nombre, tf.icono as tipo_factura_icono, tf.id as tipo_factura_codigo
                FROM facturas f
                JOIN tipos_factura tf ON f.tipo_factura_id = tf.id
                WHERE f.user_id = %s
                ORDER BY f.fecha_vencimiento ASC
            """

            cursor.execute(query, (user_id,))
            raw_results = cursor.fetchall()

            debug_info['raw_sql_results'] = raw_results
            debug_info['raw_results_count'] = len(raw_results)

            # Intentar crear una factura manualmente
            if raw_results:
                first_row = raw_results[0]
                debug_info['first_row_sample'] = first_row

                # Intentar el método from_dict
                try:
                    factura = factura_service.factura_repo.entity_class.from_dict(first_row)
                    debug_info['from_dict_success'] = True
                    debug_info['factura_created'] = factura.to_dict()
                except Exception as e:
                    debug_info['from_dict_error'] = str(e)
                    debug_info['error_type'] = type(e).__name__

        return jsonify({
            'success': True,
            'debug_info': debug_info
        })
    except Exception as e:
        logger.error(f"❌ Error en debug raw query: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@financial_bp.route('/debug/restore-user-ids', methods=['POST'])
def restore_user_ids():
    """Endpoint para restaurar facturas al user_id 10"""
    try:
        from utils.database import db_manager

        with db_manager.get_connection() as conn:
            cursor = conn.cursor()

            # Restaurar facturas del user_id 1 al user_id 10
            cursor.execute("UPDATE facturas SET user_id = 10 WHERE user_id = 1")
            affected_rows = cursor.rowcount
            conn.commit()

        return jsonify({
            'success': True,
            'message': f'Restauradas {affected_rows} facturas del user_id 1 al user_id 10'
        })
    except Exception as e:
        logger.error(f"❌ Error restaurando facturas: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@financial_bp.route('/debug/fix-user-ids', methods=['POST'])
def fix_user_ids():
    """Endpoint para reasignar facturas del user_id 10 al user_id 1"""
    try:
        from utils.database import db_manager

        with db_manager.get_connection() as conn:
            cursor = conn.cursor()

            # Reasignar facturas del user_id 10 al user_id 1
            cursor.execute("UPDATE facturas SET user_id = 1 WHERE user_id = 10")
            affected_rows = cursor.rowcount
            conn.commit()

        return jsonify({
            'success': True,
            'message': f'Reasignadas {affected_rows} facturas del user_id 10 al user_id 1'
        })
    except Exception as e:
        logger.error(f"❌ Error reasignando facturas: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@financial_bp.route('/transactions', methods=['GET'])
@token_required  # Re-enabled for production
# @rate_limit(limit=100, per=60)
@handle_errors
def get_transacciones(current_user):
    """Obtiene todas las transacciones del usuario (ingresos y gastos combinados)"""
    try:
        user_id = get_current_user_id(current_user)
        periodo = request.args.get('period', request.args.get('periodo', 'mes_actual'))
        filtro_tipo = request.args.get('tipo', 'all')  # all, ingreso, gasto

        logger.info(f"Transactions request for user {user_id}, period {periodo}, tipo {filtro_tipo}")

        # Obtener ingresos y gastos según el período
        ingresos = ingreso_service.get_ingresos_por_periodo(user_id, periodo)
        gastos = gasto_service.get_gastos_por_periodo(user_id, periodo)

        # Crear estructura similar al dashboard pero con todos los datos
        transacciones_dict = {
            'ingresos': ingresos,
            'gastos': gastos
        }

        # Usar el mismo método del dashboard para formatear
        transacciones_formateadas = dashboard_service._format_transacciones_recientes(transacciones_dict)

        # Filtrar por tipo si se especifica
        if filtro_tipo != 'all':
            transacciones_formateadas = [t for t in transacciones_formateadas if t['tipo'] == filtro_tipo]

        # Ordenar por fecha descendente (más recientes primero)
        transacciones_formateadas.sort(key=lambda x: x['fecha'], reverse=True)

        logger.info(f"Returning {len(transacciones_formateadas)} transacciones for user {user_id}")
        return jsonify({
            'success': True,
            'data': {
                'transacciones': transacciones_formateadas,
                'total': len(transacciones_formateadas),
                'filtros': {
                    'periodo': periodo,
                    'tipo': filtro_tipo
                }
            }
        })

    except Exception as e:
        logger.error(f"Error in transactions endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500

@financial_bp.route('/dashboard', methods=['GET'])
@token_required  # Re-enabled for production
# @rate_limit(limit=30, per=60)
@handle_errors
def get_dashboard(current_user):
    """Obtiene resumen completo para el dashboard"""
    try:
        user_id = get_current_user_id(current_user)
        periodo = request.args.get('period', 'current_month')  # Changed from 'periodo' to 'period'
        
        logger.info(f"Dashboard request for user {user_id}, period {periodo}")
        
        # Use real dashboard service instead of mock data
        dashboard_data = dashboard_service.get_dashboard_data_formatted(user_id, periodo)
        
        logger.info(f"Returning real dashboard data for user {user_id}")
        return jsonify({
            'success': True,
            'data': dashboard_data
        })
        
    except Exception as e:
        logger.error(f"Error in dashboard endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500


# ============================================================================
# ENDPOINTS DE CATÁLOGOS
# ============================================================================

@financial_bp.route('/catalogs/payment-types', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_tipos_pago(current_user):
    """Obtiene tipos de pago disponibles"""
    from models.financial_repository import TipoPagoRepository
    
    repo = TipoPagoRepository()
    tipos = repo.find_active_ordered()
    
    return jsonify({
        'success': True,
        'data': [tipo.to_dict() for tipo in tipos]
    })


@financial_bp.route('/catalogs/bill-types', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_tipos_factura_catalog(current_user):
    """Obtiene los tipos de factura disponibles (catálogo)"""
    from models.financial_repository import TipoFacturaRepository

    repo = TipoFacturaRepository()
    tipos = repo.find_active_ordered()

    return jsonify({
        'success': True,
        'data': [tipo.to_dict() for tipo in tipos]
    })

@financial_bp.route('/catalogs/income-types', methods=['GET'])
@token_required
# @rate_limit(limit=50, per=60)
@handle_errors
def get_tipos_ingreso(current_user):
    """Obtiene tipos de ingreso disponibles"""
    from models.financial_repository import TipoIngresoRepository
    
    repo = TipoIngresoRepository()
    tipos = repo.find_active_ordered()
    
    return jsonify({
        'success': True,
        'data': [tipo.to_dict() for tipo in tipos]
    })


@financial_bp.route('/catalogs/priorities', methods=['GET'])
@token_required
# @rate_limit(limit=30, per=60)
@handle_errors
def get_prioridades(current_user):
    """Obtiene prioridades disponibles"""
    from models.financial_repository import PrioridadRepository
    
    repo = PrioridadRepository()
    prioridades = repo.find_active_ordered()
    
    return jsonify({
        'success': True,
        'data': [prioridad.to_dict() for prioridad in prioridades]
    })


# ============================================================================
# HEALTH CHECK
# ============================================================================

@financial_bp.route('/health', methods=['GET'])
# @rate_limit(limit=100, per=60)
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'service': 'financial-api',
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@financial_bp.route('/chat', methods=['POST'])
@token_required
@handle_errors
def handle_chat(current_user):
    """Maneja los mensajes del chatbot con la IA de Gemini"""
    if not model:
        raise BusinessLogicError("El modelo de IA no está disponible o no se pudo configurar.")

    data = request.get_json()
    message = data.get('message')
    history = data.get('history', [])

    if not message:
        raise ValidationError("El mensaje es obligatorio.")

    try:
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(message)

        return jsonify({
            'success': True,
            'data': {'reply': response.text}
        })

    except Exception as e:
        error_str = str(e)
        if "429" in error_str and "quota" in error_str.lower():
            # Rate limit exceeded
            logger.warning(f"Gemini API quota exceeded: {e}")
            return jsonify({
                'success': False,
                'error': 'RATE_LIMIT_EXCEEDED',
                'message': 'Has excedido el límite de preguntas por minuto. Espera un momento antes de preguntar de nuevo.',
                'retry_after': 60  # seconds
            }), 429
        else:
            # Other errors
            logger.error(f"Chat error: {e}")
            raise


# Registrar blueprint en el módulo
__all__ = ['financial_bp']