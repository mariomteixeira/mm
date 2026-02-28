'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ORDER_COLUMNS, getColumnByStatus } from './constants.js';
import { businessConfig } from './business_config.js';
import { formatDateTime, formatElapsedHhMmSs } from './time.js';

const STATUS_TRANSITIONS = {
  NEW_ORDER: ['IN_PICKING'],
  IN_PICKING: ['WAITING_COURIER'],
  WAITING_COURIER: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
};

const SECTION_ORDER = ['Açougue', 'Padaria', 'Hortifruti', 'Produtos Gerais'];

const CATEGORY_KEYWORDS = {
  Açougue: [
    'carne',
    'patinho',
    'acem',
    'acem moido',
    'acém',
    'frango',
    'file',
    'filé',
    'bovina',
    'suina',
    'suína',
    'linguica',
    'linguiça',
    'costela',
    'contra file',
    'contrafile',
    'peito de frango',
  ],
  Padaria: [
    'pao',
    'pão',
    'frances',
    'francês',
    'nutrella',
    'queijo',
    'presunto',
    'peito de peru',
    'mussarela',
    'muçarela',
    'mortadela',
    'requeijao',
    'requeijão',
    'cremoso',
    'frios',
    'torrada',
    'biscoito',
    'bolo',
  ],
  Hortifruti: [
    'alface',
    'brocolis',
    'brócolis',
    'pepino',
    'tomate',
    'cebola',
    'alho',
    'beterraba',
    'inhame',
    'cenoura',
    'abobrinha',
    'abobora',
    'abóbora',
    'morango',
    'manga',
    'laranja',
    'mamao',
    'mamão',
    'banana',
    'maca',
    'maçã',
    'abacaxi',
    'melancia',
    'goiaba',
    'uva',
    'pera',
    'batata',
    'mandioca',
    'couve',
    'espinafre',
    'repolho',
    'pimentao',
    'pimentão',
    'papaya',
  ],
};

