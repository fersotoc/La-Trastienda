
export type BusinessSource = 'Mentidero' | 'La Quietecita' | 'Boletópolis';
export type UserRole = 'Administrador' | 'Operativo';
export type UserStatus = 'Activo' | 'Inactivo';
export type TransactionType = 'ingreso' | 'egreso';
export type PaymentMethod = 'CREDITO' | 'DEBITO' | 'EFECTIVO' | 'OTRO';
export type LoadStatus = 'procesado' | 'error' | 'reemplazado';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
}

export interface LoadLog {
  id_carga: string;
  modulo: BusinessSource;
  fecha_operativa: string;
  nombre_archivo: string;
  origen: 'Google Drive' | 'manual';
  timestamp_carga: number;
  filas_leidas: number;
  filas_validas: number;
  filas_rechazadas: number;
  estado: LoadStatus;
  mensaje_error?: string;
}

export interface Transaction {
  id_transaccion: string;
  fecha_operativa: string;
  modulo: BusinessSource;
  tipo: TransactionType;
  metodo_pago: PaymentMethod;
  monto: number;
  descripcion: string;
  referencia?: string;
  id_carga: string;
}

export interface RestaurantCut {
  id_corte: string;
  fecha_operativa: string;
  efectivo_sistema: number;
  efectivo_contado: number;
  diferencia_efectivo: number;
  comentario_diferencia?: string;
  id_carga: string;
}

export interface QuietecitaPurchase {
  fecha_reporte: string;
  grupo: string;
  insumo: string;
  descripcion: string;
  unidad: string;
  cantidad_entrada: number;
  costo_unitario: number;
  monto_compra: number;
  origen_archivo: string;
  estatus: 'REGISTRADO' | 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'PAGADO' | 'ENTRADA_SIN_COSTO';
}

export interface QuietecitaCorteMaster {
  fecha_inicio_corte: string;
  fecha_fin_corte?: string;
  id_turno: string;
  total_ventas: number;
  total_credito: number | 'NO_DISPONIBLE';
  total_debito: number | 'NO_DISPONIBLE';
  total_efectivo: number | 'NO_DISPONIBLE';
  total_otros: number | 'NO_DISPONIBLE';
  origen_archivo: string;
}

export interface IngestionResult {
  transactions: Omit<Transaction, 'id_transaccion' | 'id_carga'>[];
  purchases?: QuietecitaPurchase[];
  cortesMaster?: QuietecitaCorteMaster[];
  cut?: Omit<RestaurantCut, 'id_corte' | 'id_carga'>;
  summary: string;
}

export interface BoletopolisTransaction {
  fecha: string;
  origen: string;
  categoria: string;
  concepto: string;
  importe: number;
  gestion: string;
  // New fields from Transacciones.xlsx
  funcion?: string;
  fecha_compra?: string;
  ingreso_organizador?: number;
  tipo_transaccion?: string;
  cantidad_boletos?: number;
}

/**
 * SaleRecord interface used for dashboard and history visualizations.
 * This represents a normalized view of a transaction for reporting purposes.
 */
export interface SaleRecord {
  id: string;
  date: string;
  amount: number;
  source: BusinessSource;
  category: string;
  description: string;
  timestamp: number;
  // Commercial console fields
  event?: string;
  income?: number;
  paymentType?: string;
  tickets?: number;
}
