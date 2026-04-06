import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import { startOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function MonthFilterSelect() {
  const { selectedMonth, setSelectedMonth } = useMonthFilter();
  const { profile } = useAuth();
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string; date: Date }[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;

    async function fetchMonths() {
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from('sales').select('sale_date').eq('company_id', cid),
        supabase.from('purchases').select('purchase_date').eq('company_id', cid),
      ]);

      const monthSet = new Set<string>();
      // Always include current month
      monthSet.add(format(new Date(), 'yyyy-MM'));

      (salesRes.data ?? []).forEach((s: { sale_date: string }) => {
        if (s.sale_date) monthSet.add(s.sale_date.slice(0, 7));
      });
      (purchasesRes.data ?? []).forEach((p: { purchase_date: string }) => {
        if (p.purchase_date) monthSet.add(p.purchase_date.slice(0, 7));
      });

      const months = Array.from(monthSet)
        .sort((a, b) => b.localeCompare(a))
        .map(val => {
          const d = startOfMonth(parseISO(val + '-01'));
          const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
          return { value: val, date: d, label: label.charAt(0).toUpperCase() + label.slice(1) };
        });

      setAvailableMonths(months);
    }
    fetchMonths();
  }, [profile]);

  const currentValue = format(selectedMonth, 'yyyy-MM');

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select
        value={currentValue}
        onValueChange={val => {
          const found = availableMonths.find(o => o.value === val);
          if (found) setSelectedMonth(found.date);
        }}
      >
        <SelectTrigger className="h-9 w-52 text-sm bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {availableMonths.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
