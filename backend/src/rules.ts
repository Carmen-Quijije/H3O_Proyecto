export function progressColor(percent: number) {
  return percent < 25 ? '#ef5350' : percent < 50 ? '#f39b38' : percent < 75 ? '#e2be28' : percent < 100 ? '#29ad82' : '#239de5';
}
export function localTime(date: Date, timezone: string) {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const get = (key: string) => p.find(x => x.type === key)!.value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}
export function reminderSlot(date: Date, user: any) {
  const t = localTime(date, user.timezone);
  // Ventana diurna inclusiva. La validación impide intervalos que crucen medianoche.
  if (t.minute < user.start_min || t.minute > user.end_min || (t.minute-user.start_min)%user.frequency !== 0) return null;
  return `${t.day}:${t.minute}`;
}
// Reparte la meta personal dentro del horario elegido; no estima un estado médico.
export function expectedConsumption(date: Date, user: any) {
  const minute = localTime(date, user.timezone).minute;
  const fraction = Math.max(0, Math.min(1, (minute - user.start_min) / (user.end_min - user.start_min)));
  return Math.floor(user.goal * fraction);
}
export function waterReminderDue(date: Date, user: any, total: number) {
  return !!user.reminders && reminderSlot(date, user) !== null && total < expectedConsumption(date, user);
}
export function activeBreakDue(date: Date, user: any) {
  const minute = localTime(date, user.timezone).minute;
  return !!user.active_breaks && (minute === user.break_first_min || minute === user.break_second_min);
}
export function breakSuggestion(date: Date, user: any) {
  const first = localTime(date, user.timezone).minute === user.break_first_min;
  return first
    ? 'Pausa activa de 5 min: camina 2 min, mueve suavemente hombros y brazos 2 min y moviliza tobillos 1 min.'
    : 'Pausa activa de 5 min: camina 2 min, estira suavemente brazos 1 min, mueve hombros 1 min y manos 1 min.';
}
