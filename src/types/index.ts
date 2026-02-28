// ─── Auth ────────────────────────────────────────────────────
export type UserRole = 'admin' | 'operario' | 'facturacion';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Ciudades ────────────────────────────────────────────────
export interface Ciudad {
  id: number;
  nombre: string;
  departamento: string;
}

// ─── Pedidos ─────────────────────────────────────────────────
export type PedidoEstado =
  | 'REGISTRADO'
  | 'TRILLADO'
  | 'MAQUILA'
  | 'TOSTION'
  | 'PRODUCCION'
  | 'FACTURACION'
  | 'LISTO_PARA_ENTREGA'
  | 'ENTREGADO';

export type TipoCodigo = 'RPM' | 'MPU';
export type PresentacionDetalle = 'CPS' | 'EXCELSO' | 'HONEY' | 'NATURAL';
export type Presentacion = 'CPS' | 'EXCELSO';
export type FormaEntrega = 'A_GRANEL' | 'EMPACADO';

export interface PedidoDetalle {
  id: string;
  presentacion: PresentacionDetalle;
  variedad: string;
  kilos: number;
}

export interface Cliente {
  id: string;
  name: string;
  documentId: string;
  address: string;
  phone: string;
  email: string;
  ciudad?: Ciudad | null;
}

export interface Pedido {
  id: string;
  code: string;
  tipoCodigo?: TipoCodigo | null;
  numeroCodigo?: number | null;
  kilos: number;
  presentacion: Presentacion | null;
  formaEntrega: FormaEntrega;
  detalleEmpaque: string | null;
  diaEntrega: string;
  estado: PedidoEstado;
  client: Cliente;
  detalles?: PedidoDetalle[];
  createdAt: string;
  updatedAt: string;
}

// ─── Trillado ─────────────────────────────────────────────────
export interface Trillado {
  id: string;
  fechaIngreso: string;
  kilosEntrada: number | null;
  kilosSalida: number | null;
  merma: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  fechaEntregaTostion: string | null;
  auditoria: Record<string, unknown> | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client'>;
  createdAt: string;
}

export interface Tostion {
  id: string;
  fechaIngreso: string;
  kilosExcelso: number | null;
  kilosTostados: number | null;
  baches: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  fechaEntregaProduccion: string | null;
  auditoria: Record<string, unknown> | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client'>;
  createdAt: string;
}

// ─── Producción ──────────────────────────────────────────────
export interface Produccion {
  id: string;
  kilosRecibidos: number | null;
  fechaProcesamiento: string;
  proceso: string;
  empaque: string;
  entregaFinal: string;
  fechaNotificacionFacturacion: string | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client' | 'detalleEmpaque' | 'formaEntrega' | 'diaEntrega'>;
  createdAt: string;
}

// ─── Facturas ────────────────────────────────────────────────
export type EstadoEntrega = 'PENDIENTE_ENTREGA' | 'LISTO_PARA_ENTREGA' | 'ENTREGADO';

export interface Factura {
  id: string;
  numero: string;
  fecha: string;
  valorTotal: number;
  estadoEntrega: EstadoEntrega;
  fechaConfirmacionEntrega: string | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client'>;
  createdAt: string;
}

// ─── UI helpers ──────────────────────────────────────────────
export type SortDirection = 'asc' | 'desc';
