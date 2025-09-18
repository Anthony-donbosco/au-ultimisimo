# Nuevo archivo: services/producto_service.py

import logging
from typing import Dict, Any, Tuple, Optional, List
from models.producto_repository import ProductoRepository
from models.user import User

logger = logging.getLogger(__name__)

class ProductoService:
    def get_productos_empresa(self, empresa_id: int) -> List[Dict[str, Any]]:
        """Obtiene la lista de productos para una empresa."""
        try:
            return ProductoRepository.get_productos_by_empresa(empresa_id)
        except Exception as e:
            logger.error(f"Error obteniendo productos para empresa {empresa_id}: {e}")
            return []

    def crear_producto(self, empresa_id: int, data: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Crea un nuevo producto."""
        if not all(k in data for k in ['nombre', 'precio_venta']):
            return False, "Nombre y precio son requeridos", None
        
        try:
            producto_id = ProductoRepository.crear_producto(empresa_id, data)
            producto_creado = {**data, 'id': producto_id, 'empresa_id': empresa_id}
            return True, "Producto creado exitosamente", producto_creado
        except Exception as e:
            logger.error(f"Error creando producto: {e}")
            return False, "Error interno al crear el producto", None

    def eliminar_producto(self, producto_id: int, empresa_id: int):
        """
        Llama al repositorio para eliminar un producto y retorna un mensaje.
        """
        try:
            success = ProductoRepository.eliminar_producto(producto_id, empresa_id)
            if success:
                return True, "Producto eliminado correctamente."
            else:
                return False, "El producto no existe o no tienes permisos para eliminarlo."
        except Exception as e:
            # Puedes registrar el error si lo necesitas: logging.error(f"...")
            return False, f"Ocurrió un error al eliminar el producto: {e}"

    def registrar_venta(self, empleado_id: int, data: Dict[str, Any]) -> Tuple[bool, str, None]:
        """Registra una venta realizada por un empleado."""
        if not all(k in data for k in ['producto_id', 'cantidad']):
            return False, "ID de producto y cantidad son requeridos", None

        try:
            empleado = User.find_by_id(empleado_id)
            if not empleado or not empleado.created_by_empresa_id:
                return False, "Empleado no asociado a una empresa", None

            producto = ProductoRepository.find_producto_by_id(data['producto_id'])
            if not producto or producto['empresa_id'] != empleado.created_by_empresa_id:
                return False, "Producto no válido o no pertenece a la empresa", None
            
            cantidad = int(data['cantidad'])
            if cantidad <= 0:
                return False, "La cantidad debe ser mayor a cero", None

            if producto['stock'] < cantidad:
                return False, f"Stock insuficiente. Disponible: {producto['stock']}", None

            venta_data = {
                'empleado_id': empleado_id,
                'empresa_id': empleado.created_by_empresa_id,
                'producto_id': producto['id'],
                'cantidad': cantidad,
                'precio_unitario': producto['precio_venta'],
                'monto_total': float(producto['precio_venta']) * cantidad,
                'notas': data.get('notas')
            }

            ProductoRepository.registrar_venta_y_actualizar_stock(venta_data)
            return True, "Venta registrada exitosamente", None

        except Exception as e:
            logger.error(f"Error registrando venta: {e}")
            return False, "Error interno al registrar la venta", None

producto_service = ProductoService()