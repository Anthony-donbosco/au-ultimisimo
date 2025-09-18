# Nuevo archivo: models/producto_repository.py

from utils.database import get_db
from typing import List, Dict, Any, Optional

class ProductoRepository:
    @staticmethod
    def get_productos_by_empresa(empresa_id: int) -> List[Dict[str, Any]]:
        """Obtiene todos los productos de una empresa."""
        db = get_db()
        query = "SELECT id, nombre, descripcion, precio_venta, stock, imagen_url, es_activo FROM productos WHERE empresa_id = %s AND es_activo = 1 ORDER BY nombre ASC"
        return db.fetch_all(query, (empresa_id,))

    @staticmethod
    def crear_producto(empresa_id: int, data: Dict[str, Any]) -> int:
        """Crea un nuevo producto para una empresa."""
        db = get_db()
        query = """
            INSERT INTO productos (empresa_id, nombre, descripcion, precio_venta, sku, stock, imagen_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            empresa_id,
            data['nombre'],
            data.get('descripcion'),
            data['precio_venta'],
            data.get('sku'),
            data.get('stock', 0),
            data.get('imagen_url')
        )
        with db.get_db_cursor() as (cursor, connection):
            cursor.execute(query, params)
            producto_id = cursor.lastrowid
            connection.commit()
        return producto_id

    @staticmethod
    def find_producto_by_id(producto_id: int) -> Optional[Dict[str, Any]]:
        """Busca un producto por su ID."""
        db = get_db()
        query = "SELECT * FROM productos WHERE id = %s"
        return db.fetch_one(query, (producto_id,))

    @staticmethod
    def eliminar_producto(producto_id: int, empresa_id: int) -> bool:
        """Elimina un producto permanentemente (hard delete) verificando que pertenece a la empresa."""
        db = get_db()
        query = "DELETE FROM productos WHERE id = %s AND empresa_id = %s"
        params = (producto_id, empresa_id)
        with db.get_db_cursor() as (cursor, connection):
            cursor.execute(query, params)
            connection.commit()
            # rowcount > 0 significa que una fila fue afectada (y por tanto, eliminada)
            return cursor.rowcount > 0

    @staticmethod
    def registrar_venta_y_actualizar_stock(venta_data: Dict[str, Any]):
        """Registra una venta y actualiza el stock en una transacción."""
        db = get_db()
        with db.get_db_cursor() as (cursor, connection):
            # 1. Insertar la venta
            insert_venta_query = """
                INSERT INTO ventas (empleado_id, empresa_id, producto_id, cantidad, precio_unitario, monto_total, notas)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_venta_query, (
                venta_data['empleado_id'],
                venta_data['empresa_id'],
                venta_data['producto_id'],
                venta_data['cantidad'],
                venta_data['precio_unitario'],
                venta_data['monto_total'],
                venta_data.get('notas')
            ))

            # 2. Actualizar el stock del producto
            update_stock_query = "UPDATE productos SET stock = stock - %s WHERE id = %s"
            cursor.execute(update_stock_query, (venta_data['cantidad'], venta_data['producto_id']))
            
            connection.commit()