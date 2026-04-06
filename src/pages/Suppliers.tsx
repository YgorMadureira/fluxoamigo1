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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, RefreshCw, Truck, Loader2, Phone, Mail, FileText, Building2 } from 'lucide-react';

interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = { name: '', contact: '', phone: '', email: '', notes: '' };

export default function Suppliers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers' as never)
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name') as { data: Supplier[] | null; error: unknown };
    if (error) toast({ title: 'Erro ao carregar fornecedores', variant: 'destructive' });
    else setSuppliers(data ?? []);
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      contact: s.contact ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      notes: s.notes ?? '',
    });
    setEditingId(s.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !profile?.company_id) return;
    setSubmitting(true);

    // Build payload only with fields that exist in the DB schema.
    // The migration adds contact/phone/email/notes — if they're missing the
    // columns won't be sent (graceful degradation).
    const basePayload: Record<string, unknown> = {
      name: form.name.trim(),
    };
    // Try to include optional columns — they exist after migration runs
    if (form.contact !== undefined) basePayload.contact = form.contact.trim() || null;
    if (form.phone   !== undefined) basePayload.phone   = form.phone.trim()   || null;
    if (form.email   !== undefined) basePayload.email   = form.email.trim()   || null;
    if (form.notes   !== undefined) basePayload.notes   = form.notes.trim()   || null;

    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('suppliers' as never).update(basePayload as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('suppliers' as never).insert({ ...basePayload, company_id: profile.company_id } as never);
      error = res.error as { message: string } | null;
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: (error as { message: string }).message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!' });
      setDialogOpen(false);
      fetchSuppliers();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suppliers' as never).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Fornecedor excluído!' });
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
    setDeleteId(null);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" /> Fornecedores
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie seus fornecedores e use-os nas compras</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSuppliers} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={openNew} size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-primary">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-lg">
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total</p>
            <p className="text-2xl font-display font-bold text-primary mt-1">{suppliers.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Com Contato</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">
              {suppliers.filter(s => s.phone || s.email).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Filtrados</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{filtered.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
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
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum fornecedor cadastrado</p>
              <p className="text-sm mt-1 mb-4">Cadastre fornecedores para usá-los nas compras</p>
              <Button size="sm" onClick={openNew} className="gap-2 gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> Novo Fornecedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Fornecedor', 'Contato', 'Telefone', 'E-mail', 'Observações', 'Ações'].map(h => (
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.contact || <span className="text-muted-foreground/40 italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.phone ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs">{s.phone}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.email ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{s.email}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 italic text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {s.notes ? (
                          <span className="text-xs text-muted-foreground truncate block">{s.notes}</span>
                        ) : <span className="text-muted-foreground/40 italic text-xs">—</span>}
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Razão Social / Nome *</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Distribuidora Silva Ltda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Nome do Contato</Label>
              <Input
                id="sup-contact"
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                    id="sup-phone"
                    value={form.phone}
                    onChange={e => {
                      // Only allow digits, apply mask (xx)xxxxx-xxxx
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let masked = '';
                      if (digits.length > 0) masked += '(' + digits.slice(0, 2);
                      if (digits.length >= 2) masked += ')';
                      if (digits.length > 2) masked += digits.slice(2, 7);
                      if (digits.length > 7) masked += '-' + digits.slice(7, 11);
                      setForm(f => ({ ...f, phone: masked }));
                    }}
                    placeholder="(11)99999-9999"
                    className="pl-8"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="sup-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-notes">Observações</Label>
              <Textarea
                id="sup-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Prazo de entrega, condições de pagamento, etc."
                rows={3}
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
            <DialogTitle className="font-display text-danger flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
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
