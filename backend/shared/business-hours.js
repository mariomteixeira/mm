/**
 * Horário de funcionamento do Mercado MM (America/Sao_Paulo)
 * Seg-Sáb: 06:00 - 21:00
 * Domingo: 07:00 - 14:00
 */

const SCHEDULE = {
  Mon: { open: 6, close: 21 },
  Tue: { open: 6, close: 21 },
  Wed: { open: 6, close: 21 },
  Thu: { open: 6, close: 21 },
  Fri: { open: 6, close: 21 },
  Sat: { open: 6, close: 21 },
  Sun: { open: 6.5, close: 14 },
};

function getSaoPauloTime(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  return {
    weekday: parts.find((p) => p.type === 'weekday')?.value,
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

export function isWithinBusinessHours(now = new Date()) {
  const { weekday, hour, minute } = getSaoPauloTime(now);
  const schedule = SCHEDULE[weekday];
  if (!schedule) return false;
  const current = hour + minute / 60;
  return current >= schedule.open && current < schedule.close;
}

export function getBusinessHoursMessage() {
  const { weekday, hour } = getSaoPauloTime();
  const todaySchedule = SCHEDULE[weekday];

  if (!todaySchedule) return null;

  const current = hour + minute / 60;

  // Antes do horário de abertura
  if (current < todaySchedule.open) {
    const openLabel = todaySchedule.open % 1 === 0 ? `${todaySchedule.open}h` : `${Math.floor(todaySchedule.open)}h${Math.round((todaySchedule.open % 1) * 60)}`;
    return `Olá! O Mercado MM abre hoje às ${openLabel}. Deixe sua mensagem que responderemos assim que abrirmos! 😊\n\nNosso horário: Seg-Sáb 6h às 21h | Dom 6h30 às 14h`;
  }

  // Depois do horário de fechamento
  if (current >= todaySchedule.close) {
    // Verificar próximo dia de funcionamento
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = days.indexOf(weekday);

    for (let i = 1; i <= 7; i++) {
      const nextDay = days[(todayIndex + i) % 7];
      const nextSchedule = SCHEDULE[nextDay];
      if (nextSchedule) {
        const dayNames = { Sun: 'domingo', Mon: 'segunda', Tue: 'terça', Wed: 'quarta', Thu: 'quinta', Fri: 'sexta', Sat: 'sábado' };
        const isAmanha = i === 1;
        const label = isAmanha ? 'amanhã' : dayNames[nextDay];
        const nextOpenLabel = nextSchedule.open % 1 === 0 ? `${nextSchedule.open}h` : `${Math.floor(nextSchedule.open)}h${Math.round((nextSchedule.open % 1) * 60)}`;
        return `Olá! O Mercado MM já encerrou o expediente de hoje. Voltamos ${label} às ${nextOpenLabel}. Deixe sua mensagem que responderemos na reabertura! 😊\n\nNosso horário: Seg-Sáb 6h às 21h | Dom 6h30 às 14h`;
      }
    }
  }

  return null; // Dentro do horário, sem mensagem
}

export function getScheduleForDisplay() {
  return {
    weekdays: 'Seg-Sáb: 06:00 - 21:00',
    sunday: 'Dom: 06:30 - 14:00',
  };
}
