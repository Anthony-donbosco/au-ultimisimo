// Archivo: src/services/productoService.ts (Versión Corregida)
import { apiClient } from '../config/api'; // Asegúrate que la ruta a tu apiClient sea correcta

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_venta: number;
  stock: number;
  imagen_url?: string;
  es_activo: 1 | 0;
}

export type CrearProductoRequest = Omit<Producto, 'id' | 'empresa_id' | 'es_activo'>;
export type RegistrarVentaRequest = {
  producto_id: number;
  cantidad: number;
  notas?: string;
};

export const productoService = {
  // --- Funciones para la EMPRESA ---
  getProductosByEmpresa: async (): Promise<Producto[]> => {
    // Se añade /api al inicio de la ruta
    const response = await apiClient.get('/api/productos/empresa');
    return response.data.productos;
  },

  crearProducto: async (datosProducto: CrearProductoRequest): Promise<Producto> => {
    // Se añade /api al inicio de la ruta
    const response = await apiClient.post('/api/productos/empresa', datosProducto);
    return response.data.producto;
  },

  eliminarProducto: async (productoId: number): Promise<void> => {
    const response = await apiClient.delete(`/api/productos/empresa/${productoId}`);
    return response.data;
  },

  // --- Funciones para el EMPLEADO ---
  getProductosParaVenta: async (): Promise<Producto[]> => {
    // Se añade /api al inicio de la ruta
    const response = await apiClient.get('/api/productos/empleado');
    return response.data.productos;
  },

  registrarVenta: async (datosVenta: RegistrarVentaRequest): Promise<{ success: boolean; message: string }> => {
    // Se añade /api al inicio de la ruta
    const response = await apiClient.post('/api/productos/ventas', datosVenta);
    return response.data;
  }
};