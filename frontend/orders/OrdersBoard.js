'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
    'acelga',
    'alface',
    'brocolis',
    'brócolis',
    'cebolinha',
    'gengibre',
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

const CATEGORY_PHRASE_OVERRIDES = [
  {
    section: 'Produtos Gerais',
    phrases: [
      'extrato de tomate',
      'molho de tomate',
      'ketchup',
      'macarrao',
      'macarrão',
      'penne',
      'espaguete',
      'spaghetti',
      'parafuso',
      'flocos de milho',
      'filtro de papel',
      'papel higienico',
      'papel higiênico',
      'papel toalha',
      'guardanapo',
      'detergente',
      'sabao',
      'sabão',
      'amaciante',
      'cafe',
      'café',
      'arroz',
      'feijao',
      'feijão',
      'azeite',
      'quinoa',
      'palmito',
      'creme de leite',
      'leite',
      'requeijao',
      'requeijão',
      'ovos',
    ],
  },
];

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

  for (const override of CATEGORY_PHRASE_OVERRIDES) {
    if (override.phrases.some((phrase) => normalized.includes(phrase.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()))) {
      return override.section;
    }
  }

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

function normalizeNotesForDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let cleaned = raw
    .replace(/\bNeighborhood:\s*[^.|]+[.|]?/gi, ' ')
    .replace(/\bObservations?:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const sentenceCandidates = cleaned
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);

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
      className="w-full cursor-pointer rounded-[10px] border border-[#B9C8D8] bg-[#F8FBFF] p-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F2F7FD] hover:shadow-md md:p-2 lg:p-3"
      style={{ viewTransitionName: `order-${order.id}` }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="text-[14px] font-bold text-[#24303B] md:text-[13px] lg:text-[14px]">#{order.displayOrderNumber ?? order.orderNumber} • {order.customer?.name || 'Cliente sem nome'}</div>
      <div className="mt-0.5 text-[11px] text-[#5A6B7D] md:text-[10px] lg:text-xs">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>

      {!isCompleted ? (
        <>
          <div className="mt-2 space-y-0.5 text-[12px] text-[#24303B] md:text-[11px] lg:text-[13px]">
            <div><strong>Endereço:</strong> {order.deliveryAddress || '-'}</div>
            <div><strong>Qtd. de Pedidos:</strong> {order.customer?.totalOrders ?? 0}</div>
            <div><strong>Tempo desde recebido:</strong> {elapsed}</div>
          </div>

          <div className="mt-2">
            <div className="text-[11px] text-[#5A6B7D] md:text-[10px] lg:text-xs">Lista de pedidos ({itemsPreview.length})</div>
            <ul className="mt-1 space-y-1 text-[12px] text-[#24303B] md:text-[11px] lg:text-[13px]">
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
  const [collapsedBySection, setCollapsedBySection] = useState({});

  if (!order?.items?.length) return <div className="text-sm text-[#5A6B7D]">Sem itens neste pedido.</div>;

  const toggleSection = (section) => {
    setCollapsedBySection((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <div className="space-y-4">
      {sections.map(({ section, items }) => (
        <div key={section}>
          <button
            type="button"
            onClick={() => toggleSection(section)}
            className="mb-2 flex w-full items-center justify-between rounded-md bg-[#E7EDF4] px-2 py-1 text-left text-sm font-bold text-[#2A3744]"
          >
            <span>{section}</span>
            <span className="text-xs text-[#4B5B6B]">{collapsedBySection[section] ? '▸' : '▾'}</span>
          </button>
          {!collapsedBySection[section] ? (
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
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${checked ? 'border-[#2A7F62] bg-[#2A7F62] text-white' : 'border-[#B9C8D8] bg-white text-transparent'
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
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${missing ? 'border-[#BC2028] bg-[#E84045] text-white' : 'border-[#B9C8D8] bg-white text-[#9AA8B6]'
                      }`}
                    aria-label="Marcar item como indisponível"
                  >
                    X
                  </button>
                </div>
              );
            })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

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
    if (reset) {
      setConversationLoading(true);
      setConversationError('');
    } else {
      setConversationLoadingMore(true);
    }

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
        prependScrollStateRef.current = {
          scrollHeight: el?.scrollHeight ?? 0,
          scrollTop: el?.scrollTop ?? 0,
        };
      }
      pendingScrollModeRef.current = reset ? 'bottom' : 'prepend';
      setConversation((prev) => {
        if (reset) return page;
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...page.filter((m) => !ids.has(m.id)), ...prev];
        return merged;
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
    setConversation([]);
    setConversationHasMore(false);
    setConversationNextBefore(null);
    setConversationError('');
    setNewMessageText('');
    loadConversation({ reset: true, todayOnly: true });
  }, [order?.id, isConversationOpen]);

  useEffect(() => {
    if (!isConversationOpen) return;
    const el = conversationContainerRef.current;
    if (!el) return;
    const mode = pendingScrollModeRef.current;
    if (!mode) return;

    if (mode === 'bottom') {
      el.scrollTop = el.scrollHeight;
    } else if (mode === 'prepend') {
      const prev = prependScrollStateRef.current;
      const delta = el.scrollHeight - prev.scrollHeight;
      el.scrollTop = Math.max(0, prev.scrollTop + delta);
    }

    pendingScrollModeRef.current = null;
  }, [conversation, isConversationOpen]);

  useEffect(() => {
    if (!order?.id || !isConversationOpen) return;
    const es = new EventSource('/api/stream/realtime?topic=orders');
    let timer = null;
    es.onmessage = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        loadConversation({ reset: true, todayOnly: true });
      }, 160);
    };
    return () => {
      if (timer) clearTimeout(timer);
      es.close();
    };
  }, [order?.id, isConversationOpen]);

  if (!order) return null;

  const notesText = normalizeNotesForDisplay(order.notes);
  const isCompleted = order.status === 'COMPLETED';
  const paymentStatus = order.paymentIntent ? 'Definido' : 'Pendente';
  const addressStatus = order.deliveryAddress ? order.deliveryAddress : 'Pendente';
  const conversationBlocks = [];
  let lastDayLabel = null;
  for (const msg of conversation) {
    const dayLabel = getConversationDayLabel(msg.createdAt);
    if (dayLabel && dayLabel !== lastDayLabel) {
      conversationBlocks.push(
        <div key={`day-${msg.id}`} className="my-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#6A7B8C]">
          ----- {dayLabel} -----
        </div>,
      );
      lastDayLabel = dayLabel;
    }

    const isInbound = msg.direction === 'INBOUND';
    const time = msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    conversationBlocks.push(
      <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
        <div
          className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${isInbound ? 'bg-[#DCF8C6] text-[#233333]' : 'bg-[#E6F0FF] text-[#223344]'
            }`}
        >
          <div className="whitespace-pre-wrap break-words">{msg.text || '[mensagem sem texto]'}</div>
          <div className="mt-1 text-right text-[10px] text-[#657686]">{time}</div>
        </div>
      </div>,
    );
  }

  const handleConversationScroll = (event) => {
    const target = event.currentTarget;
    if (!conversationHasMore || conversationLoadingMore || conversationLoading) return;
    if (target.scrollHeight <= target.clientHeight + 8) return;
    if (target.scrollTop <= 36) {
      loadConversation({
        reset: false,
        todayOnly: false,
        before: conversationNextBefore,
      });
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
    <div onClick={onClose} className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(8,12,18,0.5)] p-3 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="relative h-[90vh] w-full max-w-[1280px] overflow-hidden rounded-xl border border-[#B9C8D8] bg-white p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="m-0 text-xl font-bold text-[#24303B] md:text-2xl">Pedido #{order.displayOrderNumber ?? order.orderNumber} • {order.customer?.name || 'Cliente'}</h2>
            <div className="mt-1 text-sm text-[#5A6B7D]">{formatPhoneForDisplay(order.customer?.phoneE164 || order.customer?.phone)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConversationOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#7C93AA] bg-[#EEF4FA] text-base text-[#2A3A4B] transition-transform duration-150 hover:scale-105"
              aria-label="Abrir conversa"
            >
              💬
            </button>
            <button type="button" onClick={onClose} className="h-9 w-9 rounded-md border border-[#BC2028] bg-[#E84045] text-base font-bold text-white transition-transform duration-150 hover:scale-105" aria-label="Fechar modal">X</button>
          </div>
        </div>

        <div className="mt-4 h-[calc(90vh-106px)]">
          <section className="h-full min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-2 text-sm text-[#24303B] md:grid-cols-2">
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
                      className={`rounded-md border px-3 py-1 text-sm ${active
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
          </section>
        </div>

        {isConversationOpen ? (
          <aside className="absolute bottom-4 right-4 top-[72px] z-10 flex w-[calc(100%-2rem)] max-w-[390px] min-h-0 flex-col rounded-xl border border-[#C8D6E5] bg-[#F7FAFD] p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-[#24303B]">Conversa com cliente</div>
              <button
                type="button"
                onClick={() => setIsConversationOpen(false)}
                className="h-8 w-8 rounded-md border border-[#BC2028] bg-[#E84045] text-sm font-bold text-white transition-transform duration-150 hover:scale-105"
                aria-label="Fechar conversa"
              >
                X
              </button>
            </div>
            <div className="mb-2 text-xs text-[#5A6B7D]">
              Mostrando mensagens do dia. Role para cima para carregar anteriores.
            </div>

            <div
              ref={conversationContainerRef}
              onScroll={handleConversationScroll}
              className="min-h-0 flex-1 overflow-auto rounded-md border border-[#D3DFEB] bg-white p-2"
            >
              {conversationLoading ? (
                <div className="text-xs text-[#5A6B7D]">Carregando conversa...</div>
              ) : null}
              {conversationLoadingMore ? (
                <div className="mb-2 text-center text-xs text-[#5A6B7D]">Carregando mensagens antigas...</div>
              ) : null}
              {!conversationLoading && !conversation.length ? (
                <div className="text-xs text-[#5A6B7D]">Sem mensagens para este cliente.</div>
              ) : null}

              <div className="grid gap-2">{conversationBlocks}</div>
            </div>

            {conversationError ? (
              <div className="mt-2 text-xs text-[#B00020]">{conversationError}</div>
            ) : null}

            <div className="mt-2 flex items-end gap-2">
              <textarea
                rows={2}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="min-h-[56px] flex-1 resize-y rounded-md border border-[#B9C8D8] px-2 py-1.5 text-sm outline-none focus:border-[#7A99B8]"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sendingMessage || !newMessageText.trim()}
                className="rounded-md border border-[#B9C8D8] bg-[#F8FBFF] px-3 py-2 text-sm text-[#24303B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingMessage ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </aside>
        ) : null}
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
  }, [actionLoading]);

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
          <span className="text-xs text-[#5A6B7D]" suppressHydrationWarning>
            {isClient
              ? `${new Date(nowMs).toLocaleDateString('pt-BR')} • ${new Date(nowMs).toLocaleTimeString('pt-BR')}`
              : '--/--/---- • --:--:--'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${realtimeConnected ? 'bg-[#EAF8EF] text-[#1E7A3B]' : 'bg-[#FDECEC] text-[#B42318]'
              }`}
          >
            {!realtimeConnected ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#B42318] border-t-transparent" />
            ) : null}
            {realtimeConnected ? 'Conectado' : 'Reconectando'}
          </span>
        </div>
      </div>

      {error ? <div className="mb-3 text-[#B00020]">{error}</div> : null}

      <section className="flex flex-nowrap gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-3 xl:overflow-x-visible 2xl:grid-cols-5">
        {ORDER_COLUMNS.map((column) => {
          const items = grouped.get(column.status) || [];
          return (
            <div
              key={column.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleColumnDrop(e, column.status)}
              className="relative flex min-h-[540px] w-[86vw] min-w-[280px] max-w-[370px] shrink-0 flex-col rounded-xl border border-[#B9C8D8] bg-[#D9E2EC] sm:w-[320px] md:min-h-[500px] md:w-[248px] md:min-w-[248px] md:max-w-[248px] lg:min-h-[500px] lg:w-[232px] lg:min-w-[232px] lg:max-w-[232px] xl:min-h-[540px] xl:min-w-0 xl:max-w-none xl:w-auto xl:shrink"
            >
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
