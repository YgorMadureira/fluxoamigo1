import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

/** Generates a list of the last 24 months + 2 future months from today */
function generateMonthOptions() {
  const today = new Date();
  const months: { value: string; label: string; date: Date }[] = [];
  for (let i = -2; i <= 24; i++) {
    const d = startOfMonth(subMonths(today, i));
    const value = format(d, 'yyyy-MM');
    const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
    months.push({ value, date: d, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

export default function MonthFilterSelect() {
  const { selectedMonth, setSelectedMonth } = useMonthFilter();
  const options = useMemo(() => generateMonthOptions(), []);
  const currentValue = format(selectedMonth, 'yyyy-MM');

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select
        value={currentValue}
        onValueChange={val => {
          const found = options.find(o => o.value === val);
          if (found) setSelectedMonth(found.date);
        }}
      >
        <SelectTrigger className="h-9 w-52 text-sm bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
