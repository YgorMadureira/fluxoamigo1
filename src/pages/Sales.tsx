import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import MonthFilterSelect from '@/components/MonthFilterSelect';
import { useMonthFilter } from '@/hooks/useMonthFilter';
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
  Plus, Pencil, Trash2, Search, RefreshCw, ShoppingCart, X, Loader2, Store, AlertTriangle, Package, Tag, ListPlus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/database.types';

type Sale = Database['public']['Tables']['sales']['Row'];
interface Product { id: string; name: string; unit_price: number; stock_quantity: number; category: string | null; category_id: string | null; min_stock: number | null; sku: string | null; }
interface Category { id: string; name: string }

// Multi-item sale line
interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_amount: string;
  productSearch: string;
  dropdownOpen: boolean;
  category_id: string;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDateBR = (dateStr: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return format(parseISO(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  }
  const d = new Date(dateStr);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return format(brt, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

const emptyForm = {
  product_id: '',
  product_name: '',
  quantity: 1,
  unit_price: '',
  total_amount: '',
  sale_date: format(new Date(), 'yyyy-MM-dd'),
  source: 'manual',
  notes: '',
  shopee_order_id: '',
  status: 'completed',
  category_id: '',
};

const newSaleItem = (): SaleItem => ({
  id: Math.random().toString(36).slice(2),
  product_id: '', product_name: '', quantity: 1,
  unit_price: '', total_amount: '',
  productSearch: '', dropdownOpen: false, category_id: '',
});

export default function Sales() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { startDate, endDate } = useMonthFilter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shopeeDialogOpen, setShopeeDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Multi-item mode
  const [multiMode, setMultiMode] = useState(false);
  const [multiItems, setMultiItems] = useState<SaleItem[]>([newSaleItem()]);
  const [multiDate, setMultiDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [multiSource, setMultiSource] = useState('manual');
  const [multiStatus, setMultiStatus] = useState('completed');
  const [multiNotes, setMultiNotes] = useState('');
  const [multiShopeeId, setMultiShopeeId] = useState('');
  const [multiSubmitting, setMultiSubmitting] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar vendas', variant: 'destructive' });
    else setSales(data ?? []);
    setLoading(false);
  }, [toast, startDate, endDate, profile]);

  const fetchProducts = useCallback(async () => {
    if (!profile?.company_id) return;
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products')
        .select('id, name, unit_price, stock_quantity, category, category_id, min_stock, sku')
        .eq('company_id', profile.company_id)
        .order('name'),
      supabase.from('categories' as never).select('id, name').eq('company_id', profile.company_id).order('name') as unknown as Promise<{ data: Category[] | null }>,
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setCategories(catRes.data ?? []);
  }, [profile]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openNew = () => {
    setForm({ ...emptyForm, sale_date: format(new Date(), 'yyyy-MM-dd') });
    setEditingId(null);
    setProductSearch('');
    setMultiMode(false);
    setDialogOpen(true);
  };

  const openNewMulti = () => {
    setMultiItems([newSaleItem()]);
    setMultiDate(format(new Date(), 'yyyy-MM-dd'));
    setMultiSource('manual');
    setMultiStatus('completed');
    setMultiNotes('');
    setMultiShopeeId('');
    setEditingId(null);
    setMultiMode(true);
    setDialogOpen(true);
  };

  const openEdit = (s: Sale) => {
    setForm({
      product_id: s.product_id ?? '',
      product_name: s.product_name,
      quantity: s.quantity,
      unit_price: String(s.unit_price),
      total_amount: String(s.total_amount),
      sale_date: s.sale_date,
      source: s.source,
      notes: s.notes ?? '',
      shopee_order_id: s.shopee_order_id ?? '',
      status: s.status,
      category_id: s.category_id ?? '',
    });
    setProductSearch(s.product_name);
    setEditingId(s.id);
    setMultiMode(false);
    setDialogOpen(true);
  };

  const selectProduct = (p: Product) => {
    setForm(f => ({
      ...f,
      product_id: p.id,
      product_name: p.name,
      unit_price: String(p.unit_price),
      total_amount: (f.quantity * p.unit_price).toFixed(2),
      category_id: p.category_id ?? '',
    }));
    setProductSearch(p.name);
    setProductDropdownOpen(false);
  };

  const calcTotal = (qty: number, price: string) => {
    const total = qty * (parseFloat(price) || 0);
    setForm(f => ({ ...f, total_amount: total.toFixed(2) }));
  };

  // ===== MULTI-ITEM HELPERS =====
  const updateMultiItem = (id: string, patch: Partial<SaleItem>) => {
    setMultiItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const selectMultiProduct = (itemId: string, p: Product) => {
    setMultiItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const qty = it.quantity || 1;
      return {
        ...it,
        product_id: p.id, product_name: p.name,
        unit_price: String(p.unit_price),
        total_amount: (qty * p.unit_price).toFixed(2),
        category_id: p.category_id ?? '',
        productSearch: p.name, dropdownOpen: false,
      };
    }));
  };

  const calcMultiTotal = (itemId: string, qty: number, price: string) => {
    const total = (qty * (parseFloat(price) || 0)).toFixed(2);
    updateMultiItem(itemId, { total_amount: total });
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = multiItems.filter(it => it.product_name.trim());
    if (validItems.length === 0) {
      toast({ title: 'Adicione ao menos um produto', variant: 'destructive' }); return;
    }

    // Stock check
    for (const item of validItems) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod && Number(item.quantity) > prod.stock_quantity) {
        const proceed = window.confirm(
          `Atenção: "${prod.name}" tem estoque de ${prod.stock_quantity} un., mas você está vendendo ${item.quantity}. Deseja continuar?`
        );
        if (!proceed) return;
      }
    }

    setMultiSubmitting(true);
    const sellerName = multiSource === 'shopee' ? 'ShopeeUser' : (profile?.full_name ?? user?.email ?? 'Usuário');
    let successCount = 0;

    for (const item of validItems) {
      const payload = {
        product_id: item.product_id || null, product_name: item.product_name,
        quantity: Number(item.quantity), unit_price: parseFloat(item.unit_price) || 0,
        total_amount: parseFloat(item.total_amount) || 0,
        sale_date: multiDate, source: multiSource,
        notes: multiNotes || null,
        shopee_order_id: multiSource === 'shopee' ? multiShopeeId || null : null,
        status: multiStatus, user_id: user?.id ?? null,
        company_id: profile?.company_id ?? '',
        seller_name: sellerName,
        category_id: item.category_id || null,
      };
      const { error } = await supabase.from('sales').insert(payload as never);
      if (!error) {
        successCount++;
        const prod = products.find(p => p.id === item.product_id);
        if (item.product_id && prod) {
          const newQty = Math.max(0, prod.stock_quantity - Number(item.quantity));
          const minStock = prod.min_stock ?? 5;
          await Promise.all([
            supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() } as never).eq('id', item.product_id),
            supabase.from('inventory_logs').insert({
              product_id: item.product_id, user_id: user?.id ?? null, type: 'sale',
              quantity_change: -Number(item.quantity), quantity_before: prod.stock_quantity, quantity_after: newQty,
              justification: `Venda registrada — Origem: ${multiSource === 'shopee' ? 'Shopee' : 'Manual'}`,
              user_name: sellerName,
            } as never),
          ]);
          if (newQty <= minStock) {
            toast({ title: `⚠️ Estoque baixo: ${prod.name}`, description: `Restam apenas ${newQty} unidade(s).`, variant: 'destructive' });
          }
        }
      }
    }

    toast({ title: `✅ ${successCount} venda(s) registrada(s) e estoque debitado!` });
    setDialogOpen(false);
    fetchSales(); fetchProducts();
    setMultiSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const prod = products.find(p => p.id === form.product_id);
    if (prod && Number(form.quantity) > prod.stock_quantity) {
      const proceed = window.confirm(
        `Atenção: Estoque disponível é ${prod.stock_quantity} un., mas você está vendendo ${form.quantity}. Deseja continuar mesmo assim?`
      );
      if (!proceed) { setSubmitting(false); return; }
    }

    const sellerName = form.source === 'shopee'
      ? 'ShopeeUser'
      : (profile?.full_name ?? user?.email ?? 'Usuário');

    const payload = {
      product_id: form.product_id || null,
      product_name: form.product_name,
      quantity: Number(form.quantity),
      unit_price: parseFloat(form.unit_price),
      total_amount: parseFloat(form.total_amount),
      sale_date: form.sale_date,
      source: form.source,
      notes: form.notes || null,
      shopee_order_id: form.shopee_order_id || null,
      status: form.status,
      user_id: user?.id ?? null,
      company_id: profile?.company_id ?? '',
      seller_name: sellerName,
      category_id: form.category_id || null,
    };

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('sales').update({ ...payload, updated_at: new Date().toISOString() } as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('sales').insert(payload as never);
      error = res.error as { message: string } | null;

      if (!error && form.product_id && prod) {
        const newQty = Math.max(0, prod.stock_quantity - Number(form.quantity));
        const minStock = prod.min_stock ?? 5;

        await Promise.all([
          supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() } as never).eq('id', form.product_id),
          supabase.from('inventory_logs').insert({
            product_id: form.product_id,
            user_id: user?.id ?? null,
            type: 'sale',
            quantity_change: -Number(form.quantity),
            quantity_before: prod.stock_quantity,
            quantity_after: newQty,
            justification: `Venda registrada — Origem: ${form.source === 'shopee' ? 'Shopee' : 'Manual'}`,
            user_name: sellerName,
          } as never),
        ]);

        if (newQty <= minStock) {
          toast({
            title: `⚠️ Estoque baixo: ${prod.name}`,
            description: `Restam apenas ${newQty} unidade(s). Mínimo: ${minStock}.`,
            variant: 'destructive',
          });
        }

        fetchProducts();
      }
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Venda atualizada!' : '✅ Venda registrada e estoque debitado!' });
      setDialogOpen(false);
      fetchSales();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Venda excluída!' });
      setSales(prev => prev.filter(s => s.id !== id));
    }
    setDeleteId(null);
  };

  const filtered = sales.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.shopee_order_id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.total_amount), 0);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === form.product_id);
  const stockAfterSale = selectedProduct ? selectedProduct.stock_quantity - Number(form.quantity) : null;
  const stockAlert = selectedProduct !== undefined && selectedProduct !== null && Number(form.quantity) > selectedProduct.stock_quantity;
  const stockLowAfter = selectedProduct && stockAfterSale !== null && stockAfterSale <= (selectedProduct.min_stock ?? 5) && stockAfterSale >= 0;
  const selectedCategory = selectedProduct?.category_id
    ? categories.find(c => c.id === selectedProduct.category_id)
    : null;

  const multiTotal = multiItems.reduce((s, it) => s + (parseFloat(it.total_amount) || 0), 0);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" /> Vendas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Estoque debitado automaticamente ao confirmar</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <MonthFilterSelect />
            <Button variant="outline" size="sm" onClick={() => setShopeeDialogOpen(true)} className="gap-2">
              <Store className="w-4 h-4" /> Shopee
            </Button>
            <Button onClick={fetchSales} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={openNew} size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-primary">
              <Plus className="w-4 h-4" /> Nova Venda
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Vendas', value: filtered.length.toString(), color: 'text-primary' },
            { label: 'Receita Total', value: formatBRL(totalRevenue), color: 'text-success' },
            { label: 'Shopee', value: filtered.filter(s => s.source === 'shopee').length.toString(), color: 'text-warning' },
            { label: 'Manuais', value: filtered.filter(s => s.source === 'manual').length.toString(), color: 'text-info' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
              <p className={`text-xl font-display font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto ou pedido Shopee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma venda encontrada neste período</p>
              <p className="text-sm">Clique em "Nova Venda" para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Data', 'Produto', 'SKU', 'Qtd', 'Preço Unit.', 'Total', 'Vendedor', 'Origem', 'Status', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateBR(s.sale_date)}</td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{s.product_name}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const prod = products.find(p => p.id === s.product_id);
                          return prod?.sku
                            ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{prod.sku}</span>
                            : <span className="text-muted-foreground text-xs">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">{s.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(Number(s.unit_price))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-success">{formatBRL(Number(s.total_amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {(s as Sale & { seller_name?: string }).seller_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.source === 'shopee' ? 'default' : 'secondary'} className="text-xs">
                          {s.source === 'shopee' ? '🛍 Shopee' : '✍ Manual'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'completed' ? 'outline' : 'secondary'} className="text-xs">
                          {s.status === 'completed' ? 'Concluído' : s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)} className="h-7 w-7 p-0 hover:bg-danger/10 hover:text-danger">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== SALE FORM DIALOG (Single + Multi) ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${multiMode ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {multiMode ? <><ListPlus className="w-5 h-5 text-warning" /> Venda com Múltiplos Produtos</> : editingId ? 'Editar Venda' : 'Nova Venda'}
            </DialogTitle>
            {!editingId && (
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMultiMode(false)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${!multiMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  1 Produto
                </button>
                <button
                  type="button"
                  onClick={() => { setMultiMode(true); setMultiItems([newSaleItem()]); }}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${multiMode ? 'bg-warning text-warning-foreground border-warning' : 'border-border text-muted-foreground hover:border-warning/40'}`}
                >
                  Múltiplos Produtos
                </button>
              </div>
            )}
          </DialogHeader>

          {/* === MULTI MODE === */}
          {multiMode ? (
            <form onSubmit={handleMultiSubmit} className="space-y-4">
              {/* Common fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Data *</Label>
                  <Input type="date" value={multiDate} onChange={e => setMultiDate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Origem</Label>
                  <Select value={multiSource} onValueChange={setMultiSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="shopee">Shopee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={multiStatus} onValueChange={setMultiStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {multiSource === 'shopee' && (
                  <div className="space-y-1">
                    <Label>ID Pedido Shopee</Label>
                    <Input value={multiShopeeId} onChange={e => setMultiShopeeId(e.target.value)} placeholder="Ex: 2412345678" />
                  </div>
                )}
                <div className={multiSource === 'shopee' ? 'col-span-2' : ''}>
                  <Label>Observações</Label>
                  <Input value={multiNotes} onChange={e => setMultiNotes(e.target.value)} placeholder="Opcional" className="mt-1" />
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Produtos ({multiItems.length})</Label>
                  <span className="text-sm font-bold text-success">{formatBRL(multiTotal)}</span>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {multiItems.map((item, idx) => {
                    const filtProd = products.filter(p => p.name.toLowerCase().includes(item.productSearch.toLowerCase()));
                    const prod = products.find(p => p.id === item.product_id);
                    const stockWarn = prod && Number(item.quantity) > prod.stock_quantity;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-lg p-3 bg-card space-y-2 ${stockWarn ? 'border-warning/50' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              value={item.productSearch}
                              onChange={e => {
                                updateMultiItem(item.id, { productSearch: e.target.value, product_name: e.target.value, product_id: '', dropdownOpen: true });
                              }}
                              onFocus={() => updateMultiItem(item.id, { dropdownOpen: true })}
                              placeholder="Buscar produto..."
                              className="pl-7 h-8 text-sm"
                            />
                            <AnimatePresence>
                              {item.dropdownOpen && filtProd.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                  className="absolute z-50 w-full mt-0.5 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                  {filtProd.map(p => {
                                    const minStock = p.min_stock ?? 5;
                                    const sc = p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= minStock ? 'text-warning' : 'text-success';
                                    return (
                                      <button key={p.id} type="button" onClick={() => selectMultiProduct(item.id, p)}
                                        className="w-full text-left px-2.5 py-2 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-foreground truncate">{p.name}</span>
                                          <div className="shrink-0 text-right">
                                            <p className={`text-xs font-bold ${sc}`}>{p.stock_quantity} un.</p>
                                            <p className="text-xs text-muted-foreground">{formatBRL(p.unit_price)}</p>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {item.dropdownOpen && <button type="button" className="fixed inset-0 z-40" onClick={() => updateMultiItem(item.id, { dropdownOpen: false })} />}
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setMultiItems(prev => prev.filter(it => it.id !== item.id))}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {stockWarn && (
                          <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded-md pl-7">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Estoque insuficiente! Disponível: {prod?.stock_quantity} un.
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pl-7">
                          <div>
                            <Label className="text-xs text-muted-foreground">Qtd *</Label>
                            <Input type="number" min={1} value={item.quantity} className="h-8 text-sm"
                              onChange={e => { const q = Number(e.target.value); updateMultiItem(item.id, { quantity: q }); calcMultiTotal(item.id, q, item.unit_price); }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Preço Unit. (R$) *</Label>
                            <Input type="number" step="0.01" value={item.unit_price} className="h-8 text-sm" placeholder="0,00"
                              onChange={e => { updateMultiItem(item.id, { unit_price: e.target.value }); calcMultiTotal(item.id, item.quantity, e.target.value); }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Total (R$)</Label>
                            <Input type="number" step="0.01" value={item.total_amount} className="h-8 text-sm" placeholder="0,00"
                              onChange={e => updateMultiItem(item.id, { total_amount: e.target.value })} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed border-warning/50 text-warning hover:bg-warning/10"
                  onClick={() => setMultiItems(prev => [...prev, newSaleItem()])}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar Produto
                </Button>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{multiItems.filter(it => it.product_name.trim()).length} produto(s) · {multiDate}</span>
                <span className="font-bold text-success text-base">{formatBRL(multiTotal)}</span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={multiSubmitting} className="gradient-primary text-primary-foreground shadow-primary">
                  {multiSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : `Confirmar ${multiItems.filter(it => it.product_name.trim()).length} Venda(s)`}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* === SINGLE MODE === */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Searchable Product Select */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Produto *</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={e => {
                          setProductSearch(e.target.value);
                          setForm(f => ({ ...f, product_name: e.target.value, product_id: '' }));
                          setProductDropdownOpen(true);
                        }}
                        onFocus={() => setProductDropdownOpen(true)}
                        placeholder="Buscar produto cadastrado..."
                        className="pl-9"
                        required
                      />
                    </div>
                    <AnimatePresence>
                      {productDropdownOpen && filteredProducts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto"
                        >
                          {filteredProducts.map(p => {
                            const minStock = p.min_stock ?? 5;
                            const stockColor = p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= minStock ? 'text-warning' : 'text-success';
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectProduct(p)}
                                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                                    {p.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {p.sku}</p>}
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className={`text-xs font-bold ${stockColor}`}>{p.stock_quantity} un.</p>
                                    <p className="text-xs text-muted-foreground">{formatBRL(p.unit_price)}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {productDropdownOpen && (
                      <button type="button" className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />
                    )}
                  </div>

                  {/* Selected product info */}
                  {selectedProduct && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" /> Estoque disponível
                        </span>
                        <span className={`font-bold ${selectedProduct.stock_quantity === 0 ? 'text-danger' : selectedProduct.stock_quantity <= (selectedProduct.min_stock ?? 5) ? 'text-warning' : 'text-success'}`}>
                          {selectedProduct.stock_quantity} un.
                        </span>
                      </div>
                      {(selectedCategory || selectedProduct.category) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Categoria
                          </span>
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {selectedCategory?.name ?? selectedProduct.category}
                          </Badge>
                        </div>
                      )}
                      {stockAfterSale !== null && !stockAlert && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Saldo após venda</span>
                          <span className={`font-bold ${stockAfterSale <= (selectedProduct.min_stock ?? 5) ? 'text-warning' : 'text-success'}`}>
                            {stockAfterSale} un.
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Alerts */}
                  {stockAlert && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/30"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
                      <p className="text-xs text-danger font-medium">
                        Quantidade maior que o estoque! Disponível: <strong>{selectedProduct?.stock_quantity} un.</strong>
                      </p>
                    </motion.div>
                  )}
                  {stockLowAfter && !stockAlert && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                      <p className="text-xs text-warning font-medium">
                        Após esta venda o estoque ficará abaixo do mínimo ({selectedProduct?.min_stock ?? 5} un.)
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Quantidade *</Label>
                  <Input type="number" min={1} value={form.quantity}
                    onChange={e => { const q = Number(e.target.value); setForm(f => ({ ...f, quantity: q })); calcTotal(q, form.unit_price); }} required />
                </div>
                <div className="space-y-1">
                  <Label>Preço Unitário (R$) *</Label>
                  <Input type="number" step="0.01" value={form.unit_price}
                    onChange={e => { setForm(f => ({ ...f, unit_price: e.target.value })); calcTotal(form.quantity, e.target.value); }} required />
                </div>
                <div className="space-y-1">
                  <Label>Total (R$)</Label>
                  <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Data *</Label>
                  <Input type="date" value={form.sale_date} onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Origem</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="shopee">Shopee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.source === 'shopee' && (
                  <div className="col-span-2 space-y-1">
                    <Label>ID Pedido Shopee</Label>
                    <Input value={form.shopee_order_id} onChange={e => setForm(f => ({ ...f, shopee_order_id: e.target.value }))} placeholder="Ex: 2412345678" />
                  </div>
                )}
                <div className="col-span-2 space-y-1">
                  <Label>Observações</Label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground shadow-primary">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Confirmar Venda'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-danger flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Tem certeza que deseja excluir esta venda?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopee Dialog */}
      <Dialog open={shopeeDialogOpen} onOpenChange={setShopeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Store className="w-5 h-5 text-warning" /> Integração Shopee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Para importar pedidos da Shopee automaticamente, configure as credenciais em <strong>Configurações</strong>.</p>
            <p>Enquanto isso, registre vendas Shopee manualmente selecionando a origem <strong>"Shopee"</strong>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopeeDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
