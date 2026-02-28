'use client';

import { useEffect, useMemo, useState } from 'react';

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatCountdown(ms) {
  if (ms == null) return '-';
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function statusColor(status) {
  switch (status) {
    case 'OPEN':
      return '#0b6bcb';
    case 'COMMITTED':
      return '#18794e';
    case 'READY_FOR_REVIEW':
      return '#b26a00';
    case 'CANCELED':
    case 'EXPIRED':
      return '#9b1c1c';
    default:
      return '#555';
  }
}

function DraftCard({ draft, nowMs, onAction }) {
  const deadlineMs = draft.commitDeadlineAt ? new Date(draft.commitDeadlineAt).getTime() : null;
  const remainingMs = deadlineMs == null ? null : deadlineMs - nowMs;
  const isOpen = draft.status === 'OPEN';
  const canAskQuestion = ['OPEN', 'READY_FOR_REVIEW'].includes(draft.status);
  const canFinalizeDraft = ['OPEN', 'READY_FOR_REVIEW'].includes(draft.status);
  const canCancelDraft = draft.status !== 'CANCELED';
  const isLate = isOpen && remainingMs != null && remainingMs < 0;
  const flags = draft.aggregate?.flags || {};
  const stats = draft.aggregate?.stats || {};
  const delivery = draft.aggregate?.delivery || {};
  const control = draft.aggregate?.control || {};
  const reviewFlags = draft.aggregate?.reviewFlags || {};

  return (
    <article
      style={{
        border: `1px solid ${isLate ? '#e57373' : '#ddd'}`,
        borderRadius: 10,
        padding: 12,
        background: isLate ? '#fff5f5' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
        <div style={{ fontWeight: 700 }}>
            {draft.customer?.name || 'Cliente sem nome'}{' '}
            <span style={{ color: '#666', fontWeight: 400 }}>
              {draft.customer?.phoneE164 || draft.customer?.phone || ''}
            </span>
          </div>
          {draft.order?.orderNumber ? (
            <div style={{ fontSize: 12, color: '#333' }}>
              Pedido #{draft.order.orderNumber}
            </div>
          ) : null}
          <div style={{ fontSize: 12, color: '#666' }}>Draft ID: {draft.id}</div>
        </div>
        <div
          style={{
            color: '#fff',
            background: statusColor(draft.status),
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {draft.status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
        <div style={{ background: '#f8f8f8', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 11, color: '#666' }}>Tempo restante</div>
          <div style={{ fontWeight: 700, color: isLate ? '#b00020' : '#111' }}>
            {isOpen ? formatCountdown(remainingMs) : '-'}
          </div>
        </div>
        <div style={{ background: '#f8f8f8', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 11, color: '#666' }}>Mensagens / Itens</div>
          <div style={{ fontWeight: 700 }}>{stats.messageCount || draft.counts?.messages || 0} / {stats.itemCount || 0}</div>
        </div>
        <div style={{ background: '#f8f8f8', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 11, color: '#666' }}>Pedido criado</div>
          <div style={{ fontWeight: 700 }}>{draft.order?.id ? 'Sim' : 'Não'}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, color: '#333', display: 'grid', gap: 4 }}>
        <div><strong>Deadline:</strong> {formatDateTime(draft.commitDeadlineAt)}</div>
        <div><strong>Última msg:</strong> {formatDateTime(draft.lastMessageAt)}</div>
        <div><strong>Endereço:</strong> {delivery.address || '-'}</div>
        <div><strong>Pagamento:</strong> {draft.aggregate?.paymentIntent || '-'}</div>
        <div><strong>Close reason:</strong> {draft.closeReason || '-'}</div>
        {control.awaitingCustomerReply ? (
          <div>
            <strong>Aguardando:</strong> {control.awaitingReplyType || '-'} até {formatDateTime(control.awaitingReplyUntil)}
          </div>
        ) : null}
        {draft.order?.id ? <div><strong>Order:</strong> #{draft.order.orderNumber || '-'} {draft.order.id} ({draft.order.status})</div> : null}
        {draft.order?.canceledAt ? <div><strong>Order cancelado em:</strong> {formatDateTime(draft.order.canceledAt)}</div> : null}
        {draft.order?.cancelReason ? <div><strong>Motivo cancelamento:</strong> {draft.order.cancelReason}</div> : null}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['Itens', flags.hasItems],
          ['Endereço', flags.hasDeliveryAddress],
          ['Pagamento', flags.hasPaymentIntent],
          ['Sinal de Fechamento', flags.hasClosingSignal],
          ['Dúvida', flags.hasQuestionSignal],
          ['Pausado', control.pauseForClarification],
          ['Aguardando Resposta', control.awaitingCustomerReply],
          ['Review', reviewFlags.hasUnclassifiedContextMessage],
        ].map(([label, on]) => (
          <span
            key={label}
            style={{
              fontSize: 12,
              borderRadius: 999,
              padding: '3px 8px',
              border: `1px solid ${on ? '#18794e' : '#ccc'}`,
              color: on ? '#18794e' : '#666',
              background: on ? '#eefaf3' : '#fafafa',
            }}
          >
            {label}: {on ? 'OK' : 'Não'}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canAskQuestion ? (
          <>
            <button onClick={() => onAction('askAddress', draft)} style={{ fontSize: 12 }}>
              Perguntar Endereço
            </button>
            <button onClick={() => onAction('askPayment', draft)} style={{ fontSize: 12 }}>
              Perguntar Pagamento
            </button>
          </>
        ) : null}

        {canFinalizeDraft ? (
          <button onClick={() => onAction('finalizeDraft', draft)} style={{ fontSize: 12 }}>
            Finalizar Draft
          </button>
        ) : null}

        {canCancelDraft ? (
          <button onClick={() => onAction('cancelDraft', draft)} style={{ fontSize: 12 }}>
            Cancelar Draft
          </button>
        ) : null}

        {draft.order?.id && draft.order?.status !== 'CANCELED' ? (
          <button onClick={() => onAction('cancelOrder', draft)} style={{ fontSize: 12 }}>
            Cancelar Order
          </button>
        ) : null}
      </div>

      {draft.aggregate?.itemsPreview?.length ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Itens (preview)</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {draft.aggregate.itemsPreview.map((item, idx) => (
              <li key={`${draft.id}-item-${idx}`}>
                {item.quantity ?? '?'} {item.unit || ''} {item.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.messagesPreview?.length ? (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#444' }}>
            Últimas mensagens ({draft.messagesPreview.length})
          </summary>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {draft.messagesPreview.map((msg) => (
              <div key={msg.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, background: '#fcfcfc' }}>
                <div style={{ fontSize: 11, color: '#666' }}>
                  #{msg.sequence ?? '-'} • {formatDateTime(msg.createdAt)} • {msg.parsedIntent || '-'} • conf {msg.parsedConfidence ?? '-'}
                </div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.messageText || '-'}</div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

export default function OrderDraftPage() {
  const [drafts, setDrafts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState('');
  const [isClient, setIsClient] = useState(false);

  async function loadDrafts() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/orders-drafts?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Falha ao carregar drafts');
      const rawDrafts = data.drafts || [];
      const visibleDrafts =
        statusFilter === 'ALL'
          ? rawDrafts.filter(
              (d) => d.status !== 'CANCELED' && !(d.status === 'COMMITTED' && d.order?.status === 'CANCELED'),
            )
          : rawDrafts;
      setDrafts(visibleDrafts);
      setLastFetchAt(new Date().toISOString());
    } catch (e) {
      setError(e.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.reason || 'Falha na ação');
    }
    return data;
  }

  async function handleAction(action, draft) {
    try {
      let confirmText = '';
      let actionKey = '';

      if (action === 'finalizeDraft') {
        confirmText = `Finalizar draft ${draft.id} agora?`;
        actionKey = `finalize:${draft.id}`;
      } else if (action === 'cancelDraft') {
        confirmText = `Cancelar draft ${draft.id}?`;
        actionKey = `cancel-draft:${draft.id}`;
      } else if (action === 'cancelOrder') {
        confirmText = `Cancelar order ${draft.order?.id}?`;
        actionKey = `cancel-order:${draft.order?.id}`;
      } else if (action === 'askAddress') {
        confirmText = `Enviar pergunta de endereço para ${draft.customer?.name || draft.customer?.phone || 'cliente'}?`;
        actionKey = `ask-address:${draft.id}`;
      } else if (action === 'askPayment') {
        confirmText = `Enviar pergunta de pagamento para ${draft.customer?.name || draft.customer?.phone || 'cliente'}?`;
        actionKey = `ask-payment:${draft.id}`;
      } else {
        return;
      }

      if (!window.confirm(confirmText)) return;

      setActionLoading(actionKey);

      if (action === 'finalizeDraft') {
        await postJson(`/api/admin/order-drafts/${draft.id}/finalize`);
      } else if (action === 'cancelDraft') {
        await postJson(`/api/admin/order-drafts/${draft.id}/cancel`, {
          reason: 'manual_cancel_from_orders_draft_page',
        });
      } else if (action === 'cancelOrder') {
        await postJson(`/api/admin/orders/${draft.order.id}/cancel`, {
          reason: 'manual_cancel_from_orders_draft_page',
        });
      } else if (action === 'askAddress') {
        await postJson(`/api/admin/order-drafts/${draft.id}/ask`, { type: 'address' });
      } else if (action === 'askPayment') {
        await postJson(`/api/admin/order-drafts/${draft.id}/ask`, { type: 'payment' });
      }

      await loadDrafts();
    } catch (e) {
      setError(e.message || 'Erro na ação');
    } finally {
      setActionLoading('');
    }
  }

  useEffect(() => {
    loadDrafts();
  }, [statusFilter]);

  useEffect(() => {
    setIsClient(true);
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
    const es = new EventSource('/api/stream/realtime?topic=orders-drafts');

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadDrafts();
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
  }, [realtimeEnabled, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const d of drafts) {
      const key = d.status || 'UNKNOWN';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    return map;
  }, [drafts]);

  return (
    <main style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px' }}>Order Drafts</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Página simples para validar timer de 3 minutos, agrupamento de mensagens e fechamento antecipado.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={loadDrafts} disabled={loading}>{loading ? 'Carregando...' : 'Atualizar'}</button>
        <label>
          Status:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">OPEN</option>
            <option value="READY_FOR_REVIEW">READY_FOR_REVIEW</option>
            <option value="COMMITTED">COMMITTED</option>
            <option value="CANCELED">CANCELED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={realtimeEnabled}
            onChange={(e) => setRealtimeEnabled(e.target.checked)}
          />
          Tempo real
        </label>
        <span style={{ fontSize: 12, color: '#666' }}>
          {realtimeEnabled ? (realtimeConnected ? 'Conectado' : 'Reconectando...') : 'Desligado'}
        </span>
        <span style={{ fontSize: 12, color: '#666' }} suppressHydrationWarning>
          Agora: {isClient ? new Date(nowMs).toLocaleTimeString('pt-BR') : '--:--:--'} • Última atualização: {isClient ? formatDateTime(lastFetchAt) : '-'}
        </span>
        {actionLoading ? <span style={{ fontSize: 12, color: '#666' }}>Executando: {actionLoading}</span> : null}
      </div>

      {error ? <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div> : null}

      <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['OPEN', 'READY_FOR_REVIEW', 'COMMITTED', 'CANCELED', 'EXPIRED'].map((status) => {
          const count = grouped.get(status)?.length || 0;
          return (
            <div key={status} style={{ border: '1px solid #ddd', borderRadius: 999, padding: '5px 10px', fontSize: 12 }}>
              {status}: <strong>{count}</strong>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {drafts.map((draft) => (
          <DraftCard key={draft.id} draft={draft} nowMs={nowMs} onAction={handleAction} />
        ))}
      </div>

      {!drafts.length && !loading ? (
        <div style={{ color: '#777', marginTop: 20 }}>Nenhum draft encontrado para o filtro selecionado.</div>
      ) : null}
    </main>
  );
}
