"""
Modelos base para el sistema financiero - Enterprise Architecture
Desarrollado con 100 años de experiencia 🔥
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import json


class EntityStatus(Enum):
    """Estados comunes para entidades del sistema"""
    ACTIVE = "activo"
    INACTIVE = "inactivo"
    DELETED = "eliminado"
    PENDING = "pendiente"


@dataclass
class BaseEntity:
    """Clase base para todas las entidades del sistema"""
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convierte la entidad a diccionario para JSON, transformando claves a camelCase.
        Este es el cambio clave para que el frontend reciba los datos como los espera.
        """
        
        def to_camel_case(snake_str: str) -> str:
            # Divide la cadena por guiones bajos
            components = snake_str.split('_')
            # La primera parte se queda como está, el resto se capitaliza
            return components[0] + ''.join(x.title() for x in components[1:])

        result = {}
        for key, value in self.__dict__.items():
            # No procesar atributos privados o que no deban ser serializados
            if key.startswith('_'):
                continue

            camel_key = to_camel_case(key)
            
            if isinstance(value, datetime) or isinstance(value, date):
                result[camel_key] = value.isoformat()
            elif isinstance(value, Decimal):
                result[camel_key] = float(value)
            elif isinstance(value, Enum):
                result[camel_key] = value.value
            # Si el valor es otro objeto que tiene su propio método to_dict, lo llamamos recursivamente
            elif hasattr(value, 'to_dict') and callable(value.to_dict):
                result[camel_key] = value.to_dict()
            # Si es una lista de objetos serializables
            elif isinstance(value, list) and value and hasattr(value[0], 'to_dict'):
                 result[camel_key] = [item.to_dict() for item in value]
            elif value is not None:
                result[camel_key] = value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Crea una instancia desde un diccionario"""
        valid_fields = {k: v for k, v in data.items() if hasattr(cls, k)}
        return cls(**valid_fields)


@dataclass
class AuditableEntity(BaseEntity):
    """Entidad base con auditoría completa"""
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool = True
    version: int = 1
    
    def mark_as_deleted(self, user_id: int):
        """Eliminación lógica"""
        self.is_active = False
        self.updated_by = user_id
        self.updated_at = datetime.now()


@dataclass
class UserOwnedEntity(AuditableEntity):
    """Entidad que pertenece a un usuario o empresa"""
    user_id: Optional[int] = None
    empresa_id: Optional[int] = None
    
    def validate_ownership(self):
        """Valida que tenga un propietario válido"""
        if not self.user_id and not self.empresa_id:
            raise ValueError("Entity must have either user_id or empresa_id")
        # Note: Employee expenses can have both user_id (employee) and empresa_id (company)
        # This is valid for approval workflows where an employee creates an expense for a company


@dataclass
class CatalogEntity(BaseEntity):
    """Entidad base para catálogos del sistema"""
    codigo: Optional[str] = None
    nombre: str = ""
    descripcion: Optional[str] = None
    es_activo: bool = True
    orden_visualizacion: int = 0

    def __post_init__(self):
        # Codigo is optional for some catalog entities (like tipos_factura)
        # that were created before this field was added
        if not self.nombre:
            raise ValueError("Nombre is required for catalog entities")


@dataclass
class MonetaryEntity(UserOwnedEntity):
    """Entidad base para movimientos monetarios"""
    concepto: str = ""
    descripcion: Optional[str] = None
    monto: Decimal = Decimal('0.00')
    fecha: Optional[date] = None
    numero_referencia: Optional[str] = None
    notas: Optional[str] = None
    adjunto_url: Optional[str] = None
    
    def __post_init__(self):
        if self.monto < 0:
            raise ValueError("Monto cannot be negative")
        if not self.concepto:
            raise ValueError("Concepto is required")
        if not self.fecha:
            self.fecha = date.today()


# ============================================================================
# MODELOS DE CATÁLOGOS
# ============================================================================

@dataclass
class TipoFactura(CatalogEntity):
    """Tipos de facturas/cuentas por pagar"""
    icono: Optional[str] = None

@dataclass
class EstadoFactura(CatalogEntity):
    """Estados de facturas: Pendiente, Pagada, Vencida"""
    color: Optional[str] = None  # Color hex para UI (#f59e0b)
    icono: Optional[str] = None  # Icono para UI (time-outline)
    orden: int = 0              # Orden para mostrar en UI

@dataclass
class TipoMovimiento(CatalogEntity):
    """Tipos de movimiento: ingreso, gasto, ambos"""
    pass


@dataclass
class TipoIngreso(CatalogEntity):
    """Tipos específicos de ingreso"""
    requiere_fuente: bool = True
    es_recurrente_default: bool = False


@dataclass
class TipoPago(CatalogEntity):
    """Métodos de pago disponibles"""
    icono: Optional[str] = None
    requiere_referencia: bool = False
    es_digital: bool = False


@dataclass
class EstadoAprobacion(CatalogEntity):
    """Estados de aprobación para gastos empresariales"""
    color: Optional[str] = None
    permite_edicion: bool = False
    es_final: bool = False


@dataclass
class EstadoGastoPlanificado(CatalogEntity):
    """Estados para gastos planificados"""
    color: Optional[str] = None
    permite_ejecucion: bool = False
    es_final: bool = False


@dataclass
class Prioridad(CatalogEntity):
    """Niveles de prioridad"""
    nivel_numerico: int = 1
    color: Optional[str] = None
    icono: Optional[str] = None


# ============================================================================
# MODELOS PRINCIPALES
# ============================================================================

@dataclass
class CategoriaMovimiento(UserOwnedEntity):
    """Categorías para ingresos y gastos"""
    tipo_movimiento_id: int = 0
    nombre: str = ""
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None
    es_predeterminada: bool = False
    orden_visualizacion: int = 0
    
    # Relaciones (se cargan bajo demanda)
    tipo_movimiento: Optional[TipoMovimiento] = field(default=None, repr=False)
    
    def __post_init__(self):
        if not self.nombre:
            raise ValueError("Nombre is required for categories")


@dataclass
class Ingreso(MonetaryEntity):
    """Registro de ingresos"""
    categoria_id: int = 0
    tipo_ingreso_id: int = 0
    fuente: str = ""
    
    # Campos de recurrencia
    es_recurrente: bool = False
    frecuencia_dias: Optional[int] = None
    proximo_ingreso: Optional[date] = None
    
    # Relaciones
    categoria: Optional[CategoriaMovimiento] = field(default=None, repr=False)
    tipo_ingreso: Optional[TipoIngreso] = field(default=None, repr=False)
    
    def __post_init__(self):
        super().__post_init__()
        if not self.fuente:
            raise ValueError("Fuente is required for income")
        if self.es_recurrente and not self.frecuencia_dias:
            raise ValueError("Frecuencia_dias is required for recurring income")


@dataclass
class GastoPlanificado(MonetaryEntity):
    """Gastos planificados/presupuestados"""
    categoria_id: int = 0
    tipo_pago_id: Optional[int] = None
    prioridad_id: int = 0
    estado_id: int = 0
    monto_estimado: Decimal = Decimal('0.00')
    fecha_planificada: Optional[date] = None
    fecha_limite: Optional[date] = None
    
    # Campos de recurrencia
    es_recurrente: bool = False
    frecuencia_dias: Optional[int] = None
    proximo_gasto: Optional[date] = None
    fecha_fin_recurrencia: Optional[date] = None
    
    # Información adicional
    proveedor: Optional[str] = None
    notificar_dias_antes: int = 1
    ultima_notificacion: Optional[datetime] = None
    
    # Relaciones
    categoria: Optional[CategoriaMovimiento] = field(default=None, repr=False)
    tipo_pago: Optional[TipoPago] = field(default=None, repr=False)
    prioridad: Optional[Prioridad] = field(default=None, repr=False)
    estado: Optional[EstadoGastoPlanificado] = field(default=None, repr=False)
    
    def __post_init__(self):
        super().__post_init__()
        self.monto = self.monto_estimado  # Heredar de MonetaryEntity
        if not self.fecha_planificada:
            self.fecha_planificada = date.today()
        self.fecha = self.fecha_planificada  # Para compatibilidad con base


@dataclass
class Gasto(MonetaryEntity):
    """Registro de gastos reales"""
    categoria_id: int = 0
    tipo_pago_id: int = 0
    estado_aprobacion_id: int = 2  # Default: aprobado
    
    # Información del gasto
    proveedor: Optional[str] = None
    ubicacion: Optional[str] = None
    
    # Clasificaciones
    es_deducible: bool = False
    es_planificado: bool = False
    gasto_planificado_id: Optional[int] = None
    
    # Aprobaciones empresariales
    requiere_aprobacion: bool = False
    aprobado_por: Optional[int] = None
    fecha_aprobacion: Optional[datetime] = None
    
    # Relaciones
    categoria: Optional[CategoriaMovimiento] = field(default=None, repr=False)
    tipo_pago: Optional[TipoPago] = field(default=None, repr=False)
    estado_aprobacion: Optional[EstadoAprobacion] = field(default=None, repr=False)
    gasto_planificado: Optional[GastoPlanificado] = field(default=None, repr=False)
    
    def aprobar(self, aprobado_por_id: int):
        """Aprobar el gasto"""
        self.aprobado_por = aprobado_por_id
        self.fecha_aprobacion = datetime.now()
        self.estado_aprobacion_id = 2  # Aprobado
    
    def rechazar(self, rechazado_por_id: int):
        """Rechazar el gasto"""
        self.aprobado_por = rechazado_por_id
        self.fecha_aprobacion = datetime.now()
        self.estado_aprobacion_id = 3  # Rechazado


@dataclass
class Objetivo(UserOwnedEntity):
    """Objetivos financieros"""
    nombre: str = ""
    descripcion: Optional[str] = None
    meta_total: Decimal = Decimal('0.00')
    ahorro_actual: Decimal = Decimal('0.00')
    fecha_limite: Optional[date] = None
    prioridad_id: int = 3  # Media por defecto
    categoria: Optional[str] = None
    es_activo: bool = True  # Campo para compatibilidad con BD
    
    # Relaciones
    prioridad: Optional[Prioridad] = field(default=None, repr=False)
    movimientos: List['ObjetivoMovimiento'] = field(default_factory=list, repr=False)
    
    @property
    def progreso_porcentaje(self) -> float:
        """Calcula el porcentaje de progreso"""
        if self.meta_total <= 0:
            return 0.0
        return min(100.0, (float(self.ahorro_actual) / float(self.meta_total)) * 100)
    
    @property
    def monto_restante(self) -> Decimal:
        """Calcula cuánto falta para completar el objetivo"""
        return max(Decimal('0.00'), self.meta_total - self.ahorro_actual)
    
    def agregar_ahorro(self, monto: Decimal, descripcion: str = ""):
        """Agregar dinero al objetivo"""
        if monto <= 0:
            raise ValueError("Amount must be positive")
        self.ahorro_actual += monto
        # El movimiento se crea en el servicio
    
    def retirar_ahorro(self, monto: Decimal, descripcion: str = ""):
        """Retirar dinero del objetivo"""
        if monto <= 0:
            raise ValueError("Amount must be positive")
        if monto > self.ahorro_actual:
            raise ValueError("Insufficient funds")
        self.ahorro_actual -= monto


@dataclass
class ObjetivoMovimiento(BaseEntity):
    """Movimientos de dinero en objetivos"""
    objetivo_id: int = 0
    monto: Decimal = Decimal('0.00')
    es_aporte: bool = True  # True=aporte, False=retiro
    descripcion: Optional[str] = None
    
    # Relaciones
    objetivo: Optional[Objetivo] = field(default=None, repr=False)


@dataclass
class Factura(UserOwnedEntity):
    """Facturas y cuentas por pagar"""
    nombre: str = ""
    # MODIFICADO: De 'tipo' a 'tipo_factura_id' y se añade la relación
    tipo_factura_id: int = 0
    monto: Decimal = Decimal('0.00')
    fecha_vencimiento: date = field(default_factory=date.today)
    estado_factura_id: int = 1  # 1=Pendiente, 2=Pagada, 3=Vencida
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    ultimo_pago: Optional[date] = None
    es_recurrente: bool = False
    frecuencia_dias: Optional[int] = None

    # NUEVO: Campos para las relaciones
    tipo_factura: Optional[TipoFactura] = field(default=None, repr=False)
    estado_factura: Optional[EstadoFactura] = field(default=None, repr=False)
    
    @property
    def esta_vencida(self) -> bool:
        """Verifica si la factura está vencida"""
        return self.fecha_vencimiento < date.today() and self.estado_factura_id == 1  # 1 = Pendiente
    
    @property
    def dias_para_vencimiento(self) -> int:
        """Días hasta el vencimiento (negativo si ya venció)"""
        return (self.fecha_vencimiento - date.today()).days
    
    def marcar_como_pagada(self, fecha_pago: Optional[date] = None):
        """Marcar factura como pagada"""
        self.estado_factura_id = 2  # 2 = Pagada
        self.ultimo_pago = fecha_pago or date.today()

    @property
    def estado(self) -> str:
        """Retorna el estado como string para compatibilidad con frontend"""
        estados = {1: "Pendiente", 2: "Pagada", 3: "Vencida"}
        return estados.get(self.estado_factura_id, "Pendiente")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Crea una instancia desde un diccionario, excluyendo la columna estado legacy"""
        # Excluir la columna 'estado' legacy para evitar conflictos
        filtered_data = {k: v for k, v in data.items()
                        if k != 'estado' and hasattr(cls, k)}
        return cls(**filtered_data)

    def to_dict(self) -> Dict[str, Any]:
        """Override para incluir la propiedad estado calculada"""
        result = super().to_dict()
        # Agregar la propiedad estado para el frontend
        result['estado'] = self.estado
        return result


