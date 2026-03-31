export const ORDER_COLUMNS = [
  { status: 'NEW_ORDER', title: 'Novo Pedido', accent: '#404E5C' },
  { status: 'IN_PICKING', title: 'Em Separação', accent: '#4B5C6D' },
  { status: 'WAITING_COURIER', title: 'Aguardando Entregador', accent: '#566B7D' },
  { status: 'OUT_FOR_DELIVERY', title: 'Saiu para Entrega', accent: '#5D7387' },
  { status: 'COMPLETED', title: 'Finalizado', accent: '#647A90' },
];

export function getColumnByStatus(status) {
  return ORDER_COLUMNS.find((column) => column.status === status) || ORDER_COLUMNS[0];
}

