function pad(value) {
  return String(Math.max(0, value)).padStart(2, '0');
}

export function formatElapsedHhMmSs(fromIso, nowMs = Date.now()) {
  if (!fromIso) return '--:--:--';
  const fromMs = new Date(fromIso).getTime();
  if (Number.isNaN(fromMs)) return '--:--:--';
  const deltaSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const hh = Math.floor(deltaSec / 3600);
  const mm = Math.floor((deltaSec % 3600) / 60);
  const ss = deltaSec % 60;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

