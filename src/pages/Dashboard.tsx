import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import MonthFilterSelect from '@/components/MonthFilterSelect';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, ShoppingBag, ArrowUpRight, ArrowDownRight, AlertTriangle, Trophy } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KpiCard {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
  gradient: string;
}

interface ProductProfit {
  product_id: string | null;
  product_name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  sku: string | null;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Dashboard() {
  const { profile } = useAuth();
  const { startDate, endDate, selectedMonth } = useMonthFilter();
  const navigate = useNavigate();
  const [salesTotal, setSalesTotal] = useState(0);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [shopeeConfigured, setShopeeConfigured] = useState<boolean | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; vendas: number; compras: number }>>([]);
  const [productProfits, setProductProfits] = useState<ProductProfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    async function fetchData() {
      setLoading(true);
      const cid = profile!.company_id;
      const [salesRes, purchasesRes, productsRes, shopeeRes, salesDetailRes, productsDetailRes] = await Promise.all([
        supabase.from('sales').select('total_amount, sale_date').eq('company_id', cid).gte('sale_date', startDate).lte('sale_date', endDate),
        supabase.from('purchases').select('total_amount, purchase_date').eq('company_id', cid).gte('purchase_date', startDate).lte('purchase_date', endDate),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', cid),
        supabase.from('shop_configs').select('partner_id, shop_id').eq('company_id', cid).maybeSingle(),
        supabase.from('sales').select('product_id, product_name, quantity, unit_price, total_amount').eq('company_id', cid).gte('sale_date', startDate).lte('sale_date', endDate),
        supabase.from('products').select('id, sku, cost_price').eq('company_id', cid),
      ]);

      const sales = salesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];

      setSalesTotal(sales.reduce((s, r) => s + Number(r.total_amount), 0));
      setPurchasesTotal(purchases.reduce((s, r) => s + Number(r.total_amount), 0));
      setTotalProducts(productsRes.count ?? 0);

      const sc = (shopeeRes as { data: { partner_id?: string | null; shop_id?: string | null } | null }).data;
      setShopeeConfigured(!!(sc?.partner_id && sc?.shop_id));

      // Build profit per product
      const productsMap = new Map<string, { sku: string | null; cost_price: number }>();
      (productsDetailRes.data ?? []).forEach((p: { id: string; sku: string | null; cost_price: number }) => {
        productsMap.set(p.id, { sku: p.sku, cost_price: p.cost_price });
      });

      const profitMap = new Map<string, ProductProfit>();
      (salesDetailRes.data ?? []).forEach((s: { product_id: string | null; product_name: string; quantity: number; unit_price: number; total_amount: number }) => {
        const key = s.product_id ?? s.product_name;
        const existing = profitMap.get(key) ?? {
          product_id: s.product_id,
          product_name: s.product_name,
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          sku: s.product_id ? (productsMap.get(s.product_id)?.sku ?? null) : null,
        };
        const costPrice = s.product_id ? (productsMap.get(s.product_id)?.cost_price ?? 0) : 0;
        const qty = Number(s.quantity);
        const revenue = Number(s.total_amount);
        const cost = costPrice * qty;
        existing.qty += qty;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit = existing.revenue - existing.cost;
        existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
        profitMap.set(key, existing);
      });

