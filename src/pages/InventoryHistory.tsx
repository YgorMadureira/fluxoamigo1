import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, History, Loader2, Package, TrendingUp, TrendingDown, SlidersHorizontal, Lock, ArrowLeft, DollarSign, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogRow {
  id: string;
  product_id: string;
  type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  justification: string | null;
  user_name: string | null;
  user_id: string | null;
  created_at: string;
  product_name?: string;
  category?: string | null;
  cost_price?: number;
}

interface Product { id: string; name: string; category: string | null; cost_price: number }

const typeLabel: Record<string, { label: string; cls: string }> = {
  adjustment: { label: 'Ajuste Manual', cls: 'text-warning border-warning/30 bg-warning/10' },
  purchase: { label: 'Entrada (Compra)', cls: 'text-success border-success/30 bg-success/10' },
  sale: { label: 'Saída (Venda)', cls: 'text-danger border-danger/30 bg-danger/10' },
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function InventoryHistory() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;

    const prodsRes = await supabase
      .from('products')
      .select('id, name, category, cost_price')
      .eq('company_id', cid)
      .order('name');

    const prods = (prodsRes.data ?? []) as Product[];
    setProducts(prods);

    if (prods.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const productIds = prods.map(p => p.id);
    const costMap = new Map(prods.map(p => [p.id, p.cost_price ?? 0]));

    const logsRes = await supabase
      .from('inventory_logs')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .limit(200);

    const rawLogs = (logsRes.data ?? []) as LogRow[];
    const enriched = rawLogs.map(l => ({
      ...l,
      product_name: prods.find(p => p.id === l.product_id)?.name ?? 'Produto removido',
      category: prods.find(p => p.id === l.product_id)?.category ?? null,
      cost_price: costMap.get(l.product_id) ?? 0,
    }));
    setLogs(enriched);

    if (logsRes.error) toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const matchProduct = filterProduct === 'all' || l.product_id === filterProduct;
    const matchUser = !filterUser || (l.user_name ?? '').toLowerCase().includes(filterUser.toLowerCase());
    const matchSearch = !search ||
      (l.product_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.justification ?? '').toLowerCase().includes(search.toLowerCase());
    return matchProduct && matchUser && matchSearch;
  });

  const uniqueUsers = [...new Set(logs.map(l => l.user_name).filter(Boolean))];

  // Financial impact calculations
  const adjustmentLoss = filtered
    .filter(l => l.type === 'adjustment' && l.quantity_change < 0)
    .reduce((s, l) => s + Math.abs(l.quantity_change) * (l.cost_price ?? 0), 0);

  const adjustmentGain = filtered
    .filter(l => l.type === 'adjustment' && l.quantity_change > 0)
    .reduce((s, l) => s + l.quantity_change * (l.cost_price ?? 0), 0);

  const purchaseValue = filtered
    .filter(l => l.type === 'purchase')
    .reduce((s, l) => s + Math.abs(l.quantity_change) * (l.cost_price ?? 0), 0);

  const saleValue = filtered
    .filter(l => l.type === 'sale')
    .reduce((s, l) => s + Math.abs(l.quantity_change) * (l.cost_price ?? 0), 0);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="h-8 w-8 p-0 hover:bg-muted">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <History className="w-6 h-6 text-primary" /> Histórico de Ajustes
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Registro imutável de todas as movimentações de estoque</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/inventory')} variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Estoque
            </Button>
            <Button onClick={fetchLogs} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Read-only notice */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/60 border border-border">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Histórico somente leitura.</span>{' '}
            Para corrigir um lançamento, realize um novo ajuste com a justificativa "Correção de lançamento anterior".
          </p>
        </div>

        {/* Contagem */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Movimentações', value: String(logs.length), color: 'text-foreground' },
            { label: 'Ajustes Manuais', value: String(logs.filter(l => l.type === 'adjustment').length), color: 'text-warning' },
            { label: 'Entradas (Compras)', value: String(logs.filter(l => l.type === 'purchase').length), color: 'text-success' },
            { label: 'Saídas (Vendas)', value: String(logs.filter(l => l.type === 'sale').length), color: 'text-danger' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
              <p className={`text-xl font-display font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Impacto Financeiro */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Impacto Financeiro (pelo custo do produto)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Perdas por ajuste */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-danger/5 border border-danger/20 rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perdas por Ajuste</p>
              </div>
              <p className="text-xl font-display font-bold text-danger">{formatBRL(adjustmentLoss)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.filter(l => l.type === 'adjustment' && l.quantity_change < 0).length} baixas manuais
              </p>
            </motion.div>

            {/* Ganhos por ajuste */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-success/5 border border-success/20 rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-success" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entradas por Ajuste</p>
              </div>
              <p className="text-xl font-display font-bold text-success">{formatBRL(adjustmentGain)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.filter(l => l.type === 'adjustment' && l.quantity_change > 0).length} adições manuais
              </p>
            </motion.div>

            {/* Valor adicionado por compras */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adicionado (Compras)</p>
              </div>
              <p className="text-xl font-display font-bold text-primary">{formatBRL(purchaseValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.filter(l => l.type === 'purchase').length} entradas por compra
              </p>
            </motion.div>

            {/* Valor baixado por vendas */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-warning/5 border border-warning/20 rounded-xl p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-warning" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Baixado (Vendas)</p>
              </div>
              <p className="text-xl font-display font-bold text-warning">{formatBRL(saleValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.filter(l => l.type === 'sale').length} saídas por venda
              </p>
            </motion.div>

          </div>
        </div>

        {/* Filters + Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto ou justificativa..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Filtrar produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative min-w-[160px]">
                <Input
                  placeholder="Filtrar por usuário..."
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="h-9"
                  list="users-list"
                />
                <datalist id="users-list">
                  {uniqueUsers.map(u => <option key={u!} value={u!} />)}
                </datalist>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Data/Hora', 'Produto', 'Categoria', 'Tipo', 'Antes', 'Variação', 'Depois', 'Impacto (R$)', 'Justificativa', 'Usuário'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => {
                    const t = typeLabel[l.type] ?? { label: l.type, cls: 'text-foreground border-border bg-muted' };
                    const impact = Math.abs(l.quantity_change) * (l.cost_price ?? 0);
                    const isNegative = l.quantity_change < 0;
                    return (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {format(new Date(l.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {l.product_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{l.category ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${t.cls}`}>{t.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-muted-foreground">{l.quantity_before}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`flex items-center justify-center gap-1 font-bold font-mono ${isNegative ? 'text-danger' : 'text-success'}`}>
                            {isNegative ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {l.quantity_change >= 0 ? '+' : ''}{l.quantity_change}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-foreground">{l.quantity_after}</td>
                        <td className="px-4 py-3 text-right">
                          {(l.cost_price ?? 0) > 0 ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              isNegative
                                ? 'bg-danger/10 text-danger'
                                : 'bg-success/10 text-success'
                            }`}>
                              {isNegative ? '−' : '+'}{formatBRL(impact)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem custo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={l.justification ?? ''}>
                          {l.justification ?? <span className="opacity-40 italic">Sem justificativa</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {l.user_name ?? '—'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
