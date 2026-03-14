import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import MonthFilterSelect from '@/components/MonthFilterSelect';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, Trophy } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const COLORS = [
  'hsl(234 80% 55%)',
  'hsl(145 65% 42%)',
  'hsl(38 90% 52%)',
  'hsl(0 72% 55%)',
  'hsl(280 65% 55%)',
  'hsl(200 80% 50%)',
  'hsl(20 85% 55%)',
  'hsl(160 60% 40%)',
];

interface SaleRow { product_id: string | null; product_name: string; quantity: number; total_amount: number; sale_date: string }
interface PurchaseRow { total_amount: number; purchase_date: string; category: string }
interface ProductDetail { id: string; sku: string | null; cost_price: number }

export default function Reports() {
  const { profile } = useAuth();
  const { startDate, endDate, selectedMonth } = useMonthFilter();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [productsDetail, setProductsDetail] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    async function fetchAll() {
      setLoading(true);
      const cid = profile!.company_id;
      // Load 3 months for DRE comparison: 2 months back to current end
      const start3 = format(startOfMonth(addMonths(selectedMonth, -2)), 'yyyy-MM-dd');

      const [salesRes, purchasesRes, productsRes] = await Promise.all([
        supabase.from('sales').select('product_id, product_name, quantity, total_amount, sale_date').eq('company_id', cid).gte('sale_date', start3).lte('sale_date', endDate),
        supabase.from('purchases').select('total_amount, purchase_date, category').eq('company_id', cid).gte('purchase_date', start3).lte('purchase_date', endDate),
        supabase.from('products').select('id, sku, cost_price').eq('company_id', cid),
      ]);
      setSales(salesRes.data ?? []);
      setPurchases(purchasesRes.data ?? []);
      setProductsDetail((productsRes.data ?? []) as ProductDetail[]);
      setLoading(false);
    }
    fetchAll();
  }, [startDate, endDate, selectedMonth, profile]);

  // DRE: monthly breakdown for selected month and 2 preceding months
  const dreMonths = [-2, -1, 0].map(offset => {
    const d = addMonths(selectedMonth, offset);
    const start = format(startOfMonth(d), 'yyyy-MM-dd');
    const end = format(endOfMonth(d), 'yyyy-MM-dd');
    const label = format(d, "MMM/yy", { locale: ptBR });
    const receita = sales.filter(s => s.sale_date >= start && s.sale_date <= end).reduce((a, b) => a + Number(b.total_amount), 0);
    const custos = purchases.filter(p => p.purchase_date >= start && p.purchase_date <= end).reduce((a, b) => a + Number(b.total_amount), 0);
    const lucro = receita - custos;
    const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : '0.0';
    return { label, receita, custos, lucro, margem };
  });

  // Profit per product (selected month only)
  const prodDetailMap = new Map(productsDetail.map(p => [p.id, p]));
  const profitByProductMap = new Map<string, { product_id: string | null; product_name: string; qty: number; revenue: number; cost: number; sku: string | null }>();
  sales
    .filter(s => s.sale_date >= startDate && s.sale_date <= endDate)
    .forEach(s => {
      const key = s.product_id ?? s.product_name;
      const existing = profitByProductMap.get(key) ?? {
        product_id: s.product_id,
        product_name: s.product_name,
        qty: 0,
        revenue: 0,
        cost: 0,
        sku: s.product_id ? (prodDetailMap.get(s.product_id)?.sku ?? null) : null,
      };
      const costPrice = s.product_id ? (prodDetailMap.get(s.product_id)?.cost_price ?? 0) : 0;
      existing.qty += Number(s.quantity);
      existing.revenue += Number(s.total_amount);
      existing.cost += costPrice * Number(s.quantity);
      profitByProductMap.set(key, existing);
    });

  const profitByProduct = Array.from(profitByProductMap.values())
    .map(p => ({
      ...p,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  const totalProfitByProduct = profitByProduct.reduce((s, p) => s + p.profit, 0);
  const totalRevByProduct = profitByProduct.reduce((s, p) => s + p.revenue, 0);
  const totalCostByProduct = profitByProduct.reduce((s, p) => s + p.cost, 0);
  const totalQtyByProduct = profitByProduct.reduce((s, p) => s + p.qty, 0);


  // ABC Curve: aggregate by product from the SELECTED MONTH only
  const productMap = new Map<string, { qty: number; revenue: number }>();
  sales
    .filter(s => s.sale_date >= startDate && s.sale_date <= endDate)
    .forEach(s => {
      const prev = productMap.get(s.product_name) ?? { qty: 0, revenue: 0 };
      productMap.set(s.product_name, {
        qty: prev.qty + Number(s.quantity),
        revenue: prev.revenue + Number(s.total_amount),
      });
    });

  const totalRevForABC = Array.from(productMap.values()).reduce((a, b) => a + b.revenue, 0);
  const totalQtyForABC = Array.from(productMap.values()).reduce((a, b) => a + b.qty, 0);

  // ABC by Revenue
  let cumRevenuePercent = 0;
  const abcData = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20)
    .map(([name, v]) => {
      const pct = totalRevForABC > 0 ? (v.revenue / totalRevForABC) * 100 : 0;
      cumRevenuePercent += pct;
      const curve = cumRevenuePercent <= 80 ? 'A' : cumRevenuePercent <= 95 ? 'B' : 'C';
      const qtyPct = totalQtyForABC > 0 ? ((v.qty / totalQtyForABC) * 100).toFixed(1) : '0.0';
      return {
        name: name.length > 22 ? name.slice(0, 22) + '…' : name,
        qty: v.qty,
        revenue: v.revenue,
        pct: pct.toFixed(1),
        cumPct: cumRevenuePercent.toFixed(1),
        qtyPct,
        curve,
      };
    });

  // ABC by Quantity
  let cumQtyPercent = 0;
  const abcQtyData = Array.from(productMap.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 20)
    .map(([name, v]) => {
      const pct = totalQtyForABC > 0 ? (v.qty / totalQtyForABC) * 100 : 0;
      cumQtyPercent += pct;
      const curve = cumQtyPercent <= 80 ? 'A' : cumQtyPercent <= 95 ? 'B' : 'C';
      const revPct = totalRevForABC > 0 ? ((v.revenue / totalRevForABC) * 100).toFixed(1) : '0.0';
      return {
        name: name.length > 22 ? name.slice(0, 22) + '…' : name,
        qty: v.qty,
        revenue: v.revenue,
        pct: pct.toFixed(1),
        cumPct: cumQtyPercent.toFixed(1),
        revPct,
        curve,
      };
    });

  // Cash flow projection: selected month + next month
  const nextMonthEnd = endOfMonth(addMonths(selectedMonth, 1));
  const days = eachDayOfInterval({ start: parseISO(startDate), end: nextMonthEnd });
  const now = new Date();

  const avgDailySales = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate).length > 0
    ? sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate).reduce((a, b) => a + Number(b.total_amount), 0) / days.filter(d => d <= now).length || 1
    : 0;

  const projectionData = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const isHistory = day <= now;
    const actualSales = sales.filter(s => s.sale_date === key).reduce((a, b) => a + Number(b.total_amount), 0);
    const actualCosts = purchases.filter(p => p.purchase_date === key).reduce((a, b) => a + Number(b.total_amount), 0);
    return {
      date: format(day, 'dd/MM'),
      vendas: isHistory ? (actualSales || null) : null,
      custos: isHistory ? (actualCosts || null) : null,
      projecao: !isHistory ? Math.round(avgDailySales * (0.9 + Math.random() * 0.2)) : null,
    };
  }).filter((_, i) => i % 2 === 0);

  // Pie breakdown purchases by category (selected month)
  const catMap = new Map<string, number>();
  purchases.filter(p => p.purchase_date >= startDate && p.purchase_date <= endDate).forEach(p => {
    catMap.set(p.category, (catMap.get(p.category) ?? 0) + Number(p.total_amount));
  });
  const catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  const curMonth = dreMonths[2];
  const monthLabel = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Relatórios & BI
            </h1>
            <p className="text-muted-foreground text-sm mt-1 capitalize">Análise de desempenho — {monthLabel}</p>
          </div>
          <MonthFilterSelect />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* DRE Summary */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-success" /> DRE — Demonstrativo de Resultado
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {dreMonths.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-card border rounded-xl p-5 shadow-card ${i === 2 ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-muted-foreground capitalize">{m.label}</span>
                      {i === 2 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Selecionado</span>}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Receita Bruta</span><span className="font-semibold text-success">{formatBRL(m.receita)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">(-) Custos/Desp.</span><span className="font-semibold text-danger">{formatBRL(m.custos)}</span></div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold text-foreground">Lucro Líquido</span>
                        <span className={`font-bold ${m.lucro >= 0 ? 'text-success' : 'text-danger'}`}>{formatBRL(m.lucro)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Lucratividade</span>
                        <span className={`font-semibold ${Number(m.margem) >= 0 ? 'text-success' : 'text-danger'}`}>{m.margem}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs. Custos vs. Lucro (3 meses)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dreMonths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatBRL(v)} />
                      <Legend />
                      <Bar dataKey="receita" name="Receita" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="custos" name="Custos" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Custos — {format(selectedMonth, 'MMM/yy', { locale: ptBR })}</h3>
                  {catData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de compras neste período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {catData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBRL(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            {/* ABC Curve */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-warning" /> Curva ABC — Produtos por Faturamento
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Classificação: A = top 80% do faturamento | B = 80–95% | C = cauda restante
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                    {[
                      { label: 'A — Top 80% Faturamento', cls: 'bg-success/15 text-success border border-success/30' },
                      { label: 'B — 80–95%', cls: 'bg-warning/15 text-warning border border-warning/30' },
                      { label: 'C — Cauda', cls: 'bg-danger/15 text-danger border border-danger/30' },
                    ].map(({ label, cls }) => (
                      <span key={label} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    {abcData.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">Sem dados de vendas neste período</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {['#', 'Produto', 'Qtd', 'Qtd%', 'Faturamento', '% Rec.', '% Acum.', 'Curva'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {abcData.map((item, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                              <td className="px-3 py-2 font-medium text-foreground max-w-[160px] truncate">{item.name}</td>
                              <td className="px-3 py-2 text-center font-mono">{item.qty}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground text-xs">{item.qtyPct}%</td>
                              <td className="px-3 py-2 text-right font-semibold text-success">{formatBRL(item.revenue)}</td>
                              <td className="px-3 py-2 text-right text-xs">{item.pct}%</td>
                              <td className="px-3 py-2 text-right text-muted-foreground text-xs">{item.cumPct}%</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${
                                  item.curve === 'A' ? 'bg-success text-success-foreground' :
                                  item.curve === 'B' ? 'bg-warning text-warning-foreground' :
                                  'bg-danger text-danger-foreground'
                                }`}>{item.curve}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Produtos — Faturamento (Barras Verticais)</h3>
                  {abcData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de vendas neste período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={abcData.slice(0, 10)} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(v: number) => formatBRL(v)}
                        />
                        <Bar dataKey="revenue" name="Faturamento" radius={[4, 4, 0, 0]}>
                          {abcData.slice(0, 10).map((item, idx) => (
                            <Cell key={idx} fill={item.curve === 'A' ? 'hsl(var(--chart-2))' : item.curve === 'B' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            {/* ABC Curve by Quantity */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-info" /> Curva ABC — Produtos por Quantidade
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Classificação: A = top 80% das unidades vendidas | B = 80–95% | C = cauda restante
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                    {[
                      { label: 'A — Top 80% Qtd', cls: 'bg-info/15 text-info border border-info/30' },
                      { label: 'B — 80–95%', cls: 'bg-warning/15 text-warning border border-warning/30' },
                      { label: 'C — Cauda', cls: 'bg-danger/15 text-danger border border-danger/30' },
                    ].map(({ label, cls }) => (
                      <span key={label} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    {abcQtyData.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">Sem dados de vendas neste período</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {['#', 'Produto', 'Qtd Vendida', 'Qtd%', '% Acum.', 'Faturamento', 'Fat.%', 'Curva'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {abcQtyData.map((item, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                              <td className="px-3 py-2 font-medium text-foreground max-w-[160px] truncate">{item.name}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold">{item.qty}</td>
                              <td className="px-3 py-2 text-center text-xs">{item.pct}%</td>
                              <td className="px-3 py-2 text-right text-muted-foreground text-xs">{item.cumPct}%</td>
                              <td className="px-3 py-2 text-right text-success font-semibold">{formatBRL(item.revenue)}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{item.revPct}%</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${
                                  item.curve === 'A' ? 'bg-info text-white' :
                                  item.curve === 'B' ? 'bg-warning text-warning-foreground' :
                                  'bg-danger text-danger-foreground'
                                }`}>{item.curve}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Produtos — Quantidade Vendida</h3>
                  {abcQtyData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de vendas neste período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={abcQtyData.slice(0, 10)} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(v: number) => [v + ' un.', 'Quantidade']}
                        />
                        <Bar dataKey="qty" name="Quantidade" radius={[4, 4, 0, 0]}>
                          {abcQtyData.slice(0, 10).map((item, idx) => (
                            <Cell key={idx} fill={item.curve === 'A' ? 'hsl(var(--chart-1))' : item.curve === 'B' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>

            {/* Cash Flow Projection */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-info" /> Projeção de Fluxo de Caixa
              </h2>
              <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">Histórico do mês selecionado + projeção mês seguinte baseada na média diária</p>
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-chart-1 inline-block" /> Vendas</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-chart-4 inline-block" /> Custos</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-1 rounded border border-dashed border-chart-3 inline-block" /> Projeção</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(v: number) => formatBRL(v)}
                    />
                    <Line dataKey="vendas" name="Vendas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line dataKey="custos" name="Custos" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line dataKey="projecao" name="Projeção" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} strokeDasharray="6 3" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-muted border border-border rounded-lg text-xs text-foreground flex gap-4 flex-wrap">
                  <span><span className="font-semibold">Média Diária:</span> {formatBRL(avgDailySales)}</span>
                  <span><span className="font-semibold">Projeção Mês Seguinte:</span> {formatBRL(avgDailySales * 30)}</span>
                  <span className={`font-semibold ${curMonth.lucro >= 0 ? 'text-success' : 'text-danger'}`}>
                    Lucro Líquido Mês: {formatBRL(curMonth.lucro)} ({curMonth.margem}%)
                  </span>
                </div>
              </div>
            </section>

            {/* ===== LUCRATIVIDADE POR PRODUTO ===== */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" /> Lucratividade por Produto
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Receita, custo e lucro real por produto — período selecionado
              </p>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Vendido (qtd)', value: String(totalQtyByProduct), color: 'text-primary' },
                  { label: 'Receita Total', value: formatBRL(totalRevByProduct), color: 'text-success' },
                  { label: 'Custo Total', value: formatBRL(totalCostByProduct), color: 'text-danger' },
                  {
                    label: 'Lucro Total',
                    value: formatBRL(totalProfitByProduct),
                    color: totalProfitByProduct >= 0 ? 'text-success' : 'text-danger',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-card">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                    <p className={`text-xl font-display font-bold mt-1 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                {profitByProduct.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Sem vendas neste período
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['#', 'Produto', 'SKU', 'Qtd Vendida', 'Receita', 'Custo Total', 'Lucro', 'Margem %'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {profitByProduct.map((p, i) => (
                          <motion.tr
                            key={p.product_id ?? p.product_name}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, '0')}</td>
                            <td className="px-4 py-3 font-semibold text-foreground max-w-[180px] truncate">{p.product_name}</td>
                            <td className="px-4 py-3">
                              {p.sku
                                ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.sku}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{p.qty}</td>
                            <td className="px-4 py-3 text-right font-semibold text-success">{formatBRL(p.revenue)}</td>
                            <td className="px-4 py-3 text-right text-danger">{formatBRL(p.cost)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold ${p.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatBRL(p.profit)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                p.margin >= 30 ? 'bg-success/15 text-success' :
                                p.margin >= 10 ? 'bg-warning/15 text-warning' :
                                'bg-danger/15 text-danger'
                              }`}>
                                {p.margin.toFixed(1)}%
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40 border-t-2 border-border font-bold">
                          <td colSpan={3} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">TOTAL</td>
                          <td className="px-4 py-3 text-center">{totalQtyByProduct}</td>
                          <td className="px-4 py-3 text-right text-success">{formatBRL(totalRevByProduct)}</td>
                          <td className="px-4 py-3 text-right text-danger">{formatBRL(totalCostByProduct)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={totalProfitByProduct >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(totalProfitByProduct)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              totalRevByProduct > 0 && (totalProfitByProduct / totalRevByProduct * 100) >= 30
                                ? 'bg-success/15 text-success'
                                : totalRevByProduct > 0 && (totalProfitByProduct / totalRevByProduct * 100) >= 10
                                ? 'bg-warning/15 text-warning'
                                : 'bg-danger/15 text-danger'
                            }`}>
                              {totalRevByProduct > 0 ? (totalProfitByProduct / totalRevByProduct * 100).toFixed(1) : '0.0'}%
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