      const sortedProfits = Array.from(profitMap.values()).sort((a, b) => b.profit - a.profit);
      setProductProfits(sortedProfits);

      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const allDays = eachDayOfInterval({ start, end });
      const last7 = allDays.slice(-7);
      const days = last7.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const label = format(d, 'dd/MM', { locale: ptBR });
        const vendas = sales.filter(s => s.sale_date === key).reduce((sum, s) => sum + Number(s.total_amount), 0);
        const compras = purchases.filter(p => p.purchase_date === key).reduce((sum, p) => sum + Number(p.total_amount), 0);
        return { date: label, vendas, compras };
      });
      setChartData(days);
      setLoading(false);
    }
    fetchData();
  }, [startDate, endDate, profile]);

  const monthLabel = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });

  // Lucro real = receita das vendas − custo de aquisição dos produtos vendidos
  const totalProductProfit = productProfits.reduce((s, p) => s + p.profit, 0);
  const totalProductCost = productProfits.reduce((s, p) => s + p.cost, 0);
  const realMargin = salesTotal > 0 ? ((totalProductProfit / salesTotal) * 100).toFixed(1) : '0.0';

  const kpis: KpiCard[] = [
    {
      title: 'Receita do Mês',
      value: formatBRL(salesTotal),
      change: `Margem: ${realMargin}%`,
      positive: true,
      icon: DollarSign,
      gradient: 'gradient-primary',
    },
    {
      title: 'Lucro nas Vendas',
      value: formatBRL(totalProductProfit),
      change: totalProductProfit >= 0 ? `Margem: ${realMargin}%` : 'Resultado Negativo',
      positive: totalProductProfit >= 0,
      icon: totalProductProfit >= 0 ? TrendingUp : TrendingDown,
      gradient: totalProductProfit >= 0 ? 'gradient-success' : 'gradient-danger',
    },
    {
      title: 'Custo dos Produtos Vendidos',
      value: formatBRL(totalProductCost),
      change: 'Custo real do que foi vendido',
      positive: false,
      icon: ShoppingBag,
      gradient: 'gradient-danger',
    },
    {
      title: 'Produtos Ativos',
      value: totalProducts.toString(),
      change: 'No catálogo',
      positive: true,
      icon: Package,
      gradient: 'gradient-primary',
    },
  ];

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1 capitalize">
              Resumo financeiro — {monthLabel}
            </p>
          </div>
          <MonthFilterSelect />
        </div>

        {/* Shopee banner */}
        {shopeeConfigured === false && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground"
          >
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-semibold">Integração Shopee pendente.</span>{' '}
              Configure em{' '}
              <button
                onClick={() => navigate('/settings')}
                className="underline font-medium hover:opacity-80 transition-opacity"
              >
                Configurações
              </button>{' '}
              para importar seus pedidos.
            </p>
          </motion.div>
        )}

        {/* Lucro Líquido Destaque */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-5 border shadow-card flex items-center justify-between gap-4 ${
            totalProductProfit >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lucro nas Vendas do Período</p>
            <p className={`text-3xl font-display font-bold ${totalProductProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              {loading ? '...' : formatBRL(totalProductProfit)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatBRL(salesTotal)} em vendas − {formatBRL(totalProductCost)} em custo dos produtos
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-display font-bold ${totalProductProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              {realMargin}%
            </div>
            <p className="text-xs text-muted-foreground">Margem</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{kpi.title}</p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">{loading ? '...' : kpi.value}</p>
                </div>
                <div className={`w-10 h-10 ${kpi.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                  <kpi.icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.positive ? 'text-success' : 'text-danger'}`}>
                {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.change}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-card"
          >
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Vendas vs. Compras (últimos 7 dias do mês)</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Legend />
                <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="compras" name="Compras" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6 shadow-card"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-success" />
              <h2 className="font-display font-semibold text-foreground">Fluxo Acumulado</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Line dataKey="vendas" name="Vendas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line dataKey="compras" name="Compras" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* ===== LUCRO POR PRODUTO ===== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl shadow-card overflow-hidden"
        >
          <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning" />
              <div>
                <h2 className="font-display font-semibold text-foreground">Lucro por Produto Vendido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Receita − Custo por unidade vendida no período</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total ganho</p>
                <p className={`font-display font-bold text-lg ${totalProductProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {loading ? '...' : formatBRL(totalProductProfit)}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : productProfits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma venda neste período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['#', 'Produto', 'SKU', 'Qtd Vendida', 'Receita', 'Custo Total', 'Lucro', 'Margem'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productProfits.map((p, i) => (
                    <motion.tr
                      key={p.product_id ?? p.product_name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
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
                      <td className="px-4 py-3 text-right text-success font-semibold">{formatBRL(p.revenue)}</td>
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
                  <tr className="bg-muted/40 border-t-2 border-border">
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">TOTAL</td>
                    <td className="px-4 py-3 text-center font-bold">{productProfits.reduce((s, p) => s + p.qty, 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-success">{formatBRL(productProfits.reduce((s, p) => s + p.revenue, 0))}</td>
                    <td className="px-4 py-3 text-right font-bold text-danger">{formatBRL(productProfits.reduce((s, p) => s + p.cost, 0))}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={totalProductProfit >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(totalProductProfit)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        salesTotal > 0 && (totalProductProfit / salesTotal * 100) >= 30
                          ? 'bg-success/15 text-success'
                          : salesTotal > 0 && (totalProductProfit / salesTotal * 100) >= 10
                          ? 'bg-warning/15 text-warning'
                          : 'bg-danger/15 text-danger'
                      }`}>
                        {salesTotal > 0 ? (totalProductProfit / salesTotal * 100).toFixed(1) : '0.0'}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
