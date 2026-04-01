'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ORDER_COLUMNS, getColumnByStatus } from './constants.js';
import { businessConfig } from './business_config.js';
import { groupItemsBySection } from './product-categorization.js';
import { formatDateTime, formatElapsedHhMmSs } from './time.js';

const STATUS_TRANSITIONS = {
  NEW_ORDER: ['IN_PICKING'],
  IN_PICKING: ['WAITING_COURIER'],
  WAITING_COURIER: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
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

function normalizeNotesForDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let cleaned = raw
    .replace(/\bNeighborhood:\s*[^.|]+[.|]?/gi, ' ')
    .replace(/\bObservations?:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const sentenceCandidates = cleaned.split('.').map((part) => part.trim()).filter(Boolean);
  if (!sentenceCandidates.length) return cleaned;
  const unique = [];
  const seen = new Set();
  for (const sentence of sentenceCandidates) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
  }
  return `${unique.join('. ')}${cleaned.endsWith('.') ? '.' : ''}`.trim();
}

function runWithViewTransition(updateFn) {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
    updateFn();
    return;
  }
  document.startViewTransition(() => updateFn());
}

function getConversationDayLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (current.getTime() === today.getTime()) return 'Hoje';
  if (current.getTime() === yesterday.getTime()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

/* ─────────────── ORDER CARD ─────────────── */
function OrderCard({ order, nowMs, onOpen, onDragStart, onDragEnd }) {
  const isCompleted = order.status === 'COMPLETED';
  const elapsed = formatElapsedHhMmSs(order.createdAt, nowMs);
  const itemsPreview = (order.items || []).slice(0, 5);
  const column = getColumnByStatus(order.status);

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(order); }}
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      className="group w-full cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
      style={{ viewTransitionName: `order-${order.id}`, borderLeft: `4px solid ${column.accent}` }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-['Outfit'] text-[15px] font-bold text-[#1A1D23]">
            #{order.displayOrderNumber ?? order.orderNumber}
          </span>
          {!isCompleted && (
            <span className="rounded-full bg-[#F0F2F5] px-2 py-0.5 font-mono text-[11px] font-medium text-[#5A6170]">
              {elapsed}
            </span>
          )}
        </div>
        <div className="mt-1 text-[13px] font-medium text-[#3A3F47]">{order.customer?.name || 'Cliente sem nome'}</div>
        <div className="mt-0.5 text-[11px] text-[#8B93A0]">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>

        {!isCompleted && (
          <>
            {order.deliveryAddress && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#6B7280]">
                <span className="mt-px">📍</span>
                <span className="line-clamp-1">{order.deliveryAddress}</span>
              </div>
            )}

            <div className="mt-2.5 border-t border-[#F0F2F5] pt-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {itemsPreview.length} {itemsPreview.length === 1 ? 'item' : 'itens'}
              </div>
              <ul className="space-y-0.5">
                {itemsPreview.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-1 text-[12px] text-[#4B5563]">
                    <span className="font-medium text-[#1A1D23]">{item.quantity}{item.unit ? item.unit : ''}</span>
                    <span>{item.productName}</span>
                  </li>
                ))}
              </ul>
              {(order.items || []).length > 5 && (
                <div className="mt-1 text-[10px] text-[#9CA3AF]">+{order.items.length - 5} mais</div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────── CHECKLIST ─────────────── */
function ChecklistList({ order, checkedMap, onToggle }) {
  const sections = useMemo(() => groupItemsBySection(order?.items || []), [order]);
  const [collapsedBySection, setCollapsedBySection] = useState({});

  if (!order?.items?.length) return <div className="py-4 text-center text-sm text-[#9CA3AF]">Sem itens neste pedido.</div>;

  const toggleSection = (section) => {
    setCollapsedBySection((current) => ({ ...current, [section]: !current[section] }));
  };

  const sectionIcons = { 'Açougue': '🥩', 'Padaria': '🥖', 'Hortifruti': '🥬', 'Produtos Gerais': '📦' };

  return (
    <div className="space-y-3">
      {sections.map(({ section, items }) => (
        <div key={section} className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => toggleSection(section)}
            className="flex w-full items-center justify-between bg-[#F9FAFB] px-3 py-2 text-left transition-colors hover:bg-[#F3F4F6]"
          >
            <span className="flex items-center gap-2">
              <span>{sectionIcons[section] || '📦'}</span>
              <span className="text-sm font-semibold text-[#1A1D23]">{section}</span>
              <span className="rounded-full bg-[#E5E7EB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">{items.length}</span>
            </span>
            <span className="text-xs text-[#9CA3AF]">{collapsedBySection[section] ? '▸' : '▾'}</span>
          </button>
          {!collapsedBySection[section] && (
            <div className="divide-y divide-[#F3F4F6]">
              {items.map((item) => {
                const state = checkedMap[item.id] || 'pending';
                const checked = state === 'checked';
                const missing = state === 'missing';
                return (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[#FAFBFC]">
                    <button
                      type="button"
                      onClick={() => onToggle(item.id, 'checked')}
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-all ${
                        checked
                          ? 'border-[#10B981] bg-[#10B981] text-white'
                          : 'border-[#D1D5DB] bg-white text-transparent hover:border-[#10B981]'
                      }`}
                    >
                      ✓
                    </button>
                    <span className={`flex-1 text-[13px] ${
                      checked ? 'text-[#9CA3AF] line-through' : missing ? 'text-[#EF4444] line-through' : 'text-[#1A1D23]'
                    }`}>
                      <span className="font-medium">{item.quantity}{item.unit ? item.unit : ''}</span> {item.productName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(item.id, 'missing')}
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-all ${
                        missing
                          ? 'border-[#EF4444] bg-[#EF4444] text-white'
                          : 'border-[#D1D5DB] bg-white text-[#D1D5DB] hover:border-[#EF4444] hover:text-[#EF4444]'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── ORDER MODAL ─────────────── */
function OrderModal({ order, onClose, onMoveStatus, onAskQuestion, onCancelOrder, actionLoading, checkedMap, onToggleChecklist }) {
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationLoadingMore, setConversationLoadingMore] = useState(false);
  const [conversationHasMore, setConversationHasMore] = useState(false);
  const [conversationNextBefore, setConversationNextBefore] = useState(null);
  const [conversationError, setConversationError] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const conversationContainerRef = useRef(null);
  const pendingScrollModeRef = useRef(null);
  const prependScrollStateRef = useRef({ scrollHeight: 0, scrollTop: 0 });

  const loadConversation = async ({ reset = false, todayOnly = true, before = null } = {}) => {
    if (!order?.id) return;
    if (reset) { setConversationLoading(true); setConversationError(''); }
    else { setConversationLoadingMore(true); }
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      params.set('todayOnly', todayOnly ? '1' : '0');
      if (before) params.set('before', before);
      const res = await fetch(`/api/orders/${order.id}/messages?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao carregar conversa');
      const page = data.messages || [];
      setConversationHasMore(Boolean(data.hasMore));
      setConversationNextBefore(data.nextBefore || null);
      if (!reset) {
        const el = conversationContainerRef.current;
        prependScrollStateRef.current = { scrollHeight: el?.scrollHeight ?? 0, scrollTop: el?.scrollTop ?? 0 };
      }
      pendingScrollModeRef.current = reset ? 'bottom' : 'prepend';
      setConversation((prev) => {
        if (reset) return page;
        const ids = new Set(prev.map((m) => m.id));
        return [...page.filter((m) => !ids.has(m.id)), ...prev];
      });
    } catch (error) {
      setConversationError(error.message || 'Erro ao carregar conversa');
    } finally {
      setConversationLoading(false);
      setConversationLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!order?.id || !isConversationOpen) return;
    setConversation([]); setConversationHasMore(false); setConversationNextBefore(null);
    setConversationError(''); setNewMessageText('');
    loadConversation({ reset: true, todayOnly: true });
  }, [order?.id, isConversationOpen]);

  useEffect(() => {
    if (!order?.id) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => { document.body.style.overflow = prevOverflow; document.body.style.overscrollBehavior = prevOverscroll; };
  }, [order?.id]);

  useEffect(() => {
    if (!isConversationOpen) return;
    const el = conversationContainerRef.current;
    if (!el) return;
    const mode = pendingScrollModeRef.current;
    if (!mode) return;
    if (mode === 'bottom') { el.scrollTop = el.scrollHeight; }
    else if (mode === 'prepend') {
      const prev = prependScrollStateRef.current;
      el.scrollTop = Math.max(0, prev.scrollTop + (el.scrollHeight - prev.scrollHeight));
    }
    pendingScrollModeRef.current = null;
  }, [conversation, isConversationOpen]);

  useEffect(() => {
    if (!order?.id || !isConversationOpen) return;
    const es = new EventSource('/api/stream/realtime?topic=orders');
    let timer = null;
    es.onmessage = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadConversation({ reset: true, todayOnly: true }), 160);
    };
    return () => { if (timer) clearTimeout(timer); es.close(); };
  }, [order?.id, isConversationOpen]);

  if (!order) return null;

  const column = getColumnByStatus(order.status);
  const notesText = normalizeNotesForDisplay(order.notes);
  const isCompleted = order.status === 'COMPLETED';
  const paymentLabels = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão', cartão: 'Cartão', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferência' };
  const paymentStatus = order.paymentIntent ? (paymentLabels[order.paymentIntent] ?? order.paymentIntent) : 'Pendente';
  const addressStatus = order.deliveryAddress || 'Pendente';

  const conversationBlocks = [];
  let lastDayLabel = null;
  for (const msg of conversation) {
    const dayLabel = getConversationDayLabel(msg.createdAt);
    if (dayLabel && dayLabel !== lastDayLabel) {
      conversationBlocks.push(
        <div key={`day-${msg.id}`} className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-[#E5E7EB]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{dayLabel}</span>
          <div className="h-px flex-1 bg-[#E5E7EB]" />
        </div>,
      );
      lastDayLabel = dayLabel;
    }
    const isInbound = msg.direction === 'INBOUND';
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    conversationBlocks.push(
      <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] ${
          isInbound
            ? 'rounded-bl-md bg-[#E8F5E9] text-[#1B5E20]'
            : 'rounded-br-md bg-[#E3F2FD] text-[#0D47A1]'
        }`}>
          <div className="whitespace-pre-wrap break-words">{msg.text || '[mensagem sem texto]'}</div>
          <div className="mt-0.5 text-right text-[10px] opacity-50">{time}</div>
        </div>
      </div>,
    );
  }

  const handleConversationScroll = (event) => {
    const target = event.currentTarget;
    if (!conversationHasMore || conversationLoadingMore || conversationLoading) return;
    if (target.scrollHeight <= target.clientHeight + 8) return;
    if (target.scrollTop <= 36) {
      loadConversation({ reset: false, todayOnly: false, before: conversationNextBefore });
    }
  };

  const sendMessage = async () => {
    const text = String(newMessageText || '').trim();
    if (!text || !order?.id) return;
    setSendingMessage(true);
    setConversationError('');
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao enviar mensagem');
      if (data.message) {
        pendingScrollModeRef.current = 'bottom';
        setConversation((prev) => [...prev, data.message]);
      }
      setNewMessageText('');
    } catch (error) {
      setConversationError(error.message || 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-2 backdrop-blur-[2px] md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[95vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl font-['Outfit'] text-sm font-bold text-white" style={{ background: column.accent }}>
              #{order.displayOrderNumber ?? order.orderNumber}
            </div>
            <div>
              <h2 className="font-['Outfit'] text-lg font-bold text-[#1A1D23] md:text-xl">{order.customer?.name || 'Cliente'}</h2>
              <div className="text-xs text-[#9CA3AF]">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConversationOpen(!isConversationOpen)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all hover:scale-[1.02] ${
                isConversationOpen
                  ? 'border-[#2980B9] bg-[#2980B9] text-white'
                  : 'border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'
              }`}
            >
              💬 <span className="hidden sm:inline">Conversa</span>
            </button>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D1D5DB] text-[#9CA3AF] transition-all hover:border-[#EF4444] hover:bg-[#FEF2F2] hover:text-[#EF4444]">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Order Details */}
          <section className={`kanban-scroll min-h-0 flex-1 overflow-y-auto p-4 md:p-6 ${isConversationOpen ? 'hidden md:block' : ''}`}>
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Status</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: column.accent }} />
                  <span className="text-sm font-semibold text-[#1A1D23]">{column.title}</span>
                </div>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Pagamento</div>
                <div className={`mt-1 text-sm font-semibold ${paymentStatus === 'Pendente' ? 'text-[#F59E0B]' : 'text-[#1A1D23]'}`}>{paymentStatus}</div>
              </div>
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Pedidos do cliente</div>
                <div className="mt-1 text-sm font-semibold text-[#1A1D23]">{order.customer?.totalOrders ?? 0}</div>
              </div>
              <div className="col-span-2 rounded-lg bg-[#F9FAFB] p-3 md:col-span-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Endereço</div>
                <div className={`mt-1 text-sm font-semibold ${addressStatus === 'Pendente' ? 'text-[#F59E0B]' : 'text-[#1A1D23]'}`}>{addressStatus}</div>
              </div>
            </div>

            {notesText && (
              <div className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#92400E]">Observações</div>
                <div className="mt-1 text-sm text-[#78350F]">{notesText}</div>
              </div>
            )}

            {/* Status Flow */}
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Mover pedido</div>
              <div className="flex flex-wrap gap-2">
                {ORDER_COLUMNS.map((col) => {
                  const active = order.status === col.status;
                  const allowed = canMoveStatus(order.status, col.status);
                  return (
                    <button
                      key={col.status}
                      type="button"
                      disabled={active || !!actionLoading || !allowed}
                      onClick={() => onMoveStatus(order.id, col.status)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? 'border-transparent text-white shadow-sm'
                          : allowed
                            ? 'border-[#D1D5DB] bg-white text-[#4B5563] hover:scale-[1.02] hover:border-[#9CA3AF] hover:shadow-sm active:scale-[0.98]'
                            : 'border-[#F3F4F6] bg-[#F9FAFB] text-[#D1D5DB]'
                      } disabled:cursor-not-allowed`}
                      style={active ? { background: col.accent } : undefined}
                    >
                      {col.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            {!isCompleted && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Ações</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!!actionLoading} onClick={() => onAskQuestion(order.id, 'address')} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] transition-all hover:scale-[1.02] hover:border-[#9CA3AF] hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    📍 Solicitar endereço
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => onAskQuestion(order.id, 'payment')} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] transition-all hover:scale-[1.02] hover:border-[#9CA3AF] hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    💳 Perguntar pagamento
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => onCancelOrder(order.id)} className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-sm font-medium text-[#DC2626] transition-all hover:scale-[1.02] hover:bg-[#FEE2E2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                    Cancelar pedido
                  </button>
                </div>
              </div>
            )}

            {/* Items Checklist */}
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Itens do pedido ({order.items?.length || 0})</div>
              </div>
              <ChecklistList order={order} checkedMap={checkedMap} onToggle={onToggleChecklist} />
            </div>

            {/* Timestamps */}
            <div className="mt-5 flex gap-4 border-t border-[#F3F4F6] pt-3 text-[11px] text-[#9CA3AF]">
              <span>Criado: {formatDateTime(order.createdAt)}</span>
              <span>Atualizado: {formatDateTime(order.updatedAt)}</span>
            </div>
          </section>

          {/* Right: Conversation Panel */}
          {isConversationOpen && (
            <aside className="flex w-full flex-col border-l border-[#E5E7EB] bg-[#FAFBFC] md:w-[380px] md:min-w-[340px]">
              <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-3">
                <div className="text-sm font-semibold text-[#1A1D23]">Conversa com cliente</div>
                <div className="text-[11px] text-[#9CA3AF]">Role para cima para mensagens anteriores</div>
              </div>

              <div
                ref={conversationContainerRef}
                onScroll={handleConversationScroll}
                className="chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
              >
                {conversationLoading && <div className="py-4 text-center text-xs text-[#9CA3AF]">Carregando conversa...</div>}
                {conversationLoadingMore && <div className="mb-2 text-center text-xs text-[#9CA3AF]">Carregando anteriores...</div>}
                {!conversationLoading && !conversation.length && (
                  <div className="py-8 text-center text-xs text-[#9CA3AF]">Sem mensagens para este cliente.</div>
                )}
                <div className="grid gap-2">{conversationBlocks}</div>
              </div>

              {conversationError && <div className="mx-3 mb-2 rounded-md bg-[#FEF2F2] px-3 py-1.5 text-xs text-[#DC2626]">{conversationError}</div>}

              <div className="shrink-0 border-t border-[#E5E7EB] p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Digite uma mensagem..."
                    className="min-h-[48px] flex-1 resize-none rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#2980B9] focus:ring-1 focus:ring-[#2980B9]/20"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessageText.trim()}
                    className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl bg-[#2980B9] text-white transition-all hover:bg-[#2471A3] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sendingMessage ? '...' : '➤'}
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────── MAIN BOARD ─────────────── */
export default function OrdersBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [checkedItemsByOrder, setCheckedItemsByOrder] = useState({});
  const [deliveryActive, setDeliveryActive] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('auto');
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(true);

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders?status=ALL&limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Falha ao carregar orders');
      const freshOrders = data.orders || [];
      setOrders(freshOrders);
      setSelectedOrder((current) => {
        if (!current) return null;
        return freshOrders.find((o) => o.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function loadDeliveryStatus() {
    try {
      const res = await fetch('/api/admin/delivery-status', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) { setDeliveryActive(data.active); setDeliveryMode(data.mode); }
    } catch {}
  }

  async function loadBusinessHours() {
    try {
      const res = await fetch('/api/admin/business-hours', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setBusinessHoursEnabled(data.enabled);
    } catch {}
  }

  async function toggleBusinessHours() {
    const next = !businessHoursEnabled;
    setBusinessHoursEnabled(next);
    try {
      await fetch('/api/admin/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } catch { setBusinessHoursEnabled(!next); }
  }

  async function toggleDelivery() {
    const next = !deliveryActive;
    setDeliveryActive(next);
    setDeliveryMode('manual');
    try {
      await fetch('/api/admin/delivery-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
    } catch { setDeliveryActive(!next); }
  }

  useEffect(() => { setIsClient(true); loadOrders(); loadDeliveryStatus(); loadBusinessHours(); }, []);
  useEffect(() => { const timer = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    let closed = false;
    let refreshTimer = null;
    const es = new EventSource('/api/stream/realtime?topic=orders');
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (!actionLoading) loadOrders(); }, 180);
    };
    es.onopen = () => { if (!closed) setRealtimeConnected(true); };
    es.onmessage = () => { if (!closed) scheduleRefresh(); };
    es.onerror = () => { if (!closed) setRealtimeConnected(false); };
    return () => { closed = true; setRealtimeConnected(false); if (refreshTimer) clearTimeout(refreshTimer); es.close(); };
  }, [actionLoading]);

  async function moveOrderStatus(orderId, toStatus) {
    if (!orderId || !toStatus) return;
    setActionLoading(`${orderId}:${toStatus}`);
    setError('');
    try {
      const currentOrder = orders.find((item) => item.id === orderId);
      if (currentOrder && !canMoveStatus(currentOrder.status, toStatus)) throw new Error('Transição inválida');
      const res = await fetch(`/api/admin/orders/${orderId}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStatus }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao mover pedido');
      runWithViewTransition(() => {
        setOrders((current) => current.map((o) => o.id === orderId ? { ...o, status: data.toStatus || toStatus, updatedAt: new Date().toISOString() } : o));
        setSelectedOrder((current) => current && current.id === orderId ? { ...current, status: data.toStatus || toStatus, updatedAt: new Date().toISOString() } : current);
      });
    } catch (e) { setError(e.message || 'Erro ao mover status'); } finally { setActionLoading(''); }
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
        setOrders((current) => current.filter((o) => o.id !== orderId));
        setSelectedOrder((current) => (current?.id === orderId ? null : current));
      });
    } catch (e) { setError(e.message || 'Erro ao cancelar pedido'); } finally { setActionLoading(''); }
  }

  async function askOrderQuestion(orderId, type) {
    if (!orderId || !type) return;
    setActionLoading(`ask:${orderId}:${type}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.reason || 'Falha ao enviar pergunta');
    } catch (e) { setError(e.message || 'Erro ao perguntar ao cliente'); } finally { setActionLoading(''); }
  }

  const grouped = useMemo(() => {
    const map = new Map(ORDER_COLUMNS.map((col) => [col.status, []]));
    for (const order of orders) { const arr = map.get(order.status); if (arr) arr.push(order); }
    return map;
  }, [orders]);

  function handleCardDragStart(event, orderId) {
    setDraggingOrderId(orderId);
    event.dataTransfer.setData('text/plain', orderId);
    event.dataTransfer.effectAllowed = 'move';
  }
  function handleCardDragEnd() { setDraggingOrderId(null); }

  async function handleColumnDrop(event, columnStatus) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData('text/plain') || draggingOrderId;
    setDraggingOrderId(null);
    if (!orderId) return;
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status === columnStatus) return;
    if (!canMoveStatus(order.status, columnStatus)) { setError('Não é permitido voltar etapa.'); return; }
    await moveOrderStatus(orderId, columnStatus);
  }

  const selectedCheckedMap = selectedOrder ? checkedItemsByOrder[selectedOrder.id] || {} : {};

  function toggleChecklist(orderId, itemId, nextState) {
    if (!orderId || !itemId) return;
    setCheckedItemsByOrder((current) => {
      const orderMap = current[orderId] || {};
      const computed = (orderMap[itemId] || 'pending') === nextState ? 'pending' : nextState;
      return { ...current, [orderId]: { ...orderMap, [itemId]: computed } };
    });
  }

  return (
    <main className="min-h-screen bg-[#F0F2F5] p-3 md:p-5">
      {/* Header */}
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={businessConfig.logoPath} alt={businessConfig.establishmentName} className="h-12 w-12 rounded-xl object-contain shadow-sm" />
          <h1 className="font-['Outfit'] text-xl font-bold text-[#1A1D23] md:text-2xl">{businessConfig.establishmentName}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Delivery Toggle */}
          {deliveryActive !== null && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-[#6B7280]">Entregas</span>
              <button
                type="button"
                onClick={toggleDelivery}
                className={`relative inline-flex h-[30px] w-[54px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  deliveryActive
                    ? 'bg-[#10B981] focus:ring-[#10B981]/30'
                    : 'bg-[#D1D5DB] focus:ring-[#D1D5DB]/30'
                }`}
                title={`Entregas ${deliveryActive ? 'ativas' : 'pausadas'}${deliveryMode === 'auto' ? ' (automático)' : ''}`}
              >
                <span className={`pointer-events-none inline-block h-[24px] w-[24px] rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                  deliveryActive ? 'translate-x-[27px]' : 'translate-x-[3px]'
                }`} />
              </button>
            </div>
          )}

          {/* Business Hours Toggle */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-[#6B7280]">Horário</span>
            <button
              type="button"
              onClick={toggleBusinessHours}
              className={`relative inline-flex h-[30px] w-[54px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                businessHoursEnabled
                  ? 'bg-[#10B981] focus:ring-[#10B981]/30'
                  : 'bg-[#F59E0B] focus:ring-[#F59E0B]/30'
              }`}
              title={businessHoursEnabled ? 'Horário de funcionamento ativo (responde fora do horário)' : 'Horário desativado (processa 24h)'}
            >
              <span className={`pointer-events-none inline-block h-[24px] w-[24px] rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                businessHoursEnabled ? 'translate-x-[27px]' : 'translate-x-[3px]'
              }`} />
            </button>
          </div>

          {/* DateTime */}
          <span className="font-mono text-xs text-[#9CA3AF]" suppressHydrationWarning>
            {isClient
              ? `${new Date(nowMs).toLocaleDateString('pt-BR')} · ${new Date(nowMs).toLocaleTimeString('pt-BR')}`
              : '--/--/---- · --:--:--'}
          </span>

          {/* Connection Status */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            realtimeConnected ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'
          }`}>
            {!realtimeConnected && <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-[#DC2626] border-t-transparent" />}
            {realtimeConnected && <span className="h-2 w-2 rounded-full bg-[#10B981]" />}
            {realtimeConnected ? 'Conectado' : 'Reconectando'}
          </span>
        </div>
      </header>

      {error && (
        <div className="mb-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-sm text-[#DC2626]">{error}</div>
      )}

      {/* Kanban Board */}
      <section className="flex flex-nowrap gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-3 xl:overflow-x-visible 2xl:grid-cols-5">
        {ORDER_COLUMNS.map((column) => {
          const items = grouped.get(column.status) || [];
          return (
            <div
              key={column.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleColumnDrop(e, column.status)}
              className="relative flex min-h-[540px] w-[86vw] min-w-[280px] max-w-[370px] shrink-0 flex-col overflow-hidden rounded-xl sm:w-[320px] md:min-h-[500px] md:w-[248px] md:min-w-[248px] md:max-w-[248px] lg:min-h-[500px] lg:w-[232px] lg:min-w-[232px] lg:max-w-[232px] xl:min-h-[540px] xl:min-w-0 xl:max-w-none xl:w-auto xl:shrink"
              style={{ background: column.bg, border: `1px solid ${column.border}` }}
            >
              <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: `2px solid ${column.accent}` }}>
                <span className="font-['Outfit'] text-sm font-bold" style={{ color: column.accent }}>{column.title}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: column.accent }}>
                  {items.length}
                </span>
              </div>
              <motion.div layout className="kanban-scroll grid gap-2.5 overflow-y-auto p-2.5">
                <AnimatePresence>
                  {items.map((order) => (
                    <OrderCard key={order.id} order={order} nowMs={nowMs} onOpen={setSelectedOrder} onDragStart={handleCardDragStart} onDragEnd={handleCardDragEnd} />
                  ))}
                </AnimatePresence>
                {!items.length && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-2xl opacity-20">📋</div>
                    <div className="mt-1 text-xs text-[#9CA3AF]">Sem pedidos</div>
                  </div>
                )}
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
