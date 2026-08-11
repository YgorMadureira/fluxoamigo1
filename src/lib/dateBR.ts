/**
 * Date helpers anchored to America/Sao_Paulo (Brasília), independent of the
 * device/browser's own system timezone. `new Date()` + date-fns `format()`
 * read the *device's* local timezone, which silently produces the wrong
 * calendar day for users whose OS/browser clock isn't set to Brasília time.
 */

const BR_TIMEZONE = 'America/Sao_Paulo';

/**
 * A Date whose local getters (getFullYear/getMonth/getDate/getHours...)
 * reflect the current wall-clock date & time in Brasília, regardless of the
 * device's actual timezone. Feed this into date-fns functions that read
 * local time components (startOfMonth, format, etc) instead of `new Date()`.
 */
export function nowInBR(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BR_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/** Today's calendar date in Brasília, as 'yyyy-MM-dd' — what `<input type="date">` expects. */
export function todayBR(): string {
  const d = nowInBR();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a full timestamp (e.g. a `created_at` timestamptz) as
 * 'dd/MM/yyyy HH:mm' in Brasília time, regardless of the device's own
 * timezone.
 */
export function formatDateTimeBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const datePart = new Intl.DateTimeFormat('pt-BR', { timeZone: BR_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const timePart = new Intl.DateTimeFormat('pt-BR', { timeZone: BR_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${datePart} ${timePart}`;
}

/**
 * Formats a date for display as 'dd/MM/yyyy'.
 *
 * For a plain 'yyyy-MM-dd' value (what every `date` column in this app
 * stores — sale_date, purchase_date, received_date, payment_date) this is
 * pure string re-ordering: a date-only value has no time component, so
 * there is nothing to convert between timezones, and routing it through a
 * `Date` object at all is exactly what causes the classic off-by-one-day
 * bug. Anything else (a full timestamp, e.g. `created_at`) falls back to
 * `formatDateTimeBR` and keeps only the date part.
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return formatDateTimeBR(dateStr).split(' ')[0] || dateStr;
}