@dataclass
class Presupuesto(UserOwnedEntity):
    """Presupuestos mensuales por categoría"""
    categoria_id: int = 0
    limite_mensual: Decimal = Decimal('0.00')
    mes: int = 0
    año: int = 0
    gastado_actual: Decimal = Decimal('0.00')
    
    # Relaciones
    categoria: Optional[CategoriaMovimiento] = field(default=None, repr=False)
    
    @property
    def porcentaje_usado(self) -> float:
        """Porcentaje del presupuesto usado"""
        if self.limite_mensual <= 0:
            return 0.0
        return min(100.0, (float(self.gastado_actual) / float(self.limite_mensual)) * 100)
    
    @property
    def monto_disponible(self) -> Decimal:
        """Monto disponible en el presupuesto"""
        return max(Decimal('0.00'), self.limite_mensual - self.gastado_actual)
    
    @property
    def esta_excedido(self) -> bool:
        """Verifica si se excedió el presupuesto"""
        return self.gastado_actual > self.limite_mensual


@dataclass
class RachaUsuario(BaseEntity):
    """Sistema de rachas para gamificación"""
    user_id: int = 0
    tipo_racha: str = ""  # 'registro', 'ahorro', 'objetivos'
    racha_actual: int = 0
    mejor_racha: int = 0
    ultimo_registro: Optional[date] = None
    ultimo_logro: Optional[date] = None
    
    def incrementar_racha(self):
        """Incrementa la racha actual"""
        self.racha_actual += 1
        if self.racha_actual > self.mejor_racha:
            self.mejor_racha = self.racha_actual
        self.ultimo_registro = date.today()
    
    def romper_racha(self):
        """Rompe la racha actual"""
        self.racha_actual = 0
        self.ultimo_registro = date.today()


@dataclass
class Notificacion(BaseEntity):
    """Sistema de notificaciones"""
    user_id: int = 0
    tipo: str = ""
    titulo: str = ""
    mensaje: str = ""
    leida: bool = False
    fecha_envio: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        self.leida = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Override para manejar metadata JSON"""
        result = super().to_dict()
        if self.metadata:
            result['metadata'] = json.dumps(self.metadata)
        return result