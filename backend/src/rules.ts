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