function canMoveStatus(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return false;
  return (STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

function formatPhoneForDisplay(value) {
  if (!value) return '-';
  const digits = String(value).replace(/\D+/g, '');
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  if (withoutCountry.length === 11) return `${withoutCountry.slice(0, 2)} ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  if (withoutCountry.length === 10) return `${withoutCountry.slice(0, 2)} ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`;
  return withoutCountry;
}

function categorizeItem(productName) {
  const normalized = String(productName ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  for (const section of SECTION_ORDER.slice(0, 3)) {
    if ((CATEGORY_KEYWORDS[section] || []).some((keyword) => normalized.includes(keyword))) {
      return section;
    }
  }

  return 'Produtos Gerais';
}

function groupItemsBySection(items) {
  const sections = new Map(SECTION_ORDER.map((section) => [section, []]));
  for (const item of items || []) {
    const section = categorizeItem(item.productName);
    sections.get(section).push(item);
  }
  return SECTION_ORDER.map((section) => ({ section, items: sections.get(section) || [] })).filter((entry) => entry.items.length > 0);
}

function runWithViewTransition(updateFn) {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
    updateFn();
    return;
  }
  document.startViewTransition(() => updateFn());
}

function OrderCard({ order, nowMs, onOpen, onDragStart, onDragEnd }) {
  const isCompleted = order.status === 'COMPLETED';
  const elapsed = formatElapsedHhMmSs(order.createdAt, nowMs);
  const itemsPreview = (order.items || []).slice(0, 5);

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(order);
      }}
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      className="w-full cursor-pointer rounded-[10px] border border-[#B9C8D8] bg-[#F8FBFF] p-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F2F7FD] hover:shadow-md"
      style={{ viewTransitionName: `order-${order.id}` }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="font-bold text-[#24303B]">#{order.displayOrderNumber ?? order.orderNumber} • {order.customer?.name || 'Cliente sem nome'}</div>
      <div className="mt-0.5 text-xs text-[#5A6B7D]">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>

      {!isCompleted ? (
        <>
          <div className="mt-2 space-y-0.5 text-[13px] text-[#24303B]">
            <div><strong>Endereço:</strong> {order.deliveryAddress || '-'}</div>
            <div><strong>Qtd. de Pedidos:</strong> {order.customer?.totalOrders ?? 0}</div>
            <div><strong>Tempo desde recebido:</strong> {elapsed}</div>
          </div>

          <div className="mt-2">
            <div className="text-xs text-[#5A6B7D]">Lista de pedidos ({itemsPreview.length})</div>
            <ul className="mt-1 space-y-1 text-[13px] text-[#24303B]">
              {itemsPreview.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="text-[#647A90]">✓</span>
                  <span>{item.quantity} {item.unit || ''} {item.productName}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

function ChecklistList({ order, checkedMap, onToggle }) {
  const sections = useMemo(() => groupItemsBySection(order?.items || []), [order]);

  if (!order?.items?.length) return <div className="text-sm text-[#5A6B7D]">Sem itens neste pedido.</div>;

  return (
    <div className="space-y-4">
      {sections.map(({ section, items }) => (
        <div key={section}>
          <div className="mb-2 rounded-md bg-[#E7EDF4] px-2 py-1 text-sm font-bold text-[#2A3744]">{section}</div>
          <div className="space-y-1">
            {items.map((item) => {
              const state = checkedMap[item.id] || 'pending';
              const checked = state === 'checked';
              const missing = state === 'missing';
              return (
                <div key={item.id} className="flex w-full items-start gap-2 rounded-md px-2 py-1 hover:bg-[#F2F7FD]">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id, 'checked')}
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                      checked ? 'border-[#2A7F62] bg-[#2A7F62] text-white' : 'border-[#B9C8D8] bg-white text-transparent'
                    }`}
                    aria-label="Marcar item como separado"
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <span
                    className={`flex-1 ${checked ? 'text-[#6C7C8D] line-through' : missing ? 'text-[#BC2028] line-through' : 'text-[#24303B]'}`}
                  >
                    {item.quantity} {item.unit || ''} {item.productName}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(item.id, 'missing')}
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                      missing ? 'border-[#BC2028] bg-[#E84045] text-white' : 'border-[#B9C8D8] bg-white text-[#9AA8B6]'
                    }`}
                    aria-label="Marcar item como indisponível"
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderModal({ order, onClose, onMoveStatus, onAskQuestion, onCancelOrder, actionLoading, checkedMap, onToggleChecklist }) {
  if (!order) return null;

  const notesText = String(order.notes || '').trim();
  const isCompleted = order.status === 'COMPLETED';
  const paymentStatus = order.paymentIntent ? 'Definido' : 'Pendente';
  const addressStatus = order.deliveryAddress ? order.deliveryAddress : 'Pendente';

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(8,12,18,0.5)] p-3 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-[#B9C8D8] bg-white p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="m-0 text-xl font-bold text-[#24303B] md:text-2xl">Pedido #{order.displayOrderNumber ?? order.orderNumber} • {order.customer?.name || 'Cliente'}</h2>
            <div className="mt-1 text-sm text-[#5A6B7D]">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-md border border-[#BC2028] bg-[#E84045] text-base font-bold text-white transition-transform duration-150 hover:scale-105" aria-label="Fechar modal">X</button>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-[#24303B] md:grid-cols-2">
          <div><strong>Status:</strong> {getColumnByStatus(order.status).title}</div>
          <div><strong>Criado em:</strong> {formatDateTime(order.createdAt)}</div>
          <div><strong>Endereço:</strong> {addressStatus}</div>
          <div><strong>Pagamento:</strong> {paymentStatus}</div>
          <div><strong>Qtd. de Pedidos:</strong> {order.customer?.totalOrders ?? 0}</div>
          <div><strong>Atualizado em:</strong> {formatDateTime(order.updatedAt)}</div>
          {notesText ? <div className="md:col-span-2"><strong>Observações:</strong> {notesText}</div> : null}
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-bold text-[#24303B]">Mover pedido</div>
          <div className="flex flex-wrap gap-2">
            {ORDER_COLUMNS.map((column) => {
              const active = order.status === column.status;
              const allowed = canMoveStatus(order.status, column.status);
              return (
                <button
                  key={column.status}
                  type="button"
                  disabled={active || !!actionLoading || !allowed}
                  onClick={() => onMoveStatus(order.id, column.status)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    active
                      ? 'border-transparent text-white transition-transform duration-150 hover:scale-[1.03]'
                      : allowed
                        ? 'border-[#B9C8D8] bg-[#F8FBFF] text-[#24303B] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#F2F7FD] active:scale-[0.99]'
                        : 'border-[#D0D7E0] bg-[#EEF2F6] text-[#A0ADBA]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  style={active ? { background: column.accent } : undefined}
                >
                  {column.title}
                </button>
              );
            })}
          </div>
        </div>

        {!isCompleted ? (
          <div className="mt-4">
            <div className="mb-2 text-sm font-bold text-[#24303B]">Solicitar dados ao cliente</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!actionLoading} onClick={() => onAskQuestion(order.id, 'address')} className="rounded-md border border-[#B9C8D8] bg-[#F8FBFF] px-3 py-1 text-sm text-[#24303B] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#F2F7FD] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">Solicitar endereço</button>
              <button type="button" disabled={!!actionLoading} onClick={() => onAskQuestion(order.id, 'payment')} className="rounded-md border border-[#B9C8D8] bg-[#F8FBFF] px-3 py-1 text-sm text-[#24303B] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#F2F7FD] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">Perguntar pagamento</button>
              <button type="button" disabled={!!actionLoading} onClick={() => onCancelOrder(order.id)} className="rounded-md border border-[#BC2028] bg-[#E84045] px-3 py-1 text-sm text-white transition-transform duration-150 hover:scale-[1.03] hover:bg-[#D83A3F] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">Cancelar pedido</button>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-[#24303B]">Checklist de itens ({order.items?.length || 0})</div>
          </div>
          <ChecklistList order={order} checkedMap={checkedMap} onToggle={onToggleChecklist} />
        </div>
      </div>
    </div>
  );
}

export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [checkedItemsByOrder, setCheckedItemsByOrder] = useState({});

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders?status=ALL&limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Falha ao carregar orders');
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsClient(true);
    loadOrders();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!realtimeEnabled) {
      setRealtimeConnected(false);
      return undefined;
    }

    let closed = false;
    let refreshTimer = null;
    const es = new EventSource('/api/stream/realtime?topic=orders');

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!actionLoading) loadOrders();
      }, 180);
    };

    es.onopen = () => {
      if (closed) return;
      setRealtimeConnected(true);
    };

    es.onmessage = () => {
      if (closed) return;
      scheduleRefresh();
    };

    es.onerror = () => {
      if (closed) return;
      setRealtimeConnected(false);
    };

    return () => {
      closed = true;
      setRealtimeConnected(false);
      if (refreshTimer) clearTimeout(refreshTimer);
      es.close();
    };
  }, [realtimeEnabled, actionLoading]);

  async function moveOrderStatus(orderId, toStatus) {
    if (!orderId || !toStatus) return;
    setActionLoading(`${orderId}:${toStatus}`);
    setError('');
    try {
      const currentOrder = orders.find((item) => item.id === orderId);
      if (currentOrder && !canMoveStatus(currentOrder.status, toStatus)) {
        throw new Error('Transição inválida para o status selecionado');
      }

      const res = await fetch(`/api/admin/orders/${orderId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao mover pedido');

      runWithViewTransition(() => {
        setOrders((current) =>
          current.map((order) =>
            order.id === orderId ? { ...order, status: data.toStatus || toStatus, updatedAt: new Date().toISOString() } : order,
          ),
        );
        setSelectedOrder((current) =>
          current && current.id === orderId ? { ...current, status: data.toStatus || toStatus, updatedAt: new Date().toISOString() } : current,
        );
      });
    } catch (e) {
      setError(e.message || 'Erro ao mover status');
    } finally {
      setActionLoading('');
    }
  }

  async function cancelOrder(orderId) {
    if (!orderId) return;
    if (!window.confirm('Cancelar este pedido?')) return;
    setActionLoading(`cancel:${orderId}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao cancelar pedido');
      runWithViewTransition(() => {
        setOrders((current) => current.filter((order) => order.id !== orderId));
        setSelectedOrder((current) => (current?.id === orderId ? null : current));
      });
    } catch (e) {
      setError(e.message || 'Erro ao cancelar pedido');
    } finally {
      setActionLoading('');
    }
  }

  async function askOrderQuestion(orderId, type) {
    if (!orderId || !type) return;
    setActionLoading(`ask:${orderId}:${type}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao enviar pergunta');
    } catch (e) {
      setError(e.message || 'Erro ao perguntar ao cliente');
    } finally {
      setActionLoading('');
    }
  }

  const grouped = useMemo(() => {
    const map = new Map(ORDER_COLUMNS.map((column) => [column.status, []]));
    for (const order of orders) {
      const arr = map.get(order.status);
      if (arr) arr.push(order);
    }
    return map;
  }, [orders]);

  function handleCardDragStart(event, orderId) {
    setDraggingOrderId(orderId);
    event.dataTransfer.setData('text/plain', orderId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleCardDragEnd() {
    setDraggingOrderId(null);
  }

  async function handleColumnDrop(event, columnStatus) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData('text/plain') || draggingOrderId;
    setDraggingOrderId(null);
    if (!orderId) return;
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status === columnStatus) return;
    if (!canMoveStatus(order.status, columnStatus)) {
      setError('Não é permitido voltar etapa ou mover pedido finalizado.');
      return;
    }
    await moveOrderStatus(orderId, columnStatus);
  }

  const selectedCheckedMap = selectedOrder ? checkedItemsByOrder[selectedOrder.id] || {} : {};

  function toggleChecklist(orderId, itemId, nextState) {
    if (!orderId || !itemId) return;
    setCheckedItemsByOrder((current) => {
      const orderMap = current[orderId] || {};
      const currentState = orderMap[itemId] || 'pending';
      const computed = currentState === nextState ? 'pending' : nextState;
      return {
        ...current,
        [orderId]: {
          ...orderMap,
          [itemId]: computed,
        },
      };
    });
  }

  return (
    <main className="min-h-screen bg-[#E7EDF4] p-3 md:p-5">
      <div className="mb-3.5 flex flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <img src={businessConfig.logoPath} alt={businessConfig.establishmentName} className="h-[54px] w-[54px] object-contain" />
          <div className="m-0 text-xl font-bold text-[#24303B] md:text-2xl">{businessConfig.establishmentName}</div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className="text-xs text-[#5A6B7D]" suppressHydrationWarning>Agora: {isClient ? new Date(nowMs).toLocaleTimeString('pt-BR') : '--:--:--'}</span>
          <label className="flex items-center gap-1 text-xs text-[#5A6B7D]">
            <input type="checkbox" checked={realtimeEnabled} onChange={(e) => setRealtimeEnabled(e.target.checked)} />
            Tempo real
          </label>
          <span className="text-xs text-[#5A6B7D]">
            {realtimeEnabled ? (realtimeConnected ? 'Conectado' : 'Reconectando...') : 'Desligado'}
          </span>
          <button type="button" onClick={loadOrders} disabled={loading} className="rounded-md border border-[#B9C8D8] bg-[#F8FBFF] px-3 py-1 text-sm text-[#24303B] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.99] disabled:opacity-60">{loading ? 'Carregando...' : 'Atualizar'}</button>
        </div>
      </div>

      {error ? <div className="mb-3 text-[#B00020]">{error}</div> : null}

      <section className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {ORDER_COLUMNS.map((column) => {
          const items = grouped.get(column.status) || [];
          return (
            <div key={column.status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleColumnDrop(e, column.status)} className="flex min-h-[540px] w-[85vw] min-w-[280px] max-w-[370px] shrink-0 flex-col rounded-xl border border-[#B9C8D8] bg-[#D9E2EC] md:w-[340px]">
              <div className="flex justify-between rounded-t-xl px-3 py-2.5 text-sm font-bold text-[#F1F6FB]" style={{ background: column.accent }}>
                <span>{column.title}</span>
                <span>{items.length}</span>
              </div>
              <motion.div layout className="grid gap-2.5 p-2.5">
                <AnimatePresence>
                  {items.map((order) => (
                    <OrderCard key={order.id} order={order} nowMs={nowMs} onOpen={setSelectedOrder} onDragStart={handleCardDragStart} onDragEnd={handleCardDragEnd} />
                  ))}
                </AnimatePresence>
                {!items.length ? <div className="p-3 text-center text-xs text-[#5A6B7D]">Sem pedidos nesta aba</div> : null}
              </motion.div>
            </div>
          );
        })}
      </section>

      <OrderModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onMoveStatus={moveOrderStatus}
        onAskQuestion={askOrderQuestion}
        onCancelOrder={cancelOrder}
        actionLoading={actionLoading}
        checkedMap={selectedCheckedMap}
        onToggleChecklist={(itemId, nextState) => toggleChecklist(selectedOrder?.id, itemId, nextState)}
      />
    </main>
  );
}
