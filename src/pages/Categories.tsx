import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, RefreshCw, Tag, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export default function Categories() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('categories' as never)
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name') as { data: Category[] | null; error: unknown };
    if (error) toast({ title: 'Erro ao carregar categorias', variant: 'destructive' });
    else setCategories(data ?? []);
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openNew = () => {
    setName('');
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setName(c.name);
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !profile?.company_id) return;
    setSubmitting(true);

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('categories' as never).update({ name: name.trim() } as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('categories' as never).insert({ name: name.trim(), company_id: profile.company_id } as never);
      error = res.error as { message: string } | null;
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: (error as { message: string }).message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Categoria atualizada!' : 'Categoria criada!' });
      setDialogOpen(false);
      fetchCategories();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories' as never).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Categoria excluída!' });
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    setDeleteId(null);
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> Categorias
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie as categorias de produtos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCategories} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={openNew} size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-primary">
              <Plus className="w-4 h-4" /> Nova Categoria
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total</p>
            <p className="text-2xl font-display font-bold text-primary mt-1">{categories.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Filtradas</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{filtered.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
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
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma categoria encontrada</p>
              <p className="text-sm">Clique em "Nova Categoria" para criar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Nome da Categoria', 'Criada em', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Tag className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)} className="h-7 w-7 p-0 hover:bg-danger/10 hover:text-danger">
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome da Categoria *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Roupas, Eletrônicos, Calçados..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground shadow-primary">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-danger flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Tem certeza que deseja excluir esta categoria?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
