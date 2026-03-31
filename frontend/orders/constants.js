export const ORDER_COLUMNS = [
  { status: 'NEW_ORDER', title: 'Novo Pedido', accent: '#E67E22', bg: '#FEF5EC', border: '#FADCB8' },
  { status: 'IN_PICKING', title: 'Em Separação', accent: '#2980B9', bg: '#EBF5FB', border: '#B8DAEF' },
  { status: 'WAITING_COURIER', title: 'Aguardando Entregador', accent: '#8E44AD', bg: '#F5EEF8', border: '#D7BDE2' },
  { status: 'OUT_FOR_DELIVERY', title: 'Saiu para Entrega', accent: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  { status: 'COMPLETED', title: 'Finalizado', accent: '#7F8C8D', bg: '#F2F3F4', border: '#D5D8DC' },
];

export function getColumnByStatus(status) {
  return ORDER_COLUMNS.find((column) => column.status === status) || ORDER_COLUMNS[0];
}
