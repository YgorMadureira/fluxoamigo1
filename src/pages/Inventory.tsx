import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Search, RefreshCw, Package, Loader2,
  AlertTriangle, CheckCircle, History, Tag, Wand2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/database.types';

type Product = Database['public']['Tables']['products']['Row'];
interface Category { id: string; name: string; }

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const emptyProductForm = {
  name: '',
  sku: '',
  unit_price: '',
  cost_price: '',
  stock_quantity: 0,
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

  const nums = (data ?? [])
    .map(p => parseInt(p.sku ?? '', 10))
    .filter(n => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const digits = Math.max(3, String(next).length);
  return String(next).padStart(digits, '0');
}

export default function Inventory() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [productDialog, setProductDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyProductForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [justification, setJustification] = useState('');
  const [generatingSku, setGeneratingSku] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*').eq('company_id', cid).order('name'),
      supabase.from('categories' as never).select('id, name').eq('company_id', cid).order('name') as unknown as Promise<{ data: Category[] | null; error: unknown }>,
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
    setForm({ ...emptyProductForm });
    setEditingId(null);
    setProductDialog(true);
    // auto-generate SKU for new product
    if (profile?.company_id) {
      const sku = await generateSku(profile.company_id);
      setForm(f => ({ ...f, sku }));
    }
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      unit_price: String(p.unit_price),
      cost_price: String(p.cost_price),
      stock_quantity: p.stock_quantity,
      min_stock: p.min_stock ?? 5,
      category: p.category ?? '',
      category_id: p.category_id ?? '',
    });
    setEditingId(p.id);
    setProductDialog(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: form.name,
      sku: form.sku || null,
      unit_price: parseFloat(form.unit_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock_quantity: Number(form.stock_quantity),
      min_stock: Number(form.min_stock) || 5,
      category: form.category || null,
      category_id: form.category_id || null,
      company_id: profile?.company_id ?? '',
      updated_at: new Date().toISOString(),
    };

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('products').update(payload as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('products').insert(payload as never);
      error = res.error as { message: string } | null;
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Produto atualizado!' : 'Produto cadastrado!' });
      setProductDialog(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' });
    else {
      toast({ title: 'Produto excluído!' });
      setProducts(prev => prev.filter(p => p.id !== id));
    }
    setDeleteId(null);
  };

  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty(String(p.stock_quantity));
    setJustification('');
    setAdjustDialog(true);
  };

  const handleAdjust = async () => {
    if (!adjustProduct || !justification.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const newQty = parseInt(adjustQty);
    if (isNaN(newQty)) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      setSubmitting(false);
      return;
    }
    const change = newQty - adjustProduct.stock_quantity;

    const { error: updError } = await supabase
      .from('products')
      .update({ stock_quantity: newQty, updated_at: new Date().toISOString() } as never)
      .eq('id', adjustProduct.id);

    if (updError) {
      toast({ title: 'Erro ao ajustar estoque', description: updError.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await supabase.from('inventory_logs').insert({
      product_id: adjustProduct.id,
      user_id: user?.id ?? null,
      type: 'adjustment',
      quantity_change: change,
      quantity_before: adjustProduct.stock_quantity,
      quantity_after: newQty,
      justification: justification,
      user_name: profile?.full_name ?? user?.email ?? 'Usuário',
    } as never);

    toast({ title: 'Estoque ajustado!', description: `${adjustProduct.name}: ${adjustProduct.stock_quantity} → ${newQty}` });
    setAdjustDialog(false);
    fetchData();
    setSubmitting(false);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock ?? 5)).length;
  const outOfStock = products.filter(p => p.stock_quantity === 0).length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" /> Gestão de Estoque
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de produtos e inventário ao vivo</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory/history')} className="gap-2">
              <History className="w-4 h-4" /> Histórico
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/categories')} className="gap-2">
              <Tag className="w-4 h-4" /> Categorias
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Produtos', value: products.length.toString(), color: 'text-primary', icon: Package },
            { label: 'Estoque Baixo', value: lowStock.toString(), color: 'text-warning', icon: AlertTriangle },
            { label: 'Sem Estoque', value: outOfStock.toString(), color: 'text-danger', icon: AlertTriangle },
            { label: 'Normal', value: (products.length - lowStock - outOfStock).toString(), color: 'text-success', icon: CheckCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, SKU ou categoria..."
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
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="text-sm">Clique em "Novo Produto" para cadastrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Produto', 'SKU', 'Categoria', 'Custo', 'Preço Venda', 'Estoque', 'Mín.', 'Status', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const minStock = p.min_stock ?? 5;
                    const stockStatus = p.stock_quantity === 0
                      ? { label: 'Sem estoque', cls: 'text-danger bg-danger-light border-danger/20' }
                      : p.stock_quantity <= minStock
                        ? { label: 'Estoque baixo', cls: 'text-warning bg-warning-light border-warning/20' }
                        : { label: 'Normal', cls: 'text-success bg-success-light border-success/20' };
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${p.stock_quantity <= minStock && p.stock_quantity > 0 ? 'bg-warning/5' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.sku ?? '-'}</td>
                        <td className="px-4 py-3">
                          {p.category ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Tag className="w-2.5 h-2.5" />{p.category}
                            </Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">{formatBRL(Number(p.cost_price))}</td>
                        <td className="px-4 py-3 text-right font-semibold text-success">{formatBRL(Number(p.unit_price))}</td>
                        <td className={`px-4 py-3 text-center font-bold text-lg ${p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= minStock ? 'text-warning' : 'text-foreground'}`}>
                          {p.stock_quantity}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{minStock}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stockStatus.cls}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openAdjust(p)} className="h-7 px-2 text-xs hover:bg-warning/10 hover:text-warning gap-1">
                              <Package className="w-3 h-3" /> Ajustar
                            </Button>
                          </div>
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

      {/* Adjust Stock Dialog */}

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Package className="w-5 h-5 text-warning" /> Ajustar Estoque
            </DialogTitle>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-semibold text-foreground">{adjustProduct.name}</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Estoque atual: <span className="font-bold text-foreground">{adjustProduct.stock_quantity}</span> unidades
                </p>
              </div>
              <div className="space-y-1">
                <Label>Novo Saldo de Estoque *</Label>
                <Input
                  type="number"
                  min={0}
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  placeholder="Nova quantidade"
                />
                {adjustQty !== '' && !isNaN(Number(adjustQty)) && (
                  <p className={`text-xs mt-1 ${Number(adjustQty) >= adjustProduct.stock_quantity ? 'text-success' : 'text-danger'}`}>
                    Variação: {Number(adjustQty) >= adjustProduct.stock_quantity ? '+' : ''}{Number(adjustQty) - adjustProduct.stock_quantity} unidades
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Justificativa *</Label>
                <Textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Ex: Contagem física, produto danificado, devolução, correção..."
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">Obrigatório para auditoria. Para corrigir, use "Correção de lançamento anterior".</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAdjust}
              disabled={submitting || !justification.trim()}
              className="gradient-primary text-primary-foreground shadow-primary"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
