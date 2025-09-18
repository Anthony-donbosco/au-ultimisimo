from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal

class EstadoTarea:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.codigo = data.get('codigo')
        self.nombre = data.get('nombre')
        self.descripcion = data.get('descripcion')
        self.color = data.get('color')
        self.icono = data.get('icono')
        self.es_final = bool(data.get('es_final', False))
        self.es_activo = bool(data.get('es_activo', True))
        self.orden_visualizacion = data.get('orden_visualizacion', 0)
        self.created_at = data.get('created_at')

class TareaAsignada:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.titulo = data.get('titulo')
        self.descripcion = data.get('descripcion')
        self.empresa_id = data.get('empresa_id')
        self.empleado_id = data.get('empleado_id')
        self.prioridad_id = data.get('prioridad_id')
        self.estado_id = data.get('estado_id')
        self.fecha_asignacion = data.get('fecha_asignacion')
        self.fecha_limite = data.get('fecha_limite')
        self.fecha_inicio = data.get('fecha_inicio')
        self.fecha_completada = data.get('fecha_completada')
        self.tiempo_estimado_horas = data.get('tiempo_estimado_horas')
        self.tiempo_real_horas = data.get('tiempo_real_horas')
        # self.categoria = data.get('categoria')
        self.ubicacion = data.get('ubicacion')
        self.requiere_aprobacion = bool(data.get('requiere_aprobacion', False))
        self.aprobada_por = data.get('aprobada_por')
        self.fecha_aprobacion = data.get('fecha_aprobacion')
        self.notas_empresa = data.get('notas_empresa')
        self.notas_empleado = data.get('notas_empleado')
        self.adjuntos_url = data.get('adjuntos_url')
        self.es_recurrente = bool(data.get('es_recurrente', False))
        self.frecuencia_dias = data.get('frecuencia_dias')
        self.proxima_tarea = data.get('proxima_tarea')
        self.asignada_por = data.get('asignada_por')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')


        self.categorias = data.get('categorias', [])

        self.ubicacion = data.get('ubicacion')

        # Campos adicionales para información relacionada
        self.empresa_nombre = data.get('empresa_nombre')
        self.empleado_nombre = data.get('empleado_nombre')
        self.prioridad_nombre = data.get('prioridad_nombre')
        self.prioridad_color = data.get('prioridad_color')
        self.estado_nombre = data.get('estado_nombre')
        self.estado_color = data.get('estado_color')
        self.estado_icono = data.get('estado_icono')
        self.asignada_por_nombre = data.get('asignada_por_nombre')

class TareaComentario:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.tarea_id = data.get('tarea_id')
        self.user_id = data.get('user_id')
        self.comentario = data.get('comentario')
        self.es_interno = bool(data.get('es_interno', False))
        self.adjunto_url = data.get('adjunto_url')
        self.created_at = data.get('created_at')

        # Campos adicionales
        self.user_nombre = data.get('user_nombre')

class TareaHistorial:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.tarea_id = data.get('tarea_id')
        self.estado_anterior_id = data.get('estado_anterior_id')
        self.estado_nuevo_id = data.get('estado_nuevo_id')
        self.changed_by = data.get('changed_by')
        self.motivo = data.get('motivo')
        self.created_at = data.get('created_at')

        # Campos adicionales
        self.estado_anterior_nombre = data.get('estado_anterior_nombre')
        self.estado_nuevo_nombre = data.get('estado_nuevo_nombre')
        self.changed_by_nombre = data.get('changed_by_nombre')

def to_dict(obj) -> Dict[str, Any]:
    """Convierte un objeto a diccionario, manejando tipos especiales"""
    result = {}
    for key, value in obj.__dict__.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat() if value else None
        elif isinstance(value, Decimal):
            result[key] = float(value) if value else None
        else:
            result[key] = value
    return result