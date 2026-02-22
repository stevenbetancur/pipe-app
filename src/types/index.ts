// ─── Auth ────────────────────────────────────────────────────
export type UserRole = 'admin' | 'operario' | 'facturacion';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Pedidos ─────────────────────────────────────────────────
export type PedidoEstado =
  | 'REGISTRADO'
  | 'MAQUILA'
  | 'TOSTION'
  | 'PRODUCCION'
  | 'FACTURACION'
  | 'LISTO_PARA_ENTREGA'
  | 'ENTREGADO';

export type Presentacion = 'CPS' | 'EXCELSO';
export type FormaEntrega = 'A_GRANEL' | 'EMPACADO';

export interface Cliente {
  id: string;
  name: string;
  documentId: string;
  address: string;
  phone: string;
  email: string;
}

export interface Pedido {
  id: string;
  code: string;
  kilos: number;
  presentacion: Presentacion;
  formaEntrega: FormaEntrega;
  detalleEmpaque: string | null;
  diaEntrega: string;
  estado: PedidoEstado;
  client: Cliente;
  createdAt: string;
  updatedAt: string;
}

// ─── Tostión ─────────────────────────────────────────────────
export interface Tostion {
  id: string;
  fechaIngreso: string;
  kilosExcelso: number | null;
  kilosTostados: number | null;
  fechaEntregaProduccion: string | null;
  auditoria: Record<string, unknown> | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client'>;
  createdAt: string;
}

// ─── Producción ──────────────────────────────────────────────
export interface Produccion {
  id: string;
  fechaProcesamiento: string;
  proceso: string;
  empaque: string;
  entregaFinal: string;
  fechaNotificacionFacturacion: string | null;
  pedido: Pick<Pedido, 'id' | 'code' | 'client' | 'detalleEmpaque'>;
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
