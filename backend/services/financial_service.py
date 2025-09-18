"""
Servicios de negocio para el sistema financiero - Enterprise Architecture
¡La lógica de negocio más robusta que verás en tu vida! 🔥
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging
from dataclasses import asdict
import calendar

from models.financial_base import *
from models.financial_repository import *
# from utils.auth import get_current_user_id  # TODO: Function doesn't exist yet
# from utils.security import audit_log  # TODO: Function doesn't exist yet

def audit_log(message: str):
    """Temporary audit log function - logs to regular logger"""
    logger.info(f"[AUDIT] {message}")


logger = logging.getLogger(__name__)


class BusinessLogicError(Exception):
    """Excepción para errores de lógica de negocio"""
    pass


class InsufficientPermissionsError(Exception):
    """Excepción para permisos insuficientes"""
    pass


class BaseFinancialService:
    """Servicio base con operaciones comunes"""
    
    def __init__(self):
        # Inicializar repositorios
        self.categoria_repo = CategoriaMovimientoRepository()
        self.tipo_movimiento_repo = TipoMovimientoRepository()
        self.tipo_ingreso_repo = TipoIngresoRepository()
        self.tipo_pago_repo = TipoPagoRepository()
        self.estado_aprobacion_repo = EstadoAprobacionRepository()
        self.prioridad_repo = PrioridadRepository()
    
    def _validate_user_ownership(self, entity: UserOwnedEntity, user_id: int):
        """Valida que el usuario sea propietario de la entidad"""
        if entity.user_id != user_id and entity.empresa_id != user_id:
            raise InsufficientPermissionsError("User does not own this entity")
    
    def _get_current_month_range(self) -> Tuple[date, date]:
        """Obtiene el rango del mes actual"""
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
        return start_date, end_date

    def _parse_date(self, fecha_str: str) -> date:
        """Parsear fecha en diferentes formatos (ISO o simple)"""
        try:
            # Intentar formato ISO primero (YYYY-MM-DDTHH:MM:SS.sssZ)
            if 'T' in fecha_str:
                # Formato ISO - extraer solo la parte de fecha
                return datetime.fromisoformat(fecha_str.replace('Z', '+00:00')).date()
            else:
                # Formato simple (YYYY-MM-DD)
                return datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError as e:
            logger.error(f"Error parsing date '{fecha_str}': {e}")
            raise BusinessLogicError(f"Formato de fecha inválido: {fecha_str}")
    
    def _get_period_range(self, periodo: str = "mes_actual") -> Tuple[date, date]:
        """Obtiene rango de fechas según el período solicitado"""
        today = date.today()
        
        if periodo == "hoy":
            return today, today
        elif periodo == "semana_actual":
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            return start, end
        elif periodo == "mes_actual":
            return self._get_current_month_range()
        elif periodo == "mes_anterior":
            if today.month == 1:
                start = date(today.year - 1, 12, 1)
                end = date(today.year - 1, 12, 31)
            else:
                start = date(today.year, today.month - 1, 1)
                end = date(today.year, today.month - 1, 
                          calendar.monthrange(today.year, today.month - 1)[1])
            return start, end
        elif periodo == "año_actual":
            return date(today.year, 1, 1), date(today.year, 12, 31)
        else:
            # Default: mes actual
            return self._get_current_month_range()


class CategoriaService(BaseFinancialService):
    """Servicio para manejo de categorías"""
    
    def get_categorias_por_tipo(self, user_id: int, tipo_movimiento: str) -> List[CategoriaMovimiento]:
        """Obtiene categorías por tipo de movimiento"""
        audit_log(f"Getting categories for user {user_id}, type {tipo_movimiento}")
        
        # Buscar tipo de movimiento
        tipo = self.tipo_movimiento_repo.find_by_codigo(tipo_movimiento)
        if not tipo:
            raise BusinessLogicError(f"Invalid movement type: {tipo_movimiento}")
        
        # Obtener categorías del usuario + predeterminadas
        categorias = self.categoria_repo.find_by_user_and_type(user_id, tipo.id)
        
        logger.info(f"Found {len(categorias)} categories for user {user_id}")
        return categorias
    
    def crear_categoria_personalizada(self, user_id: int, categoria_data: Dict[str, Any]) -> CategoriaMovimiento:
        """Crea una categoría personalizada para el usuario"""
        audit_log(f"Creating custom category for user {user_id}")
        
        # Validar tipo de movimiento
        tipo_movimiento_id = categoria_data.get('tipo_movimiento_id')
        tipo = self.tipo_movimiento_repo.find_by_id(tipo_movimiento_id)
        if not tipo:
            raise BusinessLogicError("Invalid movement type")
        
        # Crear categoría
        categoria = CategoriaMovimiento(
            user_id=user_id,
            tipo_movimiento_id=tipo_movimiento_id,
            nombre=categoria_data['nombre'],
            descripcion=categoria_data.get('descripcion'),
            icono=categoria_data.get('icono', 'folder'),
            color=categoria_data.get('color', '#6C757D'),
            orden_visualizacion=categoria_data.get('orden_visualizacion', 0),
            created_by=user_id
        )
        
        categoria_id = self.categoria_repo.create(categoria)
        categoria.id = categoria_id
        
        logger.info(f"Created custom category {categoria_id} for user {user_id}")
        return categoria
    
    def get_todas_las_categorias(self, user_id: int) -> Dict[str, List[CategoriaMovimiento]]:
        """Obtiene todas las categorías organizadas por tipo"""
        result = {}
        
        # Obtener tipos de movimiento
        tipos = self.tipo_movimiento_repo.find_active_ordered()
        
        for tipo in tipos:
            if tipo.codigo != 'ambos':  # Excluir 'ambos' del frontend
                categorias = self.categoria_repo.find_by_user_and_type(user_id, tipo.id)
                result[tipo.codigo] = categorias
        
        return result


class IngresoService(BaseFinancialService):
    """Servicio para manejo de ingresos"""
    
    def __init__(self):
        super().__init__()
        self.ingreso_repo = IngresoRepository()
        self.racha_repo = RachaUsuarioRepository()
    
    def get_ingresos_por_periodo(self, user_id: int, periodo: str = "mes_actual") -> List[Ingreso]:
        """Obtiene ingresos por período"""
        audit_log(f"Getting income for user {user_id}, period {periodo}")
        
        fecha_inicio, fecha_fin = self._get_period_range(periodo)
        ingresos = self.ingreso_repo.find_by_user_period(user_id, fecha_inicio, fecha_fin)
        
        logger.info(f"Found {len(ingresos)} income records for user {user_id}")
        return ingresos
    
    def get_resumen_ingresos(self, user_id: int, periodo: str = "mes_actual") -> Dict[str, Any]:
        """Obtiene resumen de ingresos"""
        fecha_inicio, fecha_fin = self._get_period_range(periodo)
        
        total = self.ingreso_repo.get_total_by_user_period(user_id, fecha_inicio, fecha_fin)
        ingresos = self.ingreso_repo.find_by_user_period(user_id, fecha_inicio, fecha_fin)
        
        # Calcular estadísticas
        resumen = {
            'total': float(total),
            'cantidad': len(ingresos),
            'promedio': float(total / len(ingresos)) if ingresos else 0,
            'periodo': periodo,
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'por_categoria': {},
            'por_tipo': {},
            'por_fuente': {}
        }
        
        # Agrupar por categoría
        for ingreso in ingresos:
            cat_name = ingreso.categoria.nombre if ingreso.categoria else 'Sin categoría'
            if cat_name not in resumen['por_categoria']:
                resumen['por_categoria'][cat_name] = {'total': 0, 'cantidad': 0}
            resumen['por_categoria'][cat_name]['total'] += float(ingreso.monto)
            resumen['por_categoria'][cat_name]['cantidad'] += 1
        
        # Agrupar por tipo
        for ingreso in ingresos:
            tipo_name = ingreso.tipo_ingreso.nombre if ingreso.tipo_ingreso else 'Sin tipo'
            if tipo_name not in resumen['por_tipo']:
                resumen['por_tipo'][tipo_name] = {'total': 0, 'cantidad': 0}
            resumen['por_tipo'][tipo_name]['total'] += float(ingreso.monto)
            resumen['por_tipo'][tipo_name]['cantidad'] += 1
        
        # Agrupar por fuente
        for ingreso in ingresos:
            if ingreso.fuente not in resumen['por_fuente']:
                resumen['por_fuente'][ingreso.fuente] = {'total': 0, 'cantidad': 0}
            resumen['por_fuente'][ingreso.fuente]['total'] += float(ingreso.monto)
            resumen['por_fuente'][ingreso.fuente]['cantidad'] += 1
        
        return resumen
    
    def crear_ingreso(self, user_id: int, ingreso_data: Dict[str, Any]) -> Ingreso:
        """Crea un nuevo ingreso"""
        audit_log(f"Creating income for user {user_id}")
        
        # Validar categoría
        categoria = self.categoria_repo.find_by_id(ingreso_data['categoria_id'])
        if not categoria:
            raise BusinessLogicError("Invalid category")
        
        # Validar que la categoría sea de ingresos o ambos
        if categoria.tipo_movimiento_id not in [1, 3]:  # 1=ingreso, 3=ambos
            raise BusinessLogicError("Category is not for income")
        
        # Validar tipo de ingreso
        tipo_ingreso = self.tipo_ingreso_repo.find_by_id(ingreso_data['tipo_ingreso_id'])
        if not tipo_ingreso:
            raise BusinessLogicError("Invalid income type")
        
        # Crear ingreso
        ingreso = Ingreso(
            user_id=user_id,
            categoria_id=ingreso_data['categoria_id'],
            tipo_ingreso_id=ingreso_data['tipo_ingreso_id'],
            concepto=ingreso_data['concepto'],
            descripcion=ingreso_data.get('descripcion'),
            fuente=ingreso_data['fuente'],
            monto=Decimal(str(ingreso_data['monto'])),
            fecha=self._parse_date(ingreso_data['fecha']),
            es_recurrente=ingreso_data.get('es_recurrente', False),
            frecuencia_dias=ingreso_data.get('frecuencia_dias'),
            numero_referencia=ingreso_data.get('numero_referencia'),
            notas=ingreso_data.get('notas'),
            created_by=user_id
        )
        
        # Calcular próximo ingreso si es recurrente
        if ingreso.es_recurrente and ingreso.frecuencia_dias:
            ingreso.proximo_ingreso = ingreso.fecha + timedelta(days=ingreso.frecuencia_dias)
        
        ingreso_id = self.ingreso_repo.create(ingreso)
        ingreso.id = ingreso_id

        # Actualizar rachas al crear ingreso
        try:
            self.racha_repo.actualizar_racha_registro(user_id)
        except Exception as e:
            logger.warning(f"Error updating streaks after creating income: {str(e)}")

        logger.info(f"Created income {ingreso_id} for user {user_id}")
        return ingreso
    
    def _get_period_range(self, periodo: str) -> Tuple[date, date]:
        """Obtiene el rango de fechas para el período especificado"""
        today = date.today()
        
        if periodo == "current_month" or periodo == "mes_actual":
            # Primer día del mes actual
            fecha_inicio = today.replace(day=1)
            # Último día del mes actual
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        elif periodo == "current_year" or periodo == "año_actual":
            # Primer día del año
            fecha_inicio = today.replace(month=1, day=1)
            # Último día del año
            fecha_fin = today.replace(month=12, day=31)
        
        elif periodo == "last_month" or periodo == "mes_anterior":
            # Primer día del mes anterior
            if today.month == 1:
                fecha_inicio = today.replace(year=today.year - 1, month=12, day=1)
                fecha_fin = today.replace(year=today.year - 1, month=12, day=31)
            else:
                fecha_inicio = today.replace(month=today.month - 1, day=1)
                # Último día del mes anterior
                fecha_fin = today.replace(day=1) - timedelta(days=1)
        
        else:
            # Por defecto: mes actual
            fecha_inicio = today.replace(day=1)
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        return fecha_inicio, fecha_fin

    def get_ingreso_by_id(self, ingreso_id: int, user_id: int) -> Optional[Ingreso]:
        """Obtiene un ingreso específico verificando que pertenezca al usuario"""
        audit_log(f"Getting income {ingreso_id} for user {user_id}")

        ingreso = self.ingreso_repo.find_by_id(ingreso_id)
        if ingreso and ingreso.user_id == user_id:
            return ingreso
        return None

    def eliminar_ingreso(self, ingreso_id: int, user_id: int) -> bool:
        """Elimina un ingreso del usuario"""
        audit_log(f"Deleting income {ingreso_id} for user {user_id}")

        # Verificar que el ingreso pertenece al usuario
        ingreso = self.get_ingreso_by_id(ingreso_id, user_id)
        if not ingreso:
            raise BusinessLogicError("Ingreso no encontrado o no pertenece al usuario")

        # Eliminar el ingreso
        success = self.ingreso_repo.delete(ingreso_id)

        if success:
            logger.info(f"Deleted income {ingreso_id} for user {user_id}")
        else:
            logger.error(f"Failed to delete income {ingreso_id} for user {user_id}")

        return success


class GastoService(BaseFinancialService):
    """Servicio para manejo de gastos"""
    
    def __init__(self):
        super().__init__()
        self.gasto_repo = GastoRepository()
        self.gasto_planificado_repo = GastoPlanificadoRepository()
        self.presupuesto_service = PresupuestoService()
        self.racha_repo = RachaUsuarioRepository()
    
    def get_gastos_por_periodo(self, user_id: int, periodo: str = "mes_actual") -> List[Gasto]:
        """Obtiene gastos por período"""
        audit_log(f"Getting expenses for user {user_id}, period {periodo}")
        
        fecha_inicio, fecha_fin = self._get_period_range(periodo)
        gastos = self.gasto_repo.find_by_user_period(user_id, fecha_inicio, fecha_fin)
        
        logger.info(f"Found {len(gastos)} expense records for user {user_id}")
        if gastos:
            for gasto in gastos[:3]:  # Log first 3 expenses for debugging
                logger.info(f"Expense: id={gasto.id}, concepto={gasto.concepto}, categoria_id={gasto.categoria_id}, monto={gasto.monto}")
        return gastos
    
    def get_resumen_gastos_por_categoria(self, user_id: int, periodo: str = "mes_actual") -> List[Dict[str, Any]]:
        """Obtiene resumen de gastos agrupados por categoría"""
        fecha_inicio, fecha_fin = self._get_period_range(periodo)
        
        resumen = self.gasto_repo.get_resumen_por_categoria(user_id, fecha_inicio, fecha_fin)
        
        logger.info(f"🔍 DEBUG: Category summary for user {user_id} from {fecha_inicio} to {fecha_fin}")
        logger.info(f"🔍 DEBUG: Found {len(resumen)} categories with totals > 0")
        
        if not resumen:
            logger.warning(f"⚠️ No categories found with expenses for user {user_id}")
        
        for item in resumen:
            logger.info(f"📊 Category: {item.get('categoria_nombre', 'Unknown')}, Total: {item.get('total_gastado', 0)}, Count: {item.get('cantidad_gastos', 0)}")
        
        # Calcular porcentajes
        total_general = float(sum(float(item['total_gastado']) for item in resumen))
        
        for item in resumen:
            # Convert all numeric values to float to avoid Decimal/float mixing
            item['total_gastado'] = float(item['total_gastado'])
            item['cantidad_gastos'] = int(item.get('cantidad_gastos', 0))
            item['porcentaje'] = (item['total_gastado'] / total_general * 100) if total_general > 0 else 0
        
        return resumen
    
    def crear_gasto(self, user_id: int, gasto_data: Dict[str, Any]) -> Gasto:
        """
        Crea un nuevo gasto, respetando el estado de aprobacion si se proporciona.
        """
        audit_log(f"Creating expense for user {user_id}")
        
        # --- Validaciones (sin cambios, ya estaban bien) ---
        categoria = self.categoria_repo.find_by_id(gasto_data['categoria_id'])
        if not categoria:
            raise BusinessLogicError("Categoría inválida")
        
        if categoria.tipo_movimiento_id not in [2, 3]:  # 2=gasto, 3=ambos
            raise BusinessLogicError("La categoría no es para gastos")
        
        tipo_pago = self.tipo_pago_repo.find_by_id(gasto_data['tipo_pago_id'])
        if not tipo_pago:
            raise BusinessLogicError("Tipo de pago inválido")
        
        monto = Decimal(str(gasto_data['monto']))
        fecha = self._parse_date(gasto_data['fecha'])
        
        self._verificar_presupuesto(user_id, gasto_data['categoria_id'], monto, fecha)
        
        # --- INICIO DE LA CORRECCIÓN ---

        # Se obtienen los valores de aprobación del diccionario `gasto_data`.
        # El método .get() es ideal porque nos permite definir un valor por defecto
        # si la clave no existe.
        estado_aprobacion_id = gasto_data.get('estado_aprobacion_id', 2) # Usa el estado_id recibido, o 2 por defecto.
        requiere_aprobacion = gasto_data.get('requiere_aprobacion', False)
        aprobado_por = gasto_data.get('aprobado_por')
        fecha_aprobacion = gasto_data.get('fecha_aprobacion')
        empresa_id = gasto_data.get('empresa_id')

        # Crear el objeto Gasto con los valores correctos
        gasto = Gasto(
            user_id=user_id,
            empresa_id=empresa_id, # Añadido para asociar el gasto
            categoria_id=gasto_data['categoria_id'],
            tipo_pago_id=gasto_data['tipo_pago_id'],
            concepto=gasto_data['concepto'],
            descripcion=gasto_data.get('descripcion'),
            monto=monto,
            fecha=fecha,
            proveedor=gasto_data.get('proveedor'),
            ubicacion=gasto_data.get('ubicacion'),
            numero_referencia=gasto_data.get('numero_referencia'),
            es_deducible=gasto_data.get('es_deducible', False),
            notas=gasto_data.get('notas'),
            
            # --- PUNTO CLAVE DE LA CORRECCIÓN ---
            estado_aprobacion_id=estado_aprobacion_id, # Se usa la variable en lugar del valor fijo 2
            requiere_aprobacion=requiere_aprobacion,
            aprobado_por=aprobado_por,
            fecha_aprobacion=fecha_aprobacion,
            # --- FIN DE LA CORRECCIÓN ---
            
            created_by=user_id
        )
        
        gasto_id = self.gasto_repo.create(gasto)
        gasto.id = gasto_id
        
        # --- Lógica posterior (sin cambios) ---
        self.presupuesto_service.actualizar_gasto_en_presupuesto(
            user_id, gasto_data['categoria_id'], monto, fecha
        )

        try:
            self.racha_repo.actualizar_racha_registro(user_id)
        except Exception as e:
            logger.warning(f"Error actualizando racha tras crear gasto: {str(e)}")

        logger.info(f"Creado gasto {gasto_id} para usuario {user_id} con estado de aprobación ID: {estado_aprobacion_id}")
        return gasto

    
    def _verificar_presupuesto(self, user_id: int, categoria_id: int, monto: Decimal, fecha: date):
        """Verifica si el gasto excede el presupuesto"""
        try:
            presupuesto = self.presupuesto_service.get_presupuesto_categoria(
                user_id, categoria_id, fecha.month, fecha.year
            )
            if presupuesto and (presupuesto.gastado_actual + monto) > presupuesto.limite_mensual:
                logger.warning(f"Expense exceeds budget for user {user_id}, category {categoria_id}")
                # No bloqueamos, solo loggeamos
        except Exception as e:
            logger.error(f"Error checking budget: {e}")
    
    def _get_period_range(self, periodo: str) -> Tuple[date, date]:
        """Obtiene el rango de fechas para el período especificado"""
        today = date.today()
        
        if periodo == "current_month" or periodo == "mes_actual":
            # Primer día del mes actual
            fecha_inicio = today.replace(day=1)
            # Último día del mes actual
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        elif periodo == "current_year" or periodo == "año_actual":
            # Primer día del año
            fecha_inicio = today.replace(month=1, day=1)
            # Último día del año
            fecha_fin = today.replace(month=12, day=31)
        
        elif periodo == "last_month" or periodo == "mes_anterior":
            # Primer día del mes anterior
            if today.month == 1:
                fecha_inicio = today.replace(year=today.year - 1, month=12, day=1)
                fecha_fin = today.replace(year=today.year - 1, month=12, day=31)
            else:
                fecha_inicio = today.replace(month=today.month - 1, day=1)
                # Último día del mes anterior
                fecha_fin = today.replace(day=1) - timedelta(days=1)
        
        else:
            # Por defecto: mes actual
            fecha_inicio = today.replace(day=1)
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        return fecha_inicio, fecha_fin

    def crear_gasto_planificado(self, user_id: int, gasto_data: Dict[str, Any]) -> GastoPlanificado:
        """Crea un nuevo gasto planificado"""
        audit_log(f"Creating planned expense for user {user_id}")

        # Validar categoría
        categoria = self.categoria_repo.find_by_id(gasto_data['categoria_id'])
        if not categoria:
            raise BusinessLogicError("Invalid category")

        # Validar que la categoría sea de gastos o ambos
        if categoria.tipo_movimiento_id not in [2, 3]:  # 2=gasto, 3=ambos
            raise BusinessLogicError("Category is not for expenses")

        # Crear gasto planificado
        gasto_planificado = GastoPlanificado(
            user_id=user_id,
            categoria_id=gasto_data['categoria_id'],
            tipo_pago_id=gasto_data.get('tipo_pago_id', 1),  # Default a efectivo
            prioridad_id=gasto_data.get('prioridad_id', 1),  # Default a normal
            estado_id=1,  # Pendiente
            concepto=gasto_data['concepto'],
            descripcion=gasto_data.get('descripcion'),
            monto_estimado=Decimal(str(gasto_data['monto'])),
            fecha_planificada=self._parse_date(gasto_data['fecha']),
            proveedor=gasto_data.get('proveedor'),
            notas=gasto_data.get('notas'),
            notificar_dias_antes=gasto_data.get('notificar_dias_antes', 1),
            created_by=user_id
        )

        gasto_planificado = self.gasto_planificado_repo.create(gasto_planificado)

        # Actualizar rachas al crear gasto planificado
        try:
            self.racha_repo.actualizar_racha_registro(user_id)
        except Exception as e:
            logger.warning(f"Error updating streaks after creating planned expense: {str(e)}")

        logger.info(f"Created planned expense {gasto_planificado.id} for user {user_id}")
        return gasto_planificado

    def get_gastos_planificados(self, user_id: int) -> List[GastoPlanificado]:
        """Obtiene todos los gastos planificados del usuario"""
        return self.gasto_planificado_repo.find_by_user(user_id)

    def ejecutar_gasto_planificado(self, user_id: int, gasto_planificado_id: int) -> Gasto:
        """Ejecuta un gasto planificado convirtiéndolo en gasto real"""
        # Obtener el gasto planificado
        gastos_planificados = self.gasto_planificado_repo.find_by_user(user_id)
        gasto_planificado = next((g for g in gastos_planificados if g.id == gasto_planificado_id), None)

        if not gasto_planificado:
            raise BusinessLogicError("Planned expense not found")

        # Crear gasto real basado en el planificado
        gasto_data = {
            'categoria_id': gasto_planificado.categoria_id,
            'tipo_pago_id': gasto_planificado.tipo_pago_id or 1,
            'concepto': gasto_planificado.concepto,
            'descripcion': gasto_planificado.descripcion,
            'monto': float(gasto_planificado.monto_estimado),
            'fecha': date.today().isoformat(),
            'proveedor': gasto_planificado.proveedor,
            'notas': gasto_planificado.notas
        }

        # Crear el gasto real
        gasto_real = self.crear_gasto(user_id, gasto_data)

        # Actualizar estado del gasto planificado a ejecutado
        self.gasto_planificado_repo.update_status(gasto_planificado_id, 2)  # 2 = ejecutado

        logger.info(f"Executed planned expense {gasto_planificado_id} as expense {gasto_real.id}")
        return gasto_real

    def cancelar_gasto_planificado(self, user_id: int, gasto_planificado_id: int) -> bool:
        """Cancela un gasto planificado"""
        logger.info(f"Attempting to cancel planned expense {gasto_planificado_id} for user {user_id}")

        # Verificar que el gasto existe y pertenece al usuario
        gastos_usuario = self.gasto_planificado_repo.find_by_user(user_id)
        gasto_encontrado = None
        for gasto in gastos_usuario:
            if gasto.id == gasto_planificado_id:
                gasto_encontrado = gasto
                break

        if not gasto_encontrado:
            logger.error(f"Planned expense {gasto_planificado_id} not found for user {user_id}")
            return False

        logger.info(f"Found planned expense: {gasto_encontrado.concepto}, current state: {gasto_encontrado.estado_id}")

        # Verificar si ya está cancelado
        if gasto_encontrado.estado_id == 3:
            logger.info(f"Planned expense {gasto_planificado_id} is already cancelled")
            return True  # Ya está cancelado, consideramos esto como éxito

        # Actualizar estado a cancelado
        success = self.gasto_planificado_repo.update_status(gasto_planificado_id, 3)  # 3 = cancelado
        logger.info(f"Update status result: {success}")

        if success:
            logger.info(f"Cancelled planned expense {gasto_planificado_id} for user {user_id}")
        else:
            logger.error(f"Failed to cancel planned expense {gasto_planificado_id} for user {user_id}")

        return success

    def get_gasto_by_id(self, gasto_id: int, user_id: int) -> Optional[Gasto]:
        """Obtiene un gasto específico verificando que pertenezca al usuario"""
        audit_log(f"Getting expense {gasto_id} for user {user_id}")

        gasto = self.gasto_repo.find_by_id(gasto_id)
        if gasto and gasto.user_id == user_id:
            return gasto
        return None

    def eliminar_gasto(self, gasto_id: int, user_id: int) -> bool:
        """Elimina un gasto del usuario"""
        audit_log(f"Deleting expense {gasto_id} for user {user_id}")

        # Verificar que el gasto pertenece al usuario
        gasto = self.get_gasto_by_id(gasto_id, user_id)
        if not gasto:
            raise BusinessLogicError("Gasto no encontrado o no pertenece al usuario")

        # Eliminar el gasto
        success = self.gasto_repo.delete(gasto_id)

        if success:
            logger.info(f"Deleted expense {gasto_id} for user {user_id}")
        else:
            logger.error(f"Failed to delete expense {gasto_id} for user {user_id}")

        return success


class ObjetivoService(BaseFinancialService):
    """Servicio para manejo de objetivos financieros"""
    
    def __init__(self):
        super().__init__()
        self.objetivo_repo = ObjetivoRepository()
        self.movimiento_repo = ObjetivoMovimientoRepository()
        self.racha_repo = RachaUsuarioRepository()
    
    def get_objetivos_usuario(self, user_id: int) -> List[Objetivo]:
        """Obtiene todos los objetivos del usuario"""
        audit_log(f"Getting goals for user {user_id}")
        
        objetivos = self.objetivo_repo.find_by_user(user_id)
        
        logger.info(f"Found {len(objetivos)} goals for user {user_id}")
        return objetivos
    
    def get_resumen_objetivos(self, user_id: int) -> Dict[str, Any]:
        """Obtiene resumen de objetivos del usuario"""
        try:
            # El repositorio devuelve datos con claves snake_case de la BD
            resumen_db = self.objetivo_repo.get_resumen_usuario(user_id)
            
            # Si no hay resumen, devolvemos una estructura vacía y compatible
            if not resumen_db:
                return {
                    'totalAhorrado': 0.0,
                    'totalMetas': 0.0,
                    'progresoGeneral': 0.0,
                    'objetivosActivos': 0,
                    'objetivosCompletados': 0
                }
            
            # Convertir Decimals a float y mapear a las claves camelCase que el frontend espera
            total_ahorrado = float(resumen_db.get('ahorro_total_actual', 0))
            total_metas = float(resumen_db.get('meta_total_general', 0))
            
            progreso = 0.0
            if total_metas > 0:
                progreso = (total_ahorrado / total_metas) * 100

            # Construir el diccionario final para el frontend
            resumen_frontend = {
                'totalAhorrado': total_ahorrado,
                'totalMetas': total_metas,
                'progresoGeneral': progreso,
                'objetivosActivos': int(resumen_db.get('total_objetivos', 0)),
                'objetivosCompletados': int(resumen_db.get('objetivos_completados', 0))
            }
            
            return resumen_frontend
            
        except Exception as e:
            logger.error(f"Error getting goals summary for user {user_id}: {e}")
            # Devolver un resumen vacío en caso de error
            return {
                'totalAhorrado': 0.0,
                'totalMetas': 0.0,
                'progresoGeneral': 0.0,
                'objetivosActivos': 0,
                'objetivosCompletados': 0
            }
    
    def crear_objetivo(self, user_id: int, objetivo_data: Dict[str, Any]) -> Objetivo:
        """Crea un nuevo objetivo"""
        audit_log(f"Creating goal for user {user_id}")
        
        # Validar prioridad
        prioridad = self.prioridad_repo.find_by_id(objetivo_data['prioridad_id'])
        if not prioridad:
            raise BusinessLogicError("Invalid priority")
        
        # Crear objetivo
        objetivo = Objetivo(
            user_id=user_id,
            empresa_id=None,  # Individual user, not company
            nombre=objetivo_data['nombre'],
            descripcion=objetivo_data.get('descripcion'),
            meta_total=Decimal(str(objetivo_data['meta_total'])),
            ahorro_actual=Decimal('0.00'),  # Start with 0 savings
            fecha_limite=datetime.strptime(objetivo_data['fecha_limite'], '%Y-%m-%d').date() if objetivo_data.get('fecha_limite') else None,
            prioridad_id=objetivo_data['prioridad_id'],
            categoria=objetivo_data.get('categoria'),
            created_by=user_id,
            is_active=True,  # New goals are active by default
            version=1  # Initial version
        )
        
        objetivo_id = self.objetivo_repo.create(objetivo)
        objetivo.id = objetivo_id

        # Actualizar rachas al crear objetivo
        try:
            self.racha_repo.actualizar_racha_registro(user_id)
            self.racha_repo.actualizar_racha_objetivos(user_id)
        except Exception as e:
            logger.warning(f"Error updating streaks after creating goal: {str(e)}")

        logger.info(f"Created goal {objetivo_id} for user {user_id}")
        return objetivo
    
    def agregar_dinero_objetivo(self, user_id: int, objetivo_id: int,
                              monto: Decimal, descripcion: str = "") -> Objetivo:
        """Agrega dinero a un objetivo"""
        audit_log(f"Adding money to goal {objetivo_id} for user {user_id}")

        # Obtener objetivo
        objetivo = self.objetivo_repo.find_by_id(objetivo_id)
        if not objetivo:
            raise BusinessLogicError("Goal not found")

        self._validate_user_ownership(objetivo, user_id)

        if monto <= 0:
            raise BusinessLogicError("Amount must be positive")

        # Actualizar objetivo
        nuevo_ahorro = objetivo.ahorro_actual + monto
        self.objetivo_repo.actualizar_ahorro(objetivo_id, nuevo_ahorro)

        # Crear movimiento
        movimiento = ObjetivoMovimiento(
            objetivo_id=objetivo_id,
            monto=monto,
            es_aporte=True,
            descripcion=descripcion
        )
        self.movimiento_repo.create(movimiento)

        # Actualizar objeto en memoria
        objetivo.ahorro_actual = nuevo_ahorro

        # Actualizar rachas al agregar dinero al objetivo
        try:
            self.racha_repo.actualizar_racha_registro(user_id)
            self.racha_repo.actualizar_racha_ahorro(user_id)
        except Exception as e:
            logger.warning(f"Error updating streaks after adding money to goal: {str(e)}")

        logger.info(f"Added {monto} to goal {objetivo_id}")
        return objetivo

    def get_historial_movimientos_objetivo(self, user_id: int, objetivo_id: int) -> List[Dict[str, Any]]:
        """Obtiene el historial de movimientos de un objetivo específico"""
        audit_log(f"Getting goal movement history for goal {objetivo_id} and user {user_id}")

        # Verificar que el objetivo existe y pertenece al usuario
        objetivo = self.objetivo_repo.find_by_id(objetivo_id)
        if not objetivo:
            raise BusinessLogicError("Goal not found")

        self._validate_user_ownership(objetivo, user_id)

        # Obtener movimientos
        movimientos = self.movimiento_repo.find_by_objetivo(objetivo_id)

        # Formatear para el frontend
        historial = []
        for movimiento in movimientos:
            historial.append({
                'id': movimiento.id,
                'monto': float(movimiento.monto),
                'es_aporte': movimiento.es_aporte,
                'tipo': 'aporte' if movimiento.es_aporte else 'retiro',
                'descripcion': movimiento.descripcion or ('Aporte' if movimiento.es_aporte else 'Retiro'),
                'fecha': movimiento.created_at.isoformat() if movimiento.created_at else datetime.now().isoformat()
            })

        # Ordenar por fecha descendente (más recientes primero)
        historial.sort(key=lambda x: x['fecha'], reverse=True)

        logger.info(f"Found {len(historial)} movements for goal {objetivo_id}")
        return historial
    
    def retirar_dinero_objetivo(self, user_id: int, objetivo_id: int, 
                              monto: Decimal, descripcion: str = "") -> Objetivo:
        """Retira dinero de un objetivo"""
        audit_log(f"Withdrawing money from goal {objetivo_id} for user {user_id}")
        
        # Obtener objetivo
        objetivo = self.objetivo_repo.find_by_id(objetivo_id)
        if not objetivo:
            raise BusinessLogicError("Goal not found")
        
        self._validate_user_ownership(objetivo, user_id)
        
        if monto <= 0:
            raise BusinessLogicError("Amount must be positive")
        
        if monto > objetivo.ahorro_actual:
            raise BusinessLogicError("Insufficient funds in goal")
        
        # Actualizar objetivo
        nuevo_ahorro = objetivo.ahorro_actual - monto
        self.objetivo_repo.actualizar_ahorro(objetivo_id, nuevo_ahorro)
        
        # Crear movimiento
        movimiento = ObjetivoMovimiento(
            objetivo_id=objetivo_id,
            monto=monto,
            es_aporte=False,
            descripcion=descripcion
        )
        self.movimiento_repo.create(movimiento)
        
        # Actualizar objeto en memoria
        objetivo.ahorro_actual = nuevo_ahorro
        
        logger.info(f"Withdrew {monto} from goal {objetivo_id}")
        return objetivo

    def get_objetivo_by_id(self, objetivo_id: int, user_id: int) -> Optional[Objetivo]:
        """Obtiene un objetivo específico verificando que pertenezca al usuario"""
        audit_log(f"Getting goal {objetivo_id} for user {user_id}")

        objetivo = self.objetivo_repo.find_by_id(objetivo_id)
        if objetivo and objetivo.user_id == user_id:
            return objetivo
        return None

    def eliminar_objetivo(self, objetivo_id: int, user_id: int) -> bool:
        """Elimina un objetivo del usuario"""
        audit_log(f"Deleting goal {objetivo_id} for user {user_id}")

        # Verificar que el objetivo pertenece al usuario
        objetivo = self.get_objetivo_by_id(objetivo_id, user_id)
        if not objetivo:
            raise BusinessLogicError("Objetivo no encontrado o no pertenece al usuario")

        # Eliminar el objetivo
        success = self.objetivo_repo.delete(objetivo_id)

        if success:
            logger.info(f"Deleted goal {objetivo_id} for user {user_id}")
        else:
            logger.error(f"Failed to delete goal {objetivo_id} for user {user_id}")

        return success


class PresupuestoService(BaseFinancialService):
    """Servicio para manejo de presupuestos"""
    
    def __init__(self):
        super().__init__()
        # self.presupuesto_repo = PresupuestoRepository()  # TODO: Repository not defined yet
        self.gasto_repo = GastoRepository()
    
    def get_presupuesto_categoria(self, user_id: int, categoria_id: int, 
                                mes: int, año: int) -> Optional[Presupuesto]:
        """Obtiene presupuesto para una categoría en un mes específico"""
        # Esta función se implementaría en el repositorio
        # Por ahora retornamos None
        return None
    
    def actualizar_gasto_en_presupuesto(self, user_id: int, categoria_id: int, 
                                      monto: Decimal, fecha: date):
        """Actualiza el gasto actual en el presupuesto"""
        # Lógica para actualizar presupuestos
        logger.info(f"Updating budget for user {user_id}, category {categoria_id}, amount {monto}")


class DashboardService(BaseFinancialService):
    """Servicio para el dashboard principal"""
    
    def __init__(self):
        super().__init__()
        self.ingreso_service = IngresoService()
        self.gasto_service = GastoService()
        self.objetivo_service = ObjetivoService()
        self.racha_repo = RachaUsuarioRepository()
    
    def get_resumen_completo(self, user_id: int, periodo: str = "mes_actual") -> Dict[str, Any]:
        """Obtiene resumen completo para el dashboard"""
        audit_log(f"Getting dashboard summary for user {user_id}")
        
        # Obtener rangos de fecha
        fecha_inicio, fecha_fin = self._get_period_range(periodo)
        
        # Obtener totales
        total_ingresos = self.ingreso_service.ingreso_repo.get_total_by_user_period(
            user_id, fecha_inicio, fecha_fin
        )
        total_gastos = self.gasto_service.gasto_repo.get_total_by_user_period(
            user_id, fecha_inicio, fecha_fin
        )
        
        # Calcular balance
        balance = total_ingresos - total_gastos
        
        # Obtener resúmenes
        resumen_objetivos = self.objetivo_service.get_resumen_objetivos(user_id)
        gastos_por_categoria = self.gasto_service.get_resumen_gastos_por_categoria(user_id, periodo)
        
        # Obtener transacciones recientes (últimas 10)
        ingresos_recientes = self.ingreso_service.get_ingresos_por_periodo(user_id, "mes_actual")[:5]
        gastos_recientes = self.gasto_service.get_gastos_por_periodo(user_id, "mes_actual")[:5]
        
        dashboard = {
            'periodo': periodo,
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'totales': {
                'ingresos': float(total_ingresos),
                'gastos': float(total_gastos),
                'balance': float(balance)
            },
            'objetivos': resumen_objetivos,
            'gastos_por_categoria': gastos_por_categoria,
            'transacciones_recientes': {
                'ingresos': ingresos_recientes,  # Keep as objects to preserve relations
                'gastos': gastos_recientes       # Keep as objects to preserve relations
            }
        }
        
        logger.info(f"Generated dashboard summary for user {user_id}")
        return dashboard
    
    def _get_period_range(self, periodo: str) -> Tuple[date, date]:
        """Obtiene el rango de fechas para el período especificado"""
        today = date.today()
        
        if periodo == "current_month" or periodo == "mes_actual":
            # Primer día del mes actual
            fecha_inicio = today.replace(day=1)
            # Último día del mes actual
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        elif periodo == "current_year" or periodo == "año_actual":
            # Primer día del año
            fecha_inicio = today.replace(month=1, day=1)
            # Último día del año
            fecha_fin = today.replace(month=12, day=31)
        
        elif periodo == "last_month" or periodo == "mes_anterior":
            # Primer día del mes anterior
            if today.month == 1:
                fecha_inicio = today.replace(year=today.year - 1, month=12, day=1)
                fecha_fin = today.replace(year=today.year - 1, month=12, day=31)
            else:
                fecha_inicio = today.replace(month=today.month - 1, day=1)
                # Último día del mes anterior
                fecha_fin = today.replace(day=1) - timedelta(days=1)
        
        elif periodo == "last_7_days" or periodo == "ultima_semana":
            fecha_fin = today
            fecha_inicio = today - timedelta(days=7)
        
        elif periodo == "last_30_days" or periodo == "ultimos_30_dias":
            fecha_fin = today
            fecha_inicio = today - timedelta(days=30)
        
        else:
            # Por defecto: mes actual
            fecha_inicio = today.replace(day=1)
            if today.month == 12:
                fecha_fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                fecha_fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        return fecha_inicio, fecha_fin
    
    def get_dashboard_data_formatted(self, user_id: int, periodo: str = "current_month") -> Dict[str, Any]:
        """Obtiene datos del dashboard formateados para el frontend"""
        try:
            # Obtener datos del dashboard
            resumen = self.get_resumen_completo(user_id, periodo)
            
            # Obtener datos de objetivos
            objetivos = self.objetivo_service.get_resumen_objetivos(user_id)

            # Obtener el objetivo principal (el que tenga más progreso o el más prioritario)
            objetivo_principal = self._get_objetivo_principal(user_id)

            # Obtener gastos por categoría para el gráfico
            gastos_por_categoria = self.gasto_service.get_resumen_gastos_por_categoria(user_id, periodo)

            # Ensure all numeric values are properly converted to avoid Decimal/float mixing
            gastos_por_categoria = self._ensure_float_values(gastos_por_categoria)

            # Formatear según la estructura esperada por el frontend
            dashboard_data = {
                'saldoTotal': float(resumen['totales']['balance']),
                'objetivos': {
                    'actual': float(objetivos.get('totalAhorrado', 0)) if objetivos else 0,
                    'meta': float(objetivos.get('totalMetas', 100000)) if objetivos else 100000,
                    'nombre': objetivo_principal.get('nombre', 'Meta de ahorro') if objetivo_principal else 'Meta de ahorro',
                    'progreso': int(float(objetivos.get('progresoGeneral', 0))) if objetivos else 0
                },
                'ingresos': {
                    'total': float(resumen['totales']['ingresos']),
                    'porcentajeIncremento': 0  # TODO: Calcular comparación con período anterior
                },
                'gastos': {
                    'total': float(resumen['totales']['gastos']),
                    'porcentajeIncremento': 0,  # TODO: Calcular comparación con período anterior
                    'categorias': gastos_por_categoria
                },
                'transaccionesRecientes': self._format_transacciones_recientes(resumen.get('transacciones_recientes', {})),
                'facturasPendientes': self._get_facturas_pendientes(user_id),
                'rachas': self._get_rachas_usuario(user_id)
            }
            
            # Ensure all values are properly converted to avoid Decimal/float mixing
            return self._ensure_float_values(dashboard_data)
            
        except Exception as e:
            logger.error(f"Error getting formatted dashboard data: {str(e)}")
            raise

    def _get_objetivo_principal(self, user_id: int) -> Dict[str, Any]:
        """Obtiene el objetivo principal del usuario (el de mayor progreso o prioridad más alta)"""
        try:
            objetivos = self.objetivo_service.get_objetivos_usuario(user_id)
            if not objetivos:
                return None

            # Encontrar el objetivo con mayor progreso relativo
            mejor_objetivo = None
            mejor_progreso = -1

            for objetivo in objetivos:
                if objetivo.meta_total > 0:
                    progreso = (objetivo.ahorro_actual / objetivo.meta_total) * 100
                    # Si tienen el mismo progreso, priorizar por mayor ahorro absoluto
                    if progreso > mejor_progreso or (progreso == mejor_progreso and objetivo.ahorro_actual > (mejor_objetivo.ahorro_actual if mejor_objetivo else 0)):
                        mejor_progreso = progreso
                        mejor_objetivo = objetivo

            # Si no encontramos ninguno con progreso, tomar el primero activo
            if not mejor_objetivo and objetivos:
                mejor_objetivo = objetivos[0]

            return {
                'nombre': mejor_objetivo.nombre,
                'id': mejor_objetivo.id,
                'progreso': mejor_progreso
            } if mejor_objetivo else None

        except Exception as e:
            logger.error(f"Error getting objetivo principal: {str(e)}")
            return None

    def _get_facturas_pendientes(self, user_id: int) -> List[Dict[str, Any]]:
        """Obtiene facturas pendientes formateadas para el dashboard"""
        try:
            # Obtener facturas pendientes usando el servicio global
            facturas = factura_service.get_facturas(user_id, 'all')
            # Filtrar solo las pendientes
            facturas_pendientes = [f for f in facturas if f.estado == 'Pendiente']

            facturas_formateadas = []
            for factura in facturas_pendientes:
                # Convertir a diccionario si es necesario
                if hasattr(factura, 'to_dict'):
                    factura_dict = factura.to_dict()
                else:
                    factura_dict = factura

                facturas_formateadas.append(factura_dict)

            return facturas_formateadas

        except Exception as e:
            logger.error(f"Error getting facturas pendientes: {str(e)}")
            return []
    
    def _format_transacciones_recientes(self, transacciones_dict: Dict) -> List[Dict]:
        """Convierte las transacciones del formato backend al formato frontend"""
        transacciones_list = []

        # Agregar gastos
        if 'gastos' in transacciones_dict:
            for gasto_obj in transacciones_dict['gastos']:
                # If it's a Gasto object, access attributes directly
                if hasattr(gasto_obj, 'id'):
                    categoria_nombre = gasto_obj.categoria.nombre if gasto_obj.categoria else 'Sin categoría'
                    transacciones_list.append({
                        'id': gasto_obj.id,
                        'nombre': gasto_obj.concepto or 'Gasto sin descripción',
                        'monto': float(gasto_obj.monto),
                        'fecha': gasto_obj.fecha.isoformat() if hasattr(gasto_obj.fecha, 'isoformat') else str(gasto_obj.fecha),
                        'tipo': 'gasto',
                        'categoria': categoria_nombre
                    })
                # If it's already a dict (fallback)
                else:
                    transacciones_list.append({
                        'id': gasto_obj.get('id'),
                        'nombre': gasto_obj.get('concepto', 'Gasto sin descripción'),
                        'monto': float(gasto_obj.get('monto', 0)),
                        'fecha': gasto_obj.get('fecha'),
                        'tipo': 'gasto',
                        'categoria': gasto_obj.get('categoria_nombre', 'Sin categoría')
                    })

        # Agregar ingresos
        if 'ingresos' in transacciones_dict:
            for ingreso_obj in transacciones_dict['ingresos']:
                # If it's an Ingreso object, access attributes directly
                if hasattr(ingreso_obj, 'id'):
                    categoria_nombre = ingreso_obj.categoria.nombre if ingreso_obj.categoria else 'Sin categoría'
                    transacciones_list.append({
                        'id': ingreso_obj.id,
                        'nombre': ingreso_obj.concepto or 'Ingreso sin descripción',
                        'monto': float(ingreso_obj.monto),
                        'fecha': ingreso_obj.fecha.isoformat() if hasattr(ingreso_obj.fecha, 'isoformat') else str(ingreso_obj.fecha),
                        'tipo': 'ingreso',
                        'categoria': categoria_nombre
                    })
                # If it's already a dict (fallback)
                else:
                    transacciones_list.append({
                        'id': ingreso_obj.get('id'),
                        'nombre': ingreso_obj.get('concepto', 'Ingreso sin descripción'),
                        'monto': float(ingreso_obj.get('monto', 0)),
                        'fecha': ingreso_obj.get('fecha'),
                        'tipo': 'ingreso',
                        'categoria': ingreso_obj.get('categoria_nombre', 'Sin categoría')
                    })

        # Ordenar por fecha (más recientes primero) y limitar a 5
        transacciones_list.sort(key=lambda x: x.get('fecha', ''), reverse=True)

        return transacciones_list[:5]  # Return only the 5 most recent transactions
    
    def _ensure_float_values(self, data):
        """Recursively converts all Decimal values to float to avoid type mixing"""
        from decimal import Decimal
        
        if isinstance(data, list):
            return [self._ensure_float_values(item) for item in data]
        elif isinstance(data, dict):
            return {key: self._ensure_float_values(value) for key, value in data.items()}
        elif isinstance(data, Decimal):
            return float(data)
        else:
            return data

    def _get_rachas_usuario(self, user_id: int) -> Dict[str, Any]:
        """Obtiene y actualiza las rachas del usuario"""
        try:
            # Actualizar rachas al obtener datos del dashboard
            racha_registro = self.racha_repo.actualizar_racha_registro(user_id)
            racha_ahorro = self.racha_repo.actualizar_racha_ahorro(user_id)
            racha_objetivos = self.racha_repo.actualizar_racha_objetivos(user_id)

            # Determinar cuál es la racha principal (la más alta)
            rachas = [
                ('registro', racha_registro.racha_actual),
                ('ahorro', racha_ahorro.racha_actual),
                ('objetivos', racha_objetivos.racha_actual)
            ]

            # Encontrar la racha más alta
            tipo_racha_actual = max(rachas, key=lambda x: x[1])[0]
            mejor_racha_general = max(
                racha_registro.mejor_racha,
                racha_ahorro.mejor_racha,
                racha_objetivos.mejor_racha
            )

            return {
                'registroDiario': racha_registro.racha_actual,
                'ahorro': racha_ahorro.racha_actual,
                'objetivos': racha_objetivos.racha_actual,
                'ultimoRegistro': racha_registro.ultimo_registro.isoformat() if racha_registro.ultimo_registro else date.today().isoformat(),
                'mejorRacha': mejor_racha_general,
                'tipoRachaActual': tipo_racha_actual
            }

        except Exception as e:
            logger.error(f"Error getting user streaks: {str(e)}")
            # Fallback a valores por defecto en caso de error
            return {
                'registroDiario': 1,
                'ahorro': 1,
                'objetivos': 1,
                'ultimoRegistro': date.today().isoformat(),
                'mejorRacha': 1,
                'tipoRachaActual': 'registro'
            }


class FacturaService(BaseFinancialService):
    """Servicio para gestión de facturas"""
    
    def __init__(self):
        super().__init__()
        from models.financial_repository import FacturaRepository, TipoFacturaRepository, EstadoFacturaRepository
        self.factura_repo = FacturaRepository()
        self.tipo_factura_repo = TipoFacturaRepository()
        self.estado_factura_repo = EstadoFacturaRepository()
    
    def get_facturas(self, user_id: int, filtro_estado: str = 'all') -> List[Factura]:
        """Obtiene facturas del usuario con filtro opcional"""
        try:
            facturas = self.factura_repo.find_by_user(user_id)
            
            # Aplicar filtro de estado
            if filtro_estado and filtro_estado != 'all':
                estado_map = {
                    'pending': 'Pendiente',
                    'paid': 'Pagada', 
                    'overdue': 'Vencida'
                }
                if filtro_estado in estado_map:
                    estado_filtro = estado_map[filtro_estado]
                    facturas = [f for f in facturas if f.estado == estado_filtro]
            
            # Actualizar estados vencidos
            for factura in facturas:
                if factura.esta_vencida and factura.estado == 'Pendiente':
                    factura.estado = 'Vencida'
                    self.factura_repo.update(factura)
            
            return facturas
            
        except Exception as e:
            # Modificación para ver el error completo en la consola del servidor
            logger.error(
                f"💥 ERROR DETALLADO EN GET_FACTURAS para user_id {user_id}:", 
                exc_info=True
            )
            # Re-lanzamos la excepción para que el servidor responda con un error 500
            # y podamos ver el traceback completo.
            raise
    
    def crear_factura(self, user_id: int, data: Dict[str, Any]) -> Factura:
        """Crea una nueva factura"""
        try:
            factura = Factura(
                user_id=user_id,
                nombre=data.get('nombre', ''),
                tipo_factura_id=data.get('tipo_factura_id'),
                monto=Decimal(str(data.get('monto', 0))),
                fecha_vencimiento=datetime.strptime(data.get('fechaVencimiento'), '%Y-%m-%d').date(),
                descripcion=data.get('descripcion', ''),
                logo_url=data.get('logoUrl', ''),
                es_recurrente=data.get('esRecurrente', False),
                frecuencia_dias=data.get('frecuenciaDias', None)
            )
            
            # Validaciones
            if not factura.nombre:
                raise ValueError("Bill name is required")
            if factura.monto <= 0:
                raise ValueError("Amount must be greater than 0")
            
            factura = self.factura_repo.create(factura)
            audit_log(f"Created bill {factura.id} for user {user_id}")
            # Obtenemos los datos completos para devolver al frontend
            factura.tipo_factura = TipoFacturaRepository().find_by_id(factura.tipo_factura_id)
            return factura
            
        except Exception as e:
            logger.error(f"Error creating bill: {str(e)}")
            raise
    
    def marcar_como_pagada(self, user_id: int, factura_id: int) -> bool:
        """Marca una factura como pagada"""
        try:
            factura = self.factura_repo.find_by_id(factura_id)
            if not factura or factura.user_id != user_id:
                raise ValueError("Bill not found or unauthorized")
            
            if factura.estado == 'Pagada':
                return True  # Ya está pagada
            
            factura.marcar_como_pagada()
            self.factura_repo.update(factura)
            audit_log(f"Marked bill {factura_id} as paid for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking bill as paid: {str(e)}")
            raise
    
    def get_resumen_facturas(self, user_id: int) -> Dict[str, Any]:
        """Obtiene resumen de facturas del usuario"""
        try:
            facturas = self.get_facturas(user_id)
            
            total_pendientes = sum(f.monto for f in facturas if f.estado == 'Pendiente')
            cantidad_pendientes = len([f for f in facturas if f.estado == 'Pendiente'])
            cantidad_vencidas = len([f for f in facturas if f.estado == 'Vencida'])
            
            return {
                'total_pendientes': float(total_pendientes),
                'cantidad_pendientes': cantidad_pendientes,
                'cantidad_vencidas': cantidad_vencidas,
                'total_facturas': len(facturas)
            }
            
        except Exception as e:
            logger.error(f"Error getting bills summary: {str(e)}")
            return {
                'total_pendientes': 0.0,
                'cantidad_pendientes': 0,
                'cantidad_vencidas': 0,
                'total_facturas': 0
            }

    def get_factura_by_id(self, factura_id: int, user_id: int) -> Optional[Factura]:
        """Obtiene una factura específica verificando que pertenezca al usuario"""
        audit_log(f"Getting bill {factura_id} for user {user_id}")

        try:
            facturas = self.factura_repo.find_by_user(user_id)
            for factura in facturas:
                if factura.id == factura_id:
                    return factura
            return None
        except Exception as e:
            logger.error(f"Error getting bill {factura_id}: {e}")
            return None

    def eliminar_factura(self, factura_id: int, user_id: int) -> bool:
        """Elimina una factura del usuario"""
        audit_log(f"Deleting bill {factura_id} for user {user_id}")

        try:
            # Verificar que la factura pertenece al usuario
            factura = self.get_factura_by_id(factura_id, user_id)
            if not factura:
                raise BusinessLogicError("Factura no encontrada o no pertenece al usuario")

            # Eliminar la factura
            success = self.factura_repo.delete(factura_id)

            if success:
                logger.info(f"Deleted bill {factura_id} for user {user_id}")
            else:
                logger.error(f"Failed to delete bill {factura_id} for user {user_id}")

            return success
        except Exception as e:
            logger.error(f"Error deleting bill {factura_id}: {e}")
            return False

    def get_tipos_factura(self) -> List[TipoFactura]:
        """Obtiene todos los tipos de factura disponibles"""
        try:
            return self.tipo_factura_repo.find_active_ordered()
        except Exception as e:
            logger.error(f"Error getting bill types: {str(e)}")
            return []

    def get_estados_factura(self) -> List[EstadoFactura]:
        """Obtiene todos los estados de factura disponibles"""
        try:
            return self.estado_factura_repo.find_active_ordered()
        except Exception as e:
            logger.error(f"Error getting bill statuses: {str(e)}")
            return []


# Instancias globales de servicios
categoria_service = CategoriaService()
ingreso_service = IngresoService()
gasto_service = GastoService()
objetivo_service = ObjetivoService()
dashboard_service = DashboardService()
factura_service = FacturaService()