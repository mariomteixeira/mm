/**
 * Horário de funcionamento do Mercado MM (America/Sao_Paulo)
 * Seg-Sex: 06:00 - 21:00
 * Domingo: 07:00 - 14:00
 * Sábado: Fechado
 */

const SCHEDULE = {
  Mon: { open: 6, close: 21 },
  Tue: { open: 6, close: 21 },
  Wed: { open: 6, close: 21 },
  Thu: { open: 6, close: 21 },
  Fri: { open: 6, close: 21 },
  Sat: null, // Fechado
  Sun: { open: 7, close: 14 },
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
  const { weekday, hour } = getSaoPauloTime(now);
  const schedule = SCHEDULE[weekday];
  if (!schedule) return false;
  return hour >= schedule.open && hour < schedule.close;
}

export function getBusinessHoursMessage() {
  const { weekday, hour } = getSaoPauloTime();
  const todaySchedule = SCHEDULE[weekday];

  // Sábado - fechado
  if (!todaySchedule) {
    return 'Olá! O Mercado MM está fechado aos sábados. Funcionamos de segunda a sexta das 6h às 21h e domingo das 7h às 14h. Deixe sua mensagem que responderemos na reabertura! 😊';
  }

  // Antes do horário de abertura
  if (hour < todaySchedule.open) {
    return `Olá! O Mercado MM abre hoje às ${todaySchedule.open}h. Deixe sua mensagem que responderemos assim que abrirmos! 😊`;
  }

  // Depois do horário de fechamento
  if (hour >= todaySchedule.close) {
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
        return `Olá! O Mercado MM já encerrou o expediente de hoje. Voltamos ${label} às ${nextSchedule.open}h. Deixe sua mensagem que responderemos na reabertura! 😊`;
      }
    }
  }

  return null; // Dentro do horário, sem mensagem
}

export function getScheduleForDisplay() {
  return {
    weekdays: 'Seg-Sex: 06:00 - 21:00',
    sunday: 'Dom: 07:00 - 14:00',
    saturday: 'Sáb: Fechado',
  };
}
