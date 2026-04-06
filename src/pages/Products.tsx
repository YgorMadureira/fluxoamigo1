import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Search, RefreshCw, Package, Loader2,
  AlertTriangle, CheckCircle, Wand2, Tag, DollarSign, Hash, Filter, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/database.types';

type Product = Database['public']['Tables']['products']['Row'];
interface Category { id: string; name: string; }

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const emptyForm = {
  name: '',
  sku: '',
  unit_price: '',
  min_stock: 5,
  category: '',
  category_id: '',
};

async function generateSku(companyId: string): Promise<string> {
  const { data } = await supabase
    .from('products')
    .select('sku')
    .eq('company_id', companyId)
    .not('sku', 'is', null);
  const nums = (data ?? []).map(p => parseInt(p.sku ?? '', 10)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const digits = Math.max(3, String(next).length);
  return String(next).padStart(digits, '0');
}

export default function Products() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingSku, setGeneratingSku] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
      supabase.from('categories' as never).select('id, name').eq('company_id', profile.company_id).order('name') as unknown as Promise<{ data: Category[] | null; error: unknown }>,
    ]);
    if (prodRes.error) toast({ title: 'Erro ao carregar produtos', variant: 'destructive' });
    else setProducts(prodRes.data ?? []);
    setCategories(catRes.data ?? []);
    setLoading(false);
  }, [toast, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateSku = async () => {
    if (!profile?.company_id) return;
    setGeneratingSku(true);
    const sku = await generateSku(profile.company_id);
    setForm(f => ({ ...f, sku }));
    setGeneratingSku(false);
  };

  const openNew = async () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setDialogOpen(true);
    if (profile?.company_id) {
      setGeneratingSku(true);
      const sku = await generateSku(profile.company_id);
      setForm(f => ({ ...f, sku }));
      setGeneratingSku(false);
    }
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      unit_price: String(p.unit_price),
      min_stock: p.min_stock ?? 5,
      category: p.category ?? '',
      category_id: p.category_id ?? '',
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      sku: form.sku || null,
      unit_price: parseFloat(form.unit_price) || 0,
      min_stock: Number(form.min_stock) || 5,
      category: form.category || null,
      category_id: form.category_id || null,
      company_id: profile?.company_id ?? '',
      updated_at: new Date().toISOString(),
    };
    if (!editingId) {
      payload.stock_quantity = 0;
      payload.cost_price = 0;
    }

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('products').update(payload as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('products').insert(payload as never);
      error = res.error as { message: string } | null;
    }

    if (error) {
      toast({ title: 'Erro ao salvar produto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? '✅ Produto atualizado!' : '✅ Produto cadastrado com sucesso!' });
      setDialogOpen(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (product && product.stock_quantity > 0) {
      toast({ title: 'Não é possível excluir', description: 'Somente produtos com estoque zerado podem ser excluídos. Faça um ajuste de estoque antes.', variant: 'destructive' });
      setDeleteId(null);
      return;
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' });
    else {
      toast({ title: 'Produto excluído!' });
      setProducts(prev => prev.filter(p => p.id !== id));
    }
    setDeleteId(null);
  };

  const getStockStatus = (p: Product) => {
    const min = p.min_stock ?? 5;
    if (p.stock_quantity === 0) return { label: 'Sem estoque', color: 'text-danger', bg: 'bg-danger/10 border-danger/20' };
    if (p.stock_quantity <= min) return { label: 'Estoque baixo', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
    return { label: 'Normal', color: 'text-success', bg: 'bg-success/10 border-success/20' };
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = (filterCategory && filterCategory !== '__all__') ? p.category_id === filterCategory : true;
    const matchStatus = filterStatus === 'out' ? p.stock_quantity === 0
      : filterStatus === 'low' ? (p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock ?? 5))
      : filterStatus === 'ok' ? p.stock_quantity > (p.min_stock ?? 5)
      : true;
    return matchSearch && matchCat && matchStatus;
  });

  const totalValue = filtered.reduce((sum, p) => sum + (p.unit_price * p.stock_quantity), 0);
  const totalCost = filtered.reduce((sum, p) => sum + (p.cost_price * p.stock_quantity), 0);
  const lowStock = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock ?? 5)).length;
  const outStock = filtered.filter(p => p.stock_quantity === 0).length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" /> Produtos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Cadastro e histórico de todos os produtos da empresa</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={openNew} size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-primary">
              <Plus className="w-4 h-4" /> Novo Produto
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Produtos</p>
            <p className="text-2xl font-display font-bold text-primary mt-1">{products.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Valor em Estoque</p>
            <p className="text-xl font-display font-bold text-success mt-1">{formatBRL(totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Custo: {formatBRL(totalCost)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Estoque Baixo</p>
            </div>
            <p className="text-2xl font-display font-bold text-warning mt-1">{lowStock}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-danger" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Sem Estoque</p>
            </div>
            <p className="text-2xl font-display font-bold text-danger mt-1">{outStock}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas categorias</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="ok">Normal</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="out">Sem estoque</SelectItem>
                </SelectContent>
              </Select>
              {(filterCategory || filterStatus) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterCategory(''); setFilterStatus(''); }} className="h-9 px-2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} produto(s)</span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-base">Nenhum produto encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou cadastre um novo produto</p>
              <Button onClick={openNew} size="sm" className="mt-4 gap-2 gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> Cadastrar Produto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['#', 'Produto', 'SKU', 'Categoria', 'Custo', 'Preço Venda', 'Margem', 'Estoque', 'Mín.', 'Situação', 'Cadastrado em', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((p, i) => {
                      const status = getStockStatus(p);
                      const margin = p.unit_price > 0
                        ? ((p.unit_price - p.cost_price) / p.unit_price * 100)
                        : 0;
                      const createdAt = p.created_at
                        ? format(parseISO(p.created_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '—';
                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.015 }}
                          className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${p.stock_quantity === 0 ? 'bg-danger/5' : p.stock_quantity <= (p.min_stock ?? 5) ? 'bg-warning/5' : ''}`}
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground max-w-[180px] truncate">{p.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            {p.sku
                              ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{p.sku}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {p.category
                              ? <Badge variant="outline" className="text-xs gap-1"><Tag className="w-2.5 h-2.5" />{p.category}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{formatBRL(Number(p.cost_price))}</td>
                          <td className="px-4 py-3 text-right font-semibold text-success">{formatBRL(Number(p.unit_price))}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-bold ${margin >= 30 ? 'text-success' : margin >= 10 ? 'text-warning' : 'text-danger'}`}>
                              {margin.toFixed(0)}%
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-center font-bold text-base ${status.color}`}>
                            {p.stock_quantity}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-muted-foreground">{p.min_stock ?? 5}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                              {p.stock_quantity === 0
                                ? <AlertTriangle className="w-2.5 h-2.5" />
                                : p.stock_quantity <= (p.min_stock ?? 5)
                                  ? <AlertTriangle className="w-2.5 h-2.5" />
                                  : <CheckCircle className="w-2.5 h-2.5" />}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{createdAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="h-7 w-7 p-0 hover:bg-danger/10 hover:text-danger">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== PRODUCT FORM DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nome do Produto *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Camiseta Básica Branca P"
                required
                autoFocus
              />
            </div>

            {/* SKU + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Hash className="w-3 h-3" /> SKU</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.sku}
                    readOnly={!editingId}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="001"
                    className={`flex-1 font-mono ${!editingId ? 'bg-muted text-muted-foreground' : ''}`}
                  />
                  {!editingId && (
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateSku} disabled={generatingSku} title="Gerar SKU automático">
                      {generatingSku ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingId ? 'Edite se necessário' : 'Gerado automaticamente'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> Categoria</Label>
                <Select
                  value={form.category_id || '__none__'}
                  onValueChange={v => {
                    const realId = v === '__none__' ? '' : v;
                    const cat = categories.find(c => c.id === realId);
                    setForm(f => ({ ...f, category_id: realId, category: cat?.name ?? '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Preço de Venda</Label>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preço de Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <p className="text-xs text-muted-foreground">O custo será definido automaticamente ao registrar uma compra.</p>
            </div>

            {/* Min Stock */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Package className="w-3 h-3" /> Estoque Mínimo</Label>
              <div className="space-y-1.5">
                <Input
                  type="number"
                  min={0}
                  value={form.min_stock}
                  onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">Alerta de reposição quando atingir este valor</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground shadow-primary">
                {submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingId ? 'Salvando...' : 'Cadastrando...'}</>
                  : editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-danger flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Tem certeza que deseja excluir este produto? Somente produtos com estoque zerado podem ser excluídos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
