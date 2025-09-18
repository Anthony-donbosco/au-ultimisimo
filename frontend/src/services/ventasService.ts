import { apiService } from './api';
import { getErrorMessage } from '../utils/networkUtils';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface Venta {
  id: number;
  empleado_id: number;
  empresa_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  fecha_venta: string;
  notas?: string;
  // Información del producto
  producto_nombre: string;
  producto_sku?: string;
  // Información del empleado
  empleado_nombre?: string;
  empleado_email?: string;
}

export interface VentaResumen {
  totalVentas: number;
  montoTotal: number;
  ventasHoy: number;
  montoHoy: number;
  ventasSemana: number;
  montoSemana: number;
  ventasMes: number;
  montoMes: number;
}

class VentasService {
  // Para empleados - ver sus propias ventas
  async getVentasEmpleado(filtros?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    producto_id?: number;
  }): Promise<Venta[]> {
    try {
      const params = new URLSearchParams();
      if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      if (filtros?.producto_id) params.append('producto_id', filtros.producto_id.toString());

      const response = await apiService.get<ApiResponse<{ ventas: Venta[] }>>(`/empleado/ventas?${params.toString()}`);
      return response.data.ventas || [];
    } catch (error) {
      console.error('Error obteniendo ventas del empleado:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Para empleados - resumen de sus ventas
  async getResumenVentasEmpleado(): Promise<VentaResumen> {
    try {
      const response = await apiService.get<ApiResponse<VentaResumen>>('/empleado/ventas/resumen');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo resumen de ventas del empleado:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Para empresas - ver ventas de todos sus empleados
  async getVentasEmpresa(filtros?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    empleado_id?: number;
    producto_id?: number;
  }): Promise<Venta[]> {
    try {
      const params = new URLSearchParams();
      if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      if (filtros?.empleado_id) params.append('empleado_id', filtros.empleado_id.toString());
      if (filtros?.producto_id) params.append('producto_id', filtros.producto_id.toString());

      const response = await apiService.get<ApiResponse<{ ventas: Venta[] }>>(`/empresa/ventas?${params.toString()}`);
      return response.data.ventas || [];
    } catch (error) {
      console.error('Error obteniendo ventas de la empresa:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Para empresas - resumen de ventas de todos los empleados
  async getResumenVentasEmpresa(): Promise<VentaResumen & {
    ventasPorEmpleado: Array<{
      empleado_id: number;
      empleado_nombre: string;
      total_ventas: number;
      monto_total: number;
    }>;
  }> {
    try {
      const response = await apiService.get<ApiResponse<VentaResumen & {
        ventasPorEmpleado: Array<{
          empleado_id: number;
          empleado_nombre: string;
          total_ventas: number;
          monto_total: number;
        }>;
      }>>('/empresa/ventas/resumen');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo resumen de ventas de la empresa:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Para empresas - eliminar una venta de empleado
  async eliminarVentaEmpleado(ventaId: number): Promise<void> {
    try {
      await apiService.delete(`/empresa/ventas/${ventaId}`);
    } catch (error) {
      console.error('Error eliminando venta:', error);
      throw new Error(getErrorMessage(error));
    }
  }
}

export const ventasService = new VentasService();