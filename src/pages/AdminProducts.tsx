import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabaseERP, type Product } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, Package } from 'lucide-react';

const COMPANY_ID = 'default';
const MAX_IMAGES = 5;

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type ProductForm = {
  name: string;
  description: string;
  category: string;
  brand: string;
  unit_price: string;
  stock_quantity: string;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category: '',
  brand: '',
  unit_price: '',
  stock_quantity: '0',
};

export default function AdminProducts() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabaseERP
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) fetchProducts();
  }, [user, isAdmin, fetchProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setExistingImages([]);
    setNewFiles([]);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      brand: p.brand || '',
      unit_price: String(p.unit_price),
      stock_quantity: String(p.stock_quantity),
    });
    setExistingImages(p.images || (p.image_url ? [p.image_url] : []));
    setNewFiles([]);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = existingImages.length + newFiles.length + files.length;
    if (totalCount > MAX_IMAGES) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por produto`);
      return;
    }
    setNewFiles((prev) => [...prev, ...files]);
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split('.').pop();
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit_price) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const productId = editingProduct?.id || crypto.randomUUID();
      const uploadedUrls = await uploadImages(productId);
      const allImages = [...existingImages, ...uploadedUrls];

      const payload = {
        id: productId,
        company_id: COMPANY_ID,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        unit_price: parseFloat(form.unit_price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        image_url: allImages[0] || null,
        images: allImages.length > 0 ? allImages : null,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await supabaseERP
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseERP
          .from('products')
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }

      toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const { error } = await supabaseERP.from('products').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir: ' + error.message);
    else {
      toast.success('Produto excluído');
      fetchProducts();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Carregando...</p>
      </div>
    );
  }

  const totalSlots = existingImages.length + newFiles.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')}>
              <ArrowLeft size={18} />
            </Button>
            <h1 className="font-display text-lg font-bold">Gestão de Produtos</h1>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            Novo Produto
          </Button>
        </div>
      </header>

      <div className="container py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-32 rounded" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl text-foreground mb-2">Nenhum produto cadastrado</h3>
            <p className="text-muted-foreground text-sm font-body mb-6">
              Crie seu primeiro produto para começar a vender
            </p>
            <Button onClick={openCreate} className="gap-2">
              <Plus size={16} />
              Criar Produto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="flex h-32">
                  <div className="w-32 h-32 bg-muted shrink-0">
                    {(p.image_url || p.images?.[0]) && (
                      <img
                        src={p.image_url || p.images?.[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-display font-semibold text-sm truncate">{p.name}</h3>
                      <p className="text-xs text-muted-foreground font-body truncate">
                        {p.category || 'Sem categoria'} • Estoque: {p.stock_quantity}
                      </p>
                      <p className="text-sm font-body font-bold mt-1">{formatPrice(p.unit_price)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="gap-1 text-xs">
                        <Pencil size={12} />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} className="gap-1 text-xs">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição detalhada do produto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ex: Calçados"
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="Ex: Nike"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Estoque</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                />
              </div>
            </div>

            {/* Images section */}
            <div className="space-y-2">
              <Label>Imagens ({totalSlots}/{MAX_IMAGES})</Label>
              <div className="grid grid-cols-5 gap-2">
                {existingImages.map((url, i) => (
                  <div key={`existing-${i}`} className="relative aspect-square bg-muted rounded overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-1 right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newFiles.map((file, i) => (
                  <div key={`new-${i}`} className="relative aspect-square bg-muted rounded overflow-hidden group">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute top-1 right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {totalSlots < MAX_IMAGES && (
                  <label className="aspect-square border-2 border-dashed border-border rounded flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors">
                    <Upload size={16} className="text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
