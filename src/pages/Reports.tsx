import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, Trophy, Calendar, Filter, ShoppingBag } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nowInBR } from '@/lib/dateBR';

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
interface ProductDetail { id: string; name: string; sku: string | null; cost_price: number }

const MONTH_NAMES = [
  { value: 'all', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function Reports() {
  const { profile, loading: authLoading } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [productsDetail, setProductsDetail] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters: Year and Month
  const [selectedYear, setSelectedYear] = useState<string>(() => String(nowInBR().getFullYear()));
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(() => String(nowInBR().getMonth() + 1));

  useEffect(() => {
    let isMounted = true;
    async function fetchAll() {
      if (!profile?.company_id) {
        if (!authLoading && isMounted) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const cid = profile.company_id;
        const [salesRes, purchasesRes, productsRes] = await Promise.all([
          supabase.from('sales').select('product_id, product_name, quantity, total_amount, sale_date').eq('company_id', cid).order('sale_date', { ascending: true }),
          supabase.from('purchases').select('total_amount, purchase_date, category').eq('company_id', cid).order('purchase_date', { ascending: true }),
          supabase.from('products').select('id, name, sku, cost_price').eq('company_id', cid),
        ]);

        if (!isMounted) return;
        setSales((salesRes.data as SaleRow[]) ?? []);
        setPurchases((purchasesRes.data as PurchaseRow[]) ?? []);
        setProductsDetail((productsRes.data as ProductDetail[]) ?? []);
      } catch (err) {
        console.error('[Reports] Error fetching data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAll();
    return () => { isMounted = false; };
  }, [profile, authLoading]);

  // Product cost mapping (by ID and by exact name)
  const { prodDetailMap, prodByNameMap } = useMemo(() => {
    const byId = new Map<string, ProductDetail>();
    const byName = new Map<string, ProductDetail>();
    productsDetail.forEach(p => {
      byId.set(p.id, p);
      if (p.name) byName.set(p.name.toLowerCase().trim(), p);
    });
    return { prodDetailMap: byId, prodByNameMap: byName };
  }, [productsDetail]);

  const getProductCost = (id: string | null, name: string) => {
    if (id && prodDetailMap.has(id)) return Number(prodDetailMap.get(id)!.cost_price || 0);
    const cleanName = name.toLowerCase().trim();
    if (prodByNameMap.has(cleanName)) return Number(prodByNameMap.get(cleanName)!.cost_price || 0);
    return 0;
  };

  const getProductSku = (id: string | null, name: string) => {
    if (id && prodDetailMap.has(id)) return prodDetailMap.get(id)!.sku;
    const cleanName = name.toLowerCase().trim();
    if (prodByNameMap.has(cleanName)) return prodByNameMap.get(cleanName)!.sku;
    return null;
  };

  // Year/month combinations that actually have sales or purchases data
  const dataYearMonths = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      if (!s.sale_date) return;
      const d = parseISO(s.sale_date);
      if (isNaN(d.getTime())) return;
      set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    });
    purchases.forEach(p => {
      if (!p.purchase_date) return;
      const d = parseISO(p.purchase_date);
      if (isNaN(d.getTime())) return;
      set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    });
    return set;
  }, [sales, purchases]);

  // Only years that have at least one sale or purchase
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    dataYearMonths.forEach(key => years.add(Number(key.split('-')[0])));
    return Array.from(years).sort((a, b) => b - a);
  }, [dataYearMonths]);

  // Only months (for the selected year, or across all years when "all") that have data
  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    dataYearMonths.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      if (selectedYear === 'all' || y === Number(selectedYear)) months.add(m);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [dataYearMonths, selectedYear]);

  // Keep filters pointing at real data: fall back once loading finishes and the current
  // selection no longer matches any existing sale/purchase
  useEffect(() => {
    if (loading) return;
    if (availableYears.length === 0) {
      if (selectedYear !== 'all') setSelectedYear('all');
      if (selectedMonthFilter !== 'all') setSelectedMonthFilter('all');
      return;
    }
    if (selectedYear !== 'all' && !availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [loading, availableYears, selectedYear]);

  useEffect(() => {
    if (loading) return;
    if (selectedMonthFilter !== 'all' && !availableMonths.includes(Number(selectedMonthFilter))) {
      setSelectedMonthFilter('all');
    }
  }, [loading, availableMonths, selectedMonthFilter]);

  // Filter sales and purchases according to Year and Month filters
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!s.sale_date) return false;
      const d = parseISO(s.sale_date);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const matchYear = selectedYear === 'all' || y === Number(selectedYear);
      const matchMonth = selectedMonthFilter === 'all' || m === Number(selectedMonthFilter);
      return matchYear && matchMonth;
    });
  }, [sales, selectedYear, selectedMonthFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!p.purchase_date) return false;
      const d = parseISO(p.purchase_date);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const matchYear = selectedYear === 'all' || y === Number(selectedYear);
      const matchMonth = selectedMonthFilter === 'all' || m === Number(selectedMonthFilter);
      return matchYear && matchMonth;
    });
  }, [purchases, selectedYear, selectedMonthFilter]);

  // DRE Monthly Cards Breakdown (last 3 months or per selected range)
  const dreMonths = useMemo(() => {
    if (selectedYear !== 'all' && selectedMonthFilter !== 'all') {
      // 3 consecutive months ending at selected month/year
      const yearNum = Number(selectedYear);
      const monthNum = Number(selectedMonthFilter) - 1; // 0-indexed
      const targetDate = new Date(yearNum, monthNum, 1);

      return [-2, -1, 0].map(offset => {
        const d = subMonths(targetDate, -offset);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const label = format(d, "MMM/yy", { locale: ptBR });

        const mSales = sales.filter(s => {
          const sd = parseISO(s.sale_date);
          return sd.getFullYear() === y && (sd.getMonth() + 1) === m;
        });

        const mPurchases = purchases.filter(p => {
          const pd = parseISO(p.purchase_date);
          return pd.getFullYear() === y && (pd.getMonth() + 1) === m;
        });

        const receita = mSales.reduce((a, b) => a + Number(b.total_amount || 0), 0);
        const cpv = mSales.reduce((a, b) => a + (getProductCost(b.product_id, b.product_name) * Number(b.quantity || 1)), 0);
        const comprasEstoque = mPurchases.reduce((a, b) => a + Number(b.total_amount || 0), 0);
        const lucro = receita - cpv;
        const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : '0.0';

        return { label, receita, cpv, comprasEstoque, lucro, margem };
      });
    }

    // "Todos os meses" or "Todos os anos": Summarize overall filtered period
    const receita = filteredSales.reduce((a, b) => a + Number(b.total_amount || 0), 0);
    const cpv = filteredSales.reduce((a, b) => a + (getProductCost(b.product_id, b.product_name) * Number(b.quantity || 1)), 0);
    const comprasEstoque = filteredPurchases.reduce((a, b) => a + Number(b.total_amount || 0), 0);
    const lucro = receita - cpv;
    const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : '0.0';

    const periodLabel = selectedYear === 'all' && selectedMonthFilter === 'all'
      ? 'Todo o Período'
      : selectedYear === 'all'
      ? `${MONTH_NAMES.find(m => m.value === selectedMonthFilter)?.label} (Todos os anos)`
      : `Ano ${selectedYear}`;

    return [{ label: periodLabel, receita, cpv, comprasEstoque, lucro, margem }];
  }, [sales, purchases, selectedYear, selectedMonthFilter, prodDetailMap, prodByNameMap]);

  // Profit per product for filtered selection
  const profitByProduct = useMemo(() => {
    const profitMap = new Map<string, { product_id: string | null; product_name: string; qty: number; revenue: number; cost: number; sku: string | null }>();

    filteredSales.forEach(s => {
      const key = s.product_id ?? s.product_name.toLowerCase().trim();
      const costPrice = getProductCost(s.product_id, s.product_name);
      const sku = getProductSku(s.product_id, s.product_name);

      const existing = profitMap.get(key) ?? {
        product_id: s.product_id,
        product_name: s.product_name,
        qty: 0,
        revenue: 0,
        cost: 0,
        sku,
      };

      const qty = Number(s.quantity || 0);
      const revenue = Number(s.total_amount || 0);
      existing.qty += qty;
      existing.revenue += revenue;
      existing.cost += costPrice * qty;

      profitMap.set(key, existing);
    });

    return Array.from(profitMap.values())
      .map(p => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredSales, prodDetailMap, prodByNameMap]);

  const totalProfitByProduct = useMemo(() => profitByProduct.reduce((s, p) => s + p.profit, 0), [profitByProduct]);
  const totalRevByProduct = useMemo(() => profitByProduct.reduce((s, p) => s + p.revenue, 0), [profitByProduct]);
  const totalCostByProduct = useMemo(() => profitByProduct.reduce((s, p) => s + p.cost, 0), [profitByProduct]);
  const totalQtyByProduct = useMemo(() => profitByProduct.reduce((s, p) => s + p.qty, 0), [profitByProduct]);

  // ABC Curve by Revenue
  const abcData = useMemo(() => {
    const productMap = new Map<string, { qty: number; revenue: number }>();
    filteredSales.forEach(s => {
      const prev = productMap.get(s.product_name) ?? { qty: 0, revenue: 0 };
      productMap.set(s.product_name, {
        qty: prev.qty + Number(s.quantity || 0),
        revenue: prev.revenue + Number(s.total_amount || 0),
      });
    });

    const totalRev = Array.from(productMap.values()).reduce((a, b) => a + b.revenue, 0);
    const totalQty = Array.from(productMap.values()).reduce((a, b) => a + b.qty, 0);

    let cumRevenuePercent = 0;
    return Array.from(productMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 20)
      .map(([name, v]) => {
        const pct = totalRev > 0 ? (v.revenue / totalRev) * 100 : 0;
        cumRevenuePercent += pct;
        const curve = cumRevenuePercent <= 80 ? 'A' : cumRevenuePercent <= 95 ? 'B' : 'C';
        const qtyPct = totalQty > 0 ? ((v.qty / totalQty) * 100).toFixed(1) : '0.0';
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
  }, [filteredSales]);

  // ABC Curve by Quantity
  const abcQtyData = useMemo(() => {
    const productMap = new Map<string, { qty: number; revenue: number }>();
    filteredSales.forEach(s => {
      const prev = productMap.get(s.product_name) ?? { qty: 0, revenue: 0 };
      productMap.set(s.product_name, {
        qty: prev.qty + Number(s.quantity || 0),
        revenue: prev.revenue + Number(s.total_amount || 0),
      });
    });

    const totalRev = Array.from(productMap.values()).reduce((a, b) => a + b.revenue, 0);
    const totalQty = Array.from(productMap.values()).reduce((a, b) => a + b.qty, 0);

    let cumQtyPercent = 0;
    return Array.from(productMap.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 20)
      .map(([name, v]) => {
        const pct = totalQty > 0 ? (v.qty / totalQty) * 100 : 0;
        cumQtyPercent += pct;
        const curve = cumQtyPercent <= 80 ? 'A' : cumQtyPercent <= 95 ? 'B' : 'C';
        const revPct = totalRev > 0 ? ((v.revenue / totalRev) * 100).toFixed(1) : '0.0';
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
  }, [filteredSales]);

  // Purchases category breakdown
  const catData = useMemo(() => {
    const catMap = new Map<string, number>();
    filteredPurchases.forEach(p => {
      catMap.set(p.category, (catMap.get(p.category) ?? 0) + Number(p.total_amount || 0));
    });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredPurchases]);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header with Year and Month Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Relatórios & BI
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Análise de desempenho financeiro e produtos</p>
          </div>

          {/* Dynamic Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase">
              <Filter className="w-3.5 h-3.5 text-primary" /> Período:
            </div>

            {/* Select Ano — só lista anos com vendas ou compras registradas */}
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
              <SelectTrigger className="h-8 w-36 text-xs font-medium bg-background border-border">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Mês — só lista meses com vendas ou compras registradas */}
            <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter} disabled={availableMonths.length === 0}>
              <SelectTrigger className="h-8 w-40 text-xs font-medium bg-background border-border">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MONTH_NAMES.filter(m => m.value !== 'all' && availableMonths.includes(Number(m.value))).map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              <div className={`grid grid-cols-1 ${dreMonths.length > 1 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 mb-6`}>
                {dreMonths.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-card border rounded-xl p-5 shadow-card ${i === dreMonths.length - 1 ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-muted-foreground capitalize">{m.label}</span>
                      {i === dreMonths.length - 1 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Período Ativo</span>}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Receita Bruta</span><span className="font-semibold text-success">{formatBRL(m.receita)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">(-) Custo dos Prod. Vendidos (CPV)</span><span className="font-semibold text-danger">{formatBRL(m.cpv)}</span></div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold text-foreground">Lucro Bruto (Vendas)</span>
                        <span className={`font-bold ${m.lucro >= 0 ? 'text-success' : 'text-danger'}`}>{formatBRL(m.lucro)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Margem de Lucro</span>
                        <span className={`font-semibold ${Number(m.margem) >= 0 ? 'text-success' : 'text-danger'}`}>{m.margem}%</span>
                      </div>
                      {m.comprasEstoque > 0 && (
                        <div className="pt-2 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
                          <span>Comprar para Estoque (Investimento)</span>
                          <span className="font-mono text-warning">{formatBRL(m.comprasEstoque)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs. CPV vs. Lucro</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={dreMonths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => v === 0 ? 'R$0' : Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatBRL(v)} />
                      <Legend />
                      <Bar dataKey="receita" name="Receita" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cpv" name="Custo dos Prod. (CPV)" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Compras de Estoque por Categoria</h3>
                  {catData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de compras neste período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
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
                  <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Produtos — Faturamento</h3>
                  {abcData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de vendas neste período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={abcData.slice(0, 10)} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => v === 0 ? 'R$0' : Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`} />
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

            {/* ===== LUCRATIVIDADE POR PRODUTO ===== */}
            <section>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" /> Lucratividade por Produto (Período Selecionado)
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Receita, custo do produto e lucro real — filtrado pelo período selecionado
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
                          <tr
                            key={p.product_id ?? p.product_name}
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
                          </tr>
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
