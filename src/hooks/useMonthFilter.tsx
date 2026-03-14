import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface MonthFilterContextValue {
  selectedMonth: Date;
  setSelectedMonth: (d: Date) => void;
  startDate: string;
  endDate: string;
  label: string;
}

const MonthFilterContext = createContext<MonthFilterContextValue | null>(null);

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

  const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const label = format(selectedMonth, 'MMMM yyyy');

  return (
    <MonthFilterContext.Provider value={{ selectedMonth, setSelectedMonth, startDate, endDate, label }}>
      {children}
    </MonthFilterContext.Provider>
  );
}

export function useMonthFilter() {
  const ctx = useContext(MonthFilterContext);
  if (!ctx) throw new Error('useMonthFilter must be used within MonthFilterProvider');
  return ctx;
}
