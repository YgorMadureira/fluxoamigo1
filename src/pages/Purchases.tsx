import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Search, RefreshCw, ShoppingBag, Loader2, Wand2,
  Tag, Package, Info, ScanLine, X, CheckCircle, AlertTriangle,
  ChevronRight, Link, UserPlus, FileText, Scale, Camera, Sparkles, ListPlus, Settings
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Database } from '@/integrations/supabase/database.types';


type Purchase = Database['public']['Tables']['purchases']['Row'];
interface Product { id: string; name: string; unit_price: number; cost_price: number; stock_quantity: number; category: string | null; category_id: string | null; sku: string | null; min_stock: number | null; }
interface Category { id: string; name: string }
interface Supplier { id: string; name: string; phone: string | null; email: string | null; }

interface ScannedItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  matched_product_id: string | null;
  matched_product_name: string | null;
  include: boolean;
  justification: string;
}

// Multi-item purchase line
interface PurchaseItem {
  id: string; // temp local id
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: string;
  total_amount: string;
  productSearch: string;
  dropdownOpen: boolean;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ===== SUPPLIER COMBOBOX =====
function SupplierCombobox({
  value, onChange, suppliers, onCreateNew,
}: {
  value: string;
  onChange: (v: string) => void;
  suppliers: Supplier[];
  onCreateNew?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => { setInputVal(value); }, [value]);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(inputVal.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setInputVal(name);
    onChange(name);
    setOpen(false);
  };

  const handleInputChange = (v: string) => {
    setInputVal(v);
    onChange(v);
    setOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={inputVal}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Digite ou selecione um fornecedor..."
          className="pl-9 pr-8"
        />
        {inputVal && (
          <button type="button" onClick={() => { setInputVal(''); onChange(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 && inputVal.trim() ? (
              <div className="px-3 py-2.5 text-sm text-muted-foreground flex items-center justify-between gap-2">
                <span>Nenhum fornecedor encontrado</span>
                {onCreateNew && (
                  <button type="button" onClick={() => { onCreateNew(inputVal.trim()); setOpen(false); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                    <Plus className="w-3 h-3" /> Cadastrar "{inputVal.trim()}"
                  </button>
                )}
              </div>
            ) : (
              <>
                <button type="button" onClick={() => handleSelect('')}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm text-muted-foreground border-b border-border/30 italic">
                  Nenhum
                </button>
                {filtered.map(s => (
                  <button key={s.id} type="button" onClick={() => handleSelect(s.name)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0 font-medium text-foreground">
                    {s.name}
                    {s.phone && <span className="text-xs text-muted-foreground ml-2 font-normal">{s.phone}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const formatDateBR = (dateStr: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return format(parseISO(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  }
  const d = new Date(dateStr);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return format(brt, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

const emptyForm = {
  product_id: '', product_name: '', quantity: 1, unit_cost: '',
  total_amount: '', purchase_date: format(new Date(), 'yyyy-MM-dd'),
  supplier: '', category: 'product', notes: '',
};

const emptyNewProductForm = {
  name: '', sku: '', unit_price: '', cost_price: '', min_stock: 5,
  category_id: '', category_name: '',
};

const newPurchaseItem = (): PurchaseItem => ({
  id: Math.random().toString(36).slice(2),
  product_id: '', product_name: '', quantity: 1, unit_cost: '',
  total_amount: '', productSearch: '', dropdownOpen: false,
});

async function generateSku(companyId: string): Promise<string> {
  const { data } = await supabase.from('products').select('sku').eq('company_id', companyId).not('sku', 'is', null);
  const nums = (data ?? []).map(p => parseInt(p.sku ?? '', 10)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const digits = Math.max(3, String(next).length);
  return String(next).padStart(digits, '0');
}

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function findBestProductMatch(description: string, products: Product[]): Product | null {
  const norm = normalizeStr(description);
  const words = norm.split(/\s+/).filter(w => w.length > 2);
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of products) {
    const pNorm = normalizeStr(p.name);
    let score = 0;
    if (pNorm === norm) { score = 100; }
    else if (pNorm.includes(norm) || norm.includes(pNorm)) { score = 70; }
    else {
      const matched = words.filter(w => pNorm.includes(w));
      score = (matched.length / Math.max(words.length, 1)) * 50;
    }
    if (score > bestScore && score >= 30) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export default function Purchases() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { startDate, endDate } = useMonthFilter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Multi-item mode
  const [multiMode, setMultiMode] = useState(false);
  const [multiItems, setMultiItems] = useState<PurchaseItem[]>([newPurchaseItem()]);
  const [multiDate, setMultiDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [multiSupplier, setMultiSupplier] = useState('');
  const [multiCategory, setMultiCategory] = useState('product');
  const [multiNotes, setMultiNotes] = useState('');
  const [multiSubmitting, setMultiSubmitting] = useState(false);

  // New Product modal
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ ...emptyNewProductForm });
  const [newProductSubmitting, setNewProductSubmitting] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  // Supplier modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

// ===== OCR SCANNER STATE =====
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanResult, setScanResult] = useState<{ supplier: string; invoice_date: string | null; invoice_number: string | null; total_note: number; items: { description: string; quantity: number; unit_price: number; total_price: number }[] } | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scannedSupplier, setScannedSupplier] = useState('');
  const [scannedDate, setScannedDate] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  // For registering a new product from OCR item
  const [ocrNewProductItem, setOcrNewProductItem] = useState<ScannedItem | null>(null);
  const [ocrNewProductIdx, setOcrNewProductIdx] = useState<number>(-1);
  const [ocrNewProdForm, setOcrNewProdForm] = useState({ ...emptyNewProductForm });
  const [ocrNewProdSubmitting, setOcrNewProdSubmitting] = useState(false);
  const [ocrNewProdSkuGenerating, setOcrNewProdSkuGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const fetchPurchases = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('purchases').select('*').eq('company_id', profile.company_id)
      .gte('purchase_date', startDate).lte('purchase_date', endDate)
      .order('purchase_date', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar compras', variant: 'destructive' });
    else setPurchases(data ?? []);
    setLoading(false);
  }, [toast, startDate, endDate, profile]);

  const fetchProducts = useCallback(async () => {
    if (!profile?.company_id) return;
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('id, name, unit_price, cost_price, stock_quantity, category, category_id, sku, min_stock').eq('company_id', profile.company_id).order('name'),
      supabase.from('categories' as never).select('id, name').eq('company_id', profile.company_id).order('name') as unknown as Promise<{ data: Category[] | null }>,
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setCategories(catRes.data ?? []);
  }, [profile]);

  const fetchSuppliers = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from('suppliers' as never)
      .select('id, name, phone, email')
      .eq('company_id', profile.company_id)
      .order('name') as unknown as { data: Supplier[] | null };
    setSuppliers(data ?? []);
  }, [profile]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);
  useEffect(() => { fetchProducts(); fetchSuppliers(); }, [fetchProducts, fetchSuppliers]);

  // ===== REGULAR FORM HELPERS =====
  const openNew = () => {
    setForm({ ...emptyForm, purchase_date: format(new Date(), 'yyyy-MM-dd') });
    setProductSearch('');
    setEditingId(null);
    setMultiMode(false);
    setDialogOpen(true);
  };

  const openNewMulti = () => {
    setMultiItems([newPurchaseItem()]);
    setMultiDate(format(new Date(), 'yyyy-MM-dd'));
    setMultiSupplier('');
    setMultiCategory('product');
    setMultiNotes('');
    setEditingId(null);
    setMultiMode(true);
    setDialogOpen(true);
  };

  const openEdit = (p: Purchase) => {
    setForm({
      product_id: p.product_id ?? '', product_name: p.product_name, quantity: p.quantity,
      unit_cost: String(p.unit_cost), total_amount: String(p.total_amount),
      purchase_date: p.purchase_date, supplier: p.supplier ?? '',
      category: p.category, notes: p.notes ?? '',
    });
    setProductSearch(p.product_name);
    setEditingId(p.id);
    setMultiMode(false);
    setDialogOpen(true);
  };

  const selectProduct = (p: Product) => {
    setForm(f => ({
      ...f, product_id: p.id, product_name: p.name,
      unit_cost: String(p.cost_price),
      total_amount: (f.quantity * p.cost_price).toFixed(2),
    }));
    setProductSearch(p.name);
    setProductDropdownOpen(false);
  };

  const calcTotal = (qty: number, cost: string) => {
    setForm(f => ({ ...f, total_amount: (qty * (parseFloat(cost) || 0)).toFixed(2) }));
  };

  // ===== MULTI-ITEM HELPERS =====
  const updateMultiItem = (id: string, patch: Partial<PurchaseItem>) => {
    setMultiItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const selectMultiProduct = (itemId: string, p: Product) => {
    setMultiItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const qty = it.quantity || 1;
      return {
        ...it,
        product_id: p.id, product_name: p.name,
        unit_cost: String(p.cost_price),
        total_amount: (qty * p.cost_price).toFixed(2),
        productSearch: p.name, dropdownOpen: false,
      };
    }));
  };

  const calcMultiTotal = (itemId: string, qty: number, cost: string) => {
    const total = (qty * (parseFloat(cost) || 0)).toFixed(2);
    updateMultiItem(itemId, { total_amount: total });
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = multiItems.filter(it => it.product_name.trim());
    if (validItems.length === 0) {
      toast({ title: 'Adicione ao menos um produto', variant: 'destructive' }); return;
    }
    setMultiSubmitting(true);
    let successCount = 0;
    for (const item of validItems) {
      const payload = {
        product_id: item.product_id || null, product_name: item.product_name,
        quantity: Number(item.quantity), unit_cost: parseFloat(item.unit_cost) || 0,
        total_amount: parseFloat(item.total_amount) || 0,
        purchase_date: multiDate, supplier: multiSupplier || null,
        category: multiCategory, notes: multiNotes || null,
        user_id: user?.id ?? null, company_id: profile?.company_id ?? '',
      };
      const { error } = await supabase.from('purchases').insert(payload as never);
      if (!error) {
        successCount++;
        if (item.product_id) {
          const prod = products.find(p => p.id === item.product_id);
          const prevQty = prod?.stock_quantity ?? 0;
          const newQty = prevQty + Number(item.quantity);
          const unitCostValue = parseFloat(item.unit_cost) || 0;
          await Promise.all([
            supabase.from('products').update({ stock_quantity: newQty, cost_price: unitCostValue, updated_at: new Date().toISOString() } as never).eq('id', item.product_id),
            supabase.from('inventory_logs').insert({
              product_id: item.product_id, user_id: user?.id ?? null, type: 'purchase',
              quantity_change: Number(item.quantity), quantity_before: prevQty, quantity_after: newQty,
              justification: multiNotes || `Compra registrada — Fornecedor: ${multiSupplier || 'N/A'}`,
              user_name: profile?.full_name ?? user?.email ?? 'Usuário',
            } as never),
          ]);
        }
      }
    }
    toast({ title: `✅ ${successCount} compra(s) registrada(s) e estoque atualizado!` });
    setDialogOpen(false);
    fetchPurchases(); fetchProducts();
    setMultiSubmitting(false);
  };

  const openNewProductModal = async () => {
    setNewProductForm({ ...emptyNewProductForm });
    setNewProductModalOpen(true);
    if (profile?.company_id) {
      setGeneratingSku(true);
      const sku = await generateSku(profile.company_id);
      setNewProductForm(f => ({ ...f, sku }));
      setGeneratingSku(false);
    }
  };

  const handleNewProductSave = async () => {
    if (!newProductForm.name.trim()) {
      toast({ title: 'Nome do produto é obrigatório', variant: 'destructive' });
      return;
    }
    setNewProductSubmitting(true);
    const { data: newProd, error: prodErr } = await supabase.from('products').insert({
      name: newProductForm.name.trim(), sku: newProductForm.sku || null,
      unit_price: parseFloat(newProductForm.unit_price) || 0,
      cost_price: parseFloat(newProductForm.cost_price) || 0,
      stock_quantity: 0, min_stock: Number(newProductForm.min_stock) || 5,
      category: newProductForm.category_name || null,
      category_id: newProductForm.category_id || null,
      company_id: profile?.company_id ?? '', updated_at: new Date().toISOString(),
    } as never).select('id, name, unit_price, cost_price, stock_quantity, category, category_id, sku, min_stock').single();
    if (prodErr) {
      toast({ title: 'Erro ao criar produto', description: prodErr.message, variant: 'destructive' });
      setNewProductSubmitting(false); return;
    }
    const created = newProd as Product;
    setProducts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(f => ({
      ...f, product_id: created.id, product_name: created.name,
      unit_cost: String(created.cost_price || 0),
      total_amount: (f.quantity * (created.cost_price || 0)).toFixed(2),
    }));
    setProductSearch(created.name);
    setNewProductModalOpen(false);
    toast({ title: `Produto "${created.name}" criado e selecionado!` });
    setNewProductSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim()) {
      toast({ title: 'Selecione ou informe um produto', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const payload = {
      product_id: form.product_id || null, product_name: form.product_name,
      quantity: Number(form.quantity), unit_cost: parseFloat(form.unit_cost),
      total_amount: parseFloat(form.total_amount), purchase_date: form.purchase_date,
      supplier: form.supplier || null, category: form.category, notes: form.notes || null,
      user_id: user?.id ?? null, company_id: profile?.company_id ?? '',
    };
    let error: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('purchases').update({ ...payload, updated_at: new Date().toISOString() } as never).eq('id', editingId);
      error = res.error as { message: string } | null;
    } else {
      const res = await supabase.from('purchases').insert(payload as never);
      error = res.error as { message: string } | null;
      if (!error && form.product_id) {
        const prod = products.find(p => p.id === form.product_id);
        const prevQty = prod?.stock_quantity ?? 0;
        const newQty = prevQty + Number(form.quantity);
        const unitCostValue = parseFloat(form.unit_cost) || 0;
        await Promise.all([
          supabase.from('products').update({ stock_quantity: newQty, cost_price: unitCostValue, updated_at: new Date().toISOString() } as never).eq('id', form.product_id),
          supabase.from('inventory_logs').insert({
            product_id: form.product_id, user_id: user?.id ?? null, type: 'purchase',
            quantity_change: Number(form.quantity), quantity_before: prevQty, quantity_after: newQty,
            justification: form.notes || `Compra registrada — Fornecedor: ${form.supplier || 'N/A'}`,
            user_name: profile?.full_name ?? user?.email ?? 'Usuário',
          } as never),
        ]);
        fetchProducts();
      }
    }
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); }
    else { toast({ title: editingId ? 'Compra atualizada!' : '✅ Compra registrada e estoque atualizado!' }); setDialogOpen(false); fetchPurchases(); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
    else { toast({ title: 'Compra excluída!' }); setPurchases(prev => prev.filter(p => p.id !== id)); }
    setDeleteId(null);
  };

  // ===== SUPPLIER HELPERS =====
  const handleCreateSupplier = async (nameOverride?: string) => {
    const name = (nameOverride ?? newSupplierName).trim();
    if (!name) return null;
    setSupplierSubmitting(true);
    const result = await (supabase.from('suppliers' as never) as unknown as { insert: (v: object) => { select: (s: string) => { single: () => Promise<{ data: Supplier | null; error: { message: string } | null }> } } })
      .insert({ company_id: profile?.company_id ?? '', name })
      .select('id, name, phone, email')
      .single();
    const { data, error } = result;
    if (error) { toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' }); setSupplierSubmitting(false); return null; }
    if (data) {
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: `Fornecedor "${data.name}" cadastrado!` });
    }
    setSupplierModalOpen(false);
    setNewSupplierName('');
    setSupplierSubmitting(false);
    return data;
  };

  // ===== OCR SCANNER HELPERS =====
  const openScanner = () => {
    setScanFile(null); setScanPreview(null); setScanResult(null); setScannedItems([]);
    setScannedSupplier(''); setScannedDate(format(new Date(), 'yyyy-MM-dd'));
    setScannerOpen(true);
  };

  const handleScanFileChange = (file: File) => {
    setScanFile(file);
    const reader = new FileReader();
    reader.onload = e => setScanPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleScanFileChange(file);
  };

  const handleScan = async () => {
    if (!scanFile) return;
    setScanning(true);
    setScanStatus('Processando com IA (Gemini)...');
    try {
      const arrayBuffer = await scanFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const imageBase64 = btoa(binary);
      const mimeType = scanFile.type || 'image/jpeg';

      // Fetch company context to get the Gemini API Key
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Sessão expirada. Faça login novamente.');

      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', userId).single() as { data: { company_id: string } | null; error: unknown };
      if (!profile?.company_id) throw new Error('Perfil ou empresa não encontrados.');

      const { data: company } = await supabase.from('companies').select('gemini_api_key').eq('id', profile.company_id).single() as { data: { gemini_api_key: string | null } | null; error: unknown };
      if (!company?.gemini_api_key) throw new Error('Chave da API Gemini não configurada. Acesse Configurações > Inteligência Artificial e adicione sua chave.');

      // Initialize Gemini SDK with gemini-1.5-flash which is standard, fast, and stable
      const genAI = new GoogleGenerativeAI(company.gemini_api_key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Você é um assistente de entrada de estoque. Analise esta imagem de nota fiscal/cupom e retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, exatamente neste formato:
{
  "fornecedor_nome": "Nome do Fornecedor ou Estabelecimento",
  "data_emissao": "YYYY-MM-DD ou null",
  "valor_total_nota": 0.00,
  "numero_nota": "número ou null",
  "itens": [
    {
      "descricao": "Nome do produto/item",
      "quantidade": 1,
      "valor_unitario": 0.00
    }
  ]
}

REGRAS:
- Extraia TODOS os itens listados na nota
- Use ponto como separador decimal
- Se o fornecedor não estiver claro, use "Fornecedor Desconhecido"
- Para datas converta para YYYY-MM-DD
- valor_total_nota é o valor total da nota (pode incluir frete, descontos etc.)
- Não adicione comentários ou texto fora do JSON`;

      const resultGenerate = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType } }
      ]);
      
      const content = resultGenerate.response.text();
      if (!content) throw new Error("A IA devolveu uma resposta vazia.");
      
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("A IA não retornou os dados no formato esperado.");
        }
      }

      const result = {
        supplier: parsed.fornecedor_nome || parsed.supplier || "Fornecedor Desconhecido",
        invoice_date: parsed.data_emissao || parsed.invoice_date || null,
        invoice_number: parsed.numero_nota || parsed.invoice_number || null,
        total_note: Number(parsed.valor_total_nota ?? parsed.total_note ?? 0),
        items: (parsed.itens || parsed.items || []).map((item: any) => ({
          description: String(item.descricao || item.description || ""),
          quantity: Number(item.quantidade || item.quantity || 1),
          unit_price: Number(item.valor_unitario || item.unit_price || 0),
          total_price: Number(item.valor_unitario || item.unit_price || 0) * Number(item.quantidade || item.quantity || 1),
        })),
      };

      setScanResult(result);
      setScannedSupplier(result.supplier || '');
      if (result.invoice_date) setScannedDate(result.invoice_date);

      const items: ScannedItem[] = (result.items || []).map(item => {
        const matched = findBestProductMatch(item.description, products);
        return {
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || (item.unit_price * item.quantity),
          matched_product_id: matched?.id ?? null,
          matched_product_name: matched?.name ?? null,
          include: true,
          justification: '',
        };
      });
      setScannedItems(items);

      if (items.length === 0) {
        toast({ title: 'Nenhum item encontrado', description: 'Por favor, tente enviar outra foto mais nítida ou preencha manualmente detalhe a detalhe.', variant: 'default' });
      } else {
        toast({ title: `✅ IA identificou ${items.length} item(ns) na nota!` });
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      const isRateLimit = msg.includes('Too Many Requests') || msg.includes('429');
      const isInvalidKey = msg.includes('API_KEY_INVALID') || msg.includes('400');
      
      toast({ 
        title: isRateLimit ? 'Limite de IA Atingido ⏳' : isInvalidKey ? 'Chave de IA Inválida 🔑' : 'Erro ao processar a nota fiscal', 
        description: isRateLimit 
          ? 'Muitas notas processadas no momento. Aguarde cerca de 1 minuto para tentar novamente.' 
          : isInvalidKey 
          ? 'Verifique se a chave do Gemini inserida nas Configurações do seu sistema é válida.'
          : `${msg}. Por favor, adicione os itens manualmente.`, 
        variant: 'destructive',
        duration: isRateLimit || isInvalidKey ? 7000 : 5000,
      });
    }
    setScanning(false);
  };

  const handleBatchImport = async () => {
    const toImport = scannedItems.filter(i => i.include);
    if (toImport.length === 0) {
      toast({ title: 'Selecione ao menos um item para importar', variant: 'destructive' }); return;
    }
    setBatchSubmitting(true);
    let successCount = 0;
    for (const item of toImport) {
      const productId = item.matched_product_id;
      const productName = item.matched_product_name || item.description;
      const payload = {
        product_id: productId || null, product_name: productName,
        quantity: item.quantity, unit_cost: item.unit_price,
        total_amount: item.total_price, purchase_date: scannedDate,
        supplier: scannedSupplier || null, category: 'product',
        notes: item.justification || `Importado via OCR`,
        user_id: user?.id ?? null, company_id: profile?.company_id ?? '',
      };
      const { error } = await supabase.from('purchases').insert(payload as never);
      if (!error) {
        successCount++;
        if (productId) {
          const prod = products.find(p => p.id === productId);
          const prevQty = prod?.stock_quantity ?? 0;
          const newQty = prevQty + item.quantity;
          await Promise.all([
            supabase.from('products').update({ stock_quantity: newQty, cost_price: item.unit_price, updated_at: new Date().toISOString() } as never).eq('id', productId),
            supabase.from('inventory_logs').insert({
              product_id: productId, user_id: user?.id ?? null, type: 'purchase',
              quantity_change: item.quantity, quantity_before: prevQty, quantity_after: newQty,
              justification: item.justification || `Compra via OCR — Fornecedor: ${scannedSupplier || 'N/A'}`,
              user_name: profile?.full_name ?? user?.email ?? 'Usuário',
            } as never),
          ]);
        }
      }
    }
    toast({ title: `✅ ${successCount} compra(s) importada(s) com sucesso!` });
    fetchPurchases(); fetchProducts();
    setScannerOpen(false);
    setBatchSubmitting(false);
  };

  const openOcrNewProduct = async (item: ScannedItem, idx: number) => {
    setOcrNewProductItem(item);
    setOcrNewProductIdx(idx);
    const form = { ...emptyNewProductForm, name: item.description, cost_price: String(item.unit_price) };
    setOcrNewProdForm(form);
    if (profile?.company_id) {
      setOcrNewProdSkuGenerating(true);
      const sku = await generateSku(profile.company_id);
      setOcrNewProdForm(f => ({ ...f, sku }));
      setOcrNewProdSkuGenerating(false);
    }
  };

  const handleOcrNewProductSave = async () => {
    if (!ocrNewProdForm.name.trim()) return;
    setOcrNewProdSubmitting(true);
    const { data: newProd, error } = await supabase.from('products').insert({
      name: ocrNewProdForm.name.trim(), sku: ocrNewProdForm.sku || null,
      unit_price: parseFloat(ocrNewProdForm.unit_price) || 0,
      cost_price: parseFloat(ocrNewProdForm.cost_price) || 0,
      stock_quantity: 0, min_stock: Number(ocrNewProdForm.min_stock) || 5,
      category: ocrNewProdForm.category_name || null,
      category_id: ocrNewProdForm.category_id || null,
      company_id: profile?.company_id ?? '', updated_at: new Date().toISOString(),
    } as never).select('id, name, unit_price, cost_price, stock_quantity, category, category_id, sku, min_stock').single();
    if (error) {
      toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
      setOcrNewProdSubmitting(false); return;
    }
    const created = newProd as Product;
    setProducts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setScannedItems(prev => prev.map((it, i) =>
      i === ocrNewProductIdx
        ? { ...it, matched_product_id: created.id, matched_product_name: created.name }
        : it
    ));
    setOcrNewProductItem(null);
    toast({ title: `Produto "${created.name}" cadastrado e vinculado!` });
    setOcrNewProdSubmitting(false);
  };

  const filtered = purchases.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalCost = filtered.reduce((s, r) => s + Number(r.total_amount), 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const selectedProduct = products.find(p => p.id === form.product_id);
  const selectedCategory = selectedProduct?.category_id ? categories.find(c => c.id === selectedProduct.category_id) : null;
  const includedItemsSum = scannedItems.filter(i => i.include).reduce((s, i) => s + i.total_price, 0);
  const noteDiff = scanResult ? Math.abs(includedItemsSum - scanResult.total_note) : 0;
  const multiTotal = multiItems.reduce((s, it) => s + (parseFloat(it.total_amount) || 0), 0);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-danger" /> Compras & Entradas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Estoque atualizado automaticamente ao confirmar</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <MonthFilterSelect />
            <Button onClick={fetchPurchases} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={openScanner} size="sm" variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              <ScanLine className="w-4 h-4" /> Escanear Nota
            </Button>
            <Button onClick={openNew} size="sm" className="gap-2 gradient-danger text-danger-foreground shadow-md">
              <Plus className="w-4 h-4" /> Nova Compra
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Lançamentos', value: filtered.length.toString(), color: 'text-foreground' },
            { label: 'Custo Total', value: formatBRL(totalCost), color: 'text-danger' },
            { label: 'Produtos', value: filtered.filter(p => p.category === 'product').length.toString(), color: 'text-primary' },
            { label: 'Despesas', value: filtered.filter(p => p.category === 'expense').length.toString(), color: 'text-warning' },
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
              <Input placeholder="Buscar por produto ou fornecedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma compra encontrada neste período</p>
              <p className="text-sm mt-1 mb-4">Use "Escanear Nota" para importar via foto ou "Nova Compra" para lançamento manual</p>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={openScanner} className="gap-2 border-primary/40 text-primary">
                  <ScanLine className="w-4 h-4" /> Escanear Nota
                </Button>
                <Button size="sm" onClick={openNew} className="gap-2 gradient-danger text-danger-foreground">
                  <Plus className="w-4 h-4" /> Nova Compra
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Data', 'Produto', 'Qtd', 'Custo Unit.', 'Total', 'Fornecedor', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateBR(p.purchase_date)}</td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{p.product_name}</td>
                      <td className="px-4 py-3 text-center">{p.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(Number(p.unit_cost))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">{formatBRL(Number(p.total_amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.supplier ?? '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="h-7 w-7 p-0 hover:bg-danger/10 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {/* ===== OCR SCANNER DIALOG ===== */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Escanear Nota com IA (Gemini)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!scanResult && (
              <div className="space-y-4">
                <div
                  className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
                    ${scanPreview ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => !scanFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScanFileChange(f); }}
                  />
                  {scanPreview ? (
                    <div className="relative">
                      <img src={scanPreview} alt="Nota" className="w-full max-h-72 object-contain rounded-xl p-2" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setScanFile(null); setScanPreview(null); }}
                        className="absolute top-3 right-3 bg-card border border-border rounded-full p-1 hover:bg-muted shadow"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Arraste a foto aqui ou clique para selecionar</p>
                        <p className="text-sm mt-1">JPG, PNG ou WEBP • Suporta câmera no celular</p>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                          <Camera className="w-3.5 h-3.5" /> Selecionar arquivo
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={e => {
                          e.stopPropagation();
                          const inp = fileInputRef.current;
                          if (inp) { inp.setAttribute('capture', 'environment'); inp.click(); }
                        }}>
                          <Camera className="w-3.5 h-3.5" /> Abrir câmera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {scanFile && (
                  <div className="space-y-3">
                    {scanning && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{scanStatus || 'Processando com IA...'}</span>
                        </div>
                        <div className="w-full bg-primary/20 rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-2 rounded-full animate-pulse w-3/4" />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          Gemini 2.0 Flash está lendo sua nota fiscal...
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button onClick={handleScan} disabled={scanning} className="gap-2 gradient-primary text-primary-foreground shadow-primary">
                        {scanning
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando com IA...</>
                          : <><Sparkles className="w-4 h-4" /> Analisar com Gemini</>}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scanResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {scanPreview && (
                    <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
                      <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nota enviada</span>
                        <button type="button" className="ml-auto text-xs text-primary hover:underline"
                          onClick={() => { setScanResult(null); setScanFile(null); setScanPreview(null); setScannedItems([]); }}>
                          Trocar foto
                        </button>
                      </div>
                      <img src={scanPreview} alt="Nota" className="w-full max-h-80 object-contain p-2" />
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Dados extraídos pela IA
                    </p>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                      <div className="flex gap-1">
                        <Input value={scannedSupplier} onChange={e => setScannedSupplier(e.target.value)} className="h-9 text-sm" placeholder="Nome do fornecedor" />
                        <Button type="button" size="sm" variant="outline" className="h-9 px-2 shrink-0 text-primary border-primary/30" title="Cadastrar fornecedor"
                          onClick={() => { setNewSupplierName(scannedSupplier); setSupplierModalOpen(true); }}>
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data da compra</Label>
                      <Input type="date" value={scannedDate} onChange={e => setScannedDate(e.target.value)} className="h-9 text-sm" />
                    </div>
                    {scanResult.invoice_number && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                        Nota Nº <strong>{scanResult.invoice_number}</strong>
                      </div>
                    )}
                  </div>
                  <div className={`rounded-xl p-4 border ${noteDiff < 0.05 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className={`w-4 h-4 ${noteDiff < 0.05 ? 'text-success' : 'text-warning'}`} />
                      <p className="text-sm font-semibold text-foreground">Resumo Comparativo</p>
                      {noteDiff < 0.05 ? (
                        <Badge className="ml-auto bg-success/20 text-success border-success/30 text-xs">✓ Valores batem</Badge>
                      ) : (
                        <Badge className="ml-auto bg-warning/20 text-warning border-warning/30 text-xs">⚠ Dif. {formatBRL(noteDiff)}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-card rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Valor na Nota</p>
                        <p className="font-bold text-foreground mt-0.5 text-sm">{formatBRL(scanResult.total_note || 0)}</p>
                      </div>
                      <div className="bg-card rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Soma dos Itens</p>
                        <p className="font-bold text-primary mt-0.5 text-sm">{formatBRL(includedItemsSum)}</p>
                      </div>
                      <div className="bg-card rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Selecionados</p>
                        <p className="font-bold text-foreground mt-0.5 text-sm">{scannedItems.filter(i => i.include).length}/{scannedItems.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" /> Itens da Nota ({scannedItems.length})
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <button type="button" className="hover:text-foreground" onClick={() => setScannedItems(p => p.map(i => ({ ...i, include: true })))}>Marcar todos</button>
                      <span>·</span>
                      <button type="button" className="hover:text-foreground" onClick={() => setScannedItems(p => p.map(i => ({ ...i, include: false })))}>Desmarcar</button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {scannedItems.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Nenhum item foi identificado</p>
                        <p className="text-xs mt-1">Não foi possível ler todos os dados.<br/>Tente outra foto ou preencha manualmente.</p>
                      </div>
                    ) : (
                      scannedItems.map((item, idx) => (
                        <div key={idx} className={`border rounded-lg p-3 transition-all ${item.include ? 'border-border bg-card' : 'border-border/40 bg-muted/20 opacity-60'}`}>
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox" checked={item.include} onChange={e => setScannedItems(p => p.map((it, i) => i === idx ? { ...it, include: e.target.checked } : it))}
                              className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-wrap items-start gap-1">
                                <span className="font-medium text-sm text-foreground flex-1 min-w-0">{item.description}</span>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">{item.quantity}x {formatBRL(item.unit_price)}</p>
                                  <p className="text-sm font-bold text-foreground">{formatBRL(item.total_price)}</p>
                                </div>
                              </div>
                              {item.matched_product_id ? (
                                <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-md">
                                  <Link className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Vinculado: <strong>{item.matched_product_name}</strong></span>
                                  <button type="button" className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={() => setScannedItems(p => p.map((it, i) => i === idx ? { ...it, matched_product_id: null, matched_product_name: null } : it))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-md flex-1 min-w-0">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Sem produto vinculado</span>
                                  </div>
                                  <Select value="" onValueChange={v => setScannedItems(p => p.map((it, i) => {
                                    if (i !== idx) return it;
                                    const prod = products.find(p => p.id === v);
                                    return { ...it, matched_product_id: v, matched_product_name: prod?.name ?? '' };
                                  }))}>
                                    <SelectTrigger className="h-6 text-xs w-28 border-border shrink-0">
                                      <SelectValue placeholder="Vincular..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Button type="button" size="sm" variant="outline"
                                    className="h-6 px-2 text-xs gap-1 border-primary/30 text-primary shrink-0"
                                    onClick={() => openOcrNewProduct(item, idx)}>
                                    <Plus className="w-3 h-3" /> Novo
                                  </Button>
                                </div>
                              )}
                              <Input
                                placeholder="Observação / justificativa (opcional)"
                                value={item.justification}
                                onChange={e => setScannedItems(p => p.map((it, i) => i === idx ? { ...it, justification: e.target.value } : it))}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button
                    onClick={handleBatchImport}
                    disabled={batchSubmitting || scannedItems.filter(i => i.include).length === 0}
                    className="w-full gap-2 gradient-danger text-danger-foreground shadow-md"
                  >
                    {batchSubmitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                      : <><CheckCircle className="w-4 h-4" /> Confirmar {scannedItems.filter(i => i.include).length} Compra(s)</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* ===== MAIN PURCHASE FORM DIALOG (Single + Multi) ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${multiMode ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {multiMode ? <><ListPlus className="w-5 h-5 text-warning" /> Compra com Múltiplos Produtos</> : editingId ? 'Editar Lançamento' : 'Nova Compra / Entrada'}
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
                  onClick={() => { setMultiMode(true); setMultiItems([newPurchaseItem()]); }}
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
                  <Label>Tipo</Label>
                  <Select value={multiCategory} onValueChange={setMultiCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produto / Mercadoria</SelectItem>
                      <SelectItem value="expense">Despesa Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Fornecedor</Label>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setNewSupplierName(multiSupplier); setSupplierModalOpen(true); }}
                        className="h-6 w-6 p-0 text-primary hover:bg-primary/10" title="Cadastrar novo fornecedor">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="Gerenciar fornecedores">
                        <a href="/suppliers" target="_blank" rel="noopener"><Settings className="w-4 h-4" /></a>
                      </Button>
                    </div>
                  </div>
                  <SupplierCombobox
                    value={multiSupplier}
                    onChange={v => setMultiSupplier(v)}
                    suppliers={suppliers}
                    onCreateNew={name => { setNewSupplierName(name); setSupplierModalOpen(true); }}
                  />
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Produtos ({multiItems.length})</Label>
                  <span className="text-sm font-bold text-danger">{formatBRL(multiTotal)}</span>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {multiItems.map((item, idx) => {
                    const filtProd = products.filter(p => p.name.toLowerCase().includes(item.productSearch.toLowerCase()));
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-border rounded-lg p-3 bg-card space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                          {/* Product search */}
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
                                  {filtProd.map(p => (
                                    <button key={p.id} type="button" onClick={() => selectMultiProduct(item.id, p)}
                                      className="w-full text-left px-2.5 py-2 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-foreground truncate">{p.name}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">{formatBRL(p.cost_price)}</span>
                                      </div>
                                    </button>
                                  ))}
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
                        <div className="grid grid-cols-3 gap-2 pl-7">
                          <div>
                            <Label className="text-xs text-muted-foreground">Qtd *</Label>
                            <Input type="number" min={1} value={item.quantity} className="h-8 text-sm"
                              onChange={e => { const q = Number(e.target.value); updateMultiItem(item.id, { quantity: q }); calcMultiTotal(item.id, q, item.unit_cost); }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Custo Unit. (R$) *</Label>
                            <Input type="number" step="0.01" value={item.unit_cost} className="h-8 text-sm" placeholder="0,00"
                              onChange={e => { updateMultiItem(item.id, { unit_cost: e.target.value }); calcMultiTotal(item.id, item.quantity, e.target.value); }} />
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
                  onClick={() => setMultiItems(prev => [...prev, newPurchaseItem()])}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar Produto
                </Button>
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={multiNotes} onChange={e => setMultiNotes(e.target.value)} placeholder="Opcional" className="min-h-[52px] text-sm" />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{multiItems.filter(it => it.product_name.trim()).length} produto(s) · {multiDate}</span>
                <span className="font-bold text-danger text-base">{formatBRL(multiTotal)}</span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={multiSubmitting} className="gradient-danger text-danger-foreground">
                  {multiSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : `Confirmar ${multiItems.filter(it => it.product_name.trim()).length} Compra(s)`}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* === SINGLE MODE === */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Produto *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={openNewProductModal}
                    className="h-7 px-2 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10">
                    <Plus className="w-3 h-3" /> Produto Novo
                  </Button>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setForm(f => ({ ...f, product_name: e.target.value, product_id: '' })); setProductDropdownOpen(true); }}
                      onFocus={() => setProductDropdownOpen(true)}
                      placeholder="Buscar produto existente..." className="pl-9" required />
                  </div>
                  <AnimatePresence>
                    {productDropdownOpen && filteredProducts.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {filteredProducts.map(p => {
                          const minStock = p.min_stock ?? 5;
                          const stockColor = p.stock_quantity === 0 ? 'text-danger' : p.stock_quantity <= minStock ? 'text-warning' : 'text-success';
                          return (
                            <button key={p.id} type="button" onClick={() => selectProduct(p)}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                                  {p.sku && <p className="text-xs text-muted-foreground font-mono">SKU: {p.sku}</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className={`text-xs font-bold ${stockColor}`}>{p.stock_quantity} un.</p>
                                  <p className="text-xs text-muted-foreground">{formatBRL(p.cost_price)}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {productDropdownOpen && <button type="button" className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />}
                </div>
                {selectedProduct && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Estoque atual</span>
                      <span className={`font-bold ${selectedProduct.stock_quantity === 0 ? 'text-danger' : selectedProduct.stock_quantity <= (selectedProduct.min_stock ?? 5) ? 'text-warning' : 'text-success'}`}>
                        {selectedProduct.stock_quantity} un.
                      </span>
                    </div>
                    {selectedCategory && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Categoria</span>
                        <Badge variant="outline" className="text-xs py-0 h-5">{selectedCategory.name}</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-info">
                      <Info className="w-3 h-3" />
                      <span>Após salvar, <strong>+{form.quantity}</strong> unidade(s) serão somadas ao estoque.</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Quantidade *</Label>
                  <Input type="number" min={1} value={form.quantity}
                    onChange={e => { const q = Number(e.target.value); setForm(f => ({ ...f, quantity: q })); calcTotal(q, form.unit_cost); }} required />
                </div>
                <div className="space-y-1">
                  <Label>Custo Unitário (R$) *</Label>
                  <Input type="number" step="0.01" value={form.unit_cost}
                    onChange={e => { setForm(f => ({ ...f, unit_cost: e.target.value })); calcTotal(form.quantity, e.target.value); }} required />
                </div>
                <div className="space-y-1">
                  <Label>Total (R$)</Label>
                  <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Data *</Label>
                  <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Fornecedor</Label>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setNewSupplierName(form.supplier); setSupplierModalOpen(true); }}
                        className="h-6 w-6 p-0 text-primary hover:bg-primary/10" title="Cadastrar novo fornecedor">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="Gerenciar fornecedores">
                        <a href="/suppliers" target="_blank" rel="noopener"><Settings className="w-4 h-4" /></a>
                      </Button>
                    </div>
                  </div>
                  <SupplierCombobox
                    value={form.supplier}
                    onChange={v => setForm(f => ({ ...f, supplier: v }))}
                    suppliers={suppliers}
                    onCreateNew={name => { setNewSupplierName(name); setSupplierModalOpen(true); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produto / Mercadoria</SelectItem>
                      <SelectItem value="expense">Despesa Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Observações / Justificativa</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Reposição de estoque, promoção, ajuste de preço..." className="min-h-[60px] text-sm" />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting} className="gradient-danger text-danger-foreground">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Confirmar Compra'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== NEW PRODUCT MODAL ===== */}
      <Dialog open={newProductModalOpen} onOpenChange={setNewProductModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Cadastrar Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do Produto *</Label>
              <Input value={newProductForm.name} onChange={e => setNewProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Camiseta Básica Branca" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>SKU (automático)</Label>
                <div className="flex gap-2">
                  <Input value={newProductForm.sku} readOnly className="flex-1 bg-muted text-muted-foreground font-mono text-sm" placeholder="..." />
                  <Button type="button" variant="outline" size="sm" disabled={generatingSku}
                    onClick={async () => { if (profile?.company_id) { setGeneratingSku(true); const sku = await generateSku(profile.company_id); setNewProductForm(f => ({ ...f, sku })); setGeneratingSku(false); } }}>
                    {generatingSku ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Gerado automaticamente</p>
              </div>
              <div className="space-y-1">
                <Label>Custo Unitário (R$) *</Label>
                <Input type="number" step="0.01" min={0} value={newProductForm.cost_price} onChange={e => setNewProductForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label>Preço de Venda (R$)</Label>
                <Input type="number" step="0.01" min={0} value={newProductForm.unit_price} onChange={e => setNewProductForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label>Estoque Mínimo</Label>
                <Input type="number" min={0} value={newProductForm.min_stock} onChange={e => setNewProductForm(f => ({ ...f, min_stock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={newProductForm.category_id || '__none__'} onValueChange={v => {
                  const cat = categories.find(c => c.id === (v === '__none__' ? '' : v));
                  setNewProductForm(f => ({ ...f, category_id: v === '__none__' ? '' : v, category_name: cat?.name ?? '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProductModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewProductSave} disabled={newProductSubmitting || !newProductForm.name.trim()} className="gradient-primary text-primary-foreground shadow-primary">
              {newProductSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar e Selecionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== OCR NEW PRODUCT MODAL ===== */}
      <Dialog open={!!ocrNewProductItem} onOpenChange={v => { if (!v) setOcrNewProductItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Cadastrar Produto da Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground">
              Item da nota: <strong className="text-foreground">{ocrNewProductItem?.description}</strong>
            </div>
            <div className="space-y-1">
              <Label>Nome do Produto *</Label>
              <Input value={ocrNewProdForm.name} onChange={e => setOcrNewProdForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>SKU (automático)</Label>
                <div className="flex gap-2">
                  <Input value={ocrNewProdForm.sku} readOnly className="flex-1 bg-muted font-mono text-sm" />
                  <Button type="button" variant="outline" size="sm" disabled={ocrNewProdSkuGenerating}
                    onClick={async () => { if (profile?.company_id) { setOcrNewProdSkuGenerating(true); const sku = await generateSku(profile.company_id); setOcrNewProdForm(f => ({ ...f, sku })); setOcrNewProdSkuGenerating(false); } }}>
                    {ocrNewProdSkuGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Custo (R$)</Label>
                <Input type="number" step="0.01" value={ocrNewProdForm.cost_price} onChange={e => setOcrNewProdForm(f => ({ ...f, cost_price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Preço Venda (R$)</Label>
                <Input type="number" step="0.01" value={ocrNewProdForm.unit_price} onChange={e => setOcrNewProdForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estoque Mínimo</Label>
                <Input type="number" min={0} value={ocrNewProdForm.min_stock} onChange={e => setOcrNewProdForm(f => ({ ...f, min_stock: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Categoria</Label>
                <Select value={ocrNewProdForm.category_id || '__none__'} onValueChange={v => {
                  const cat = categories.find(c => c.id === v);
                  setOcrNewProdForm(f => ({ ...f, category_id: v === '__none__' ? '' : v, category_name: cat?.name ?? '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOcrNewProductItem(null)}>Cancelar</Button>
            <Button onClick={handleOcrNewProductSave} disabled={ocrNewProdSubmitting || !ocrNewProdForm.name.trim()} className="gradient-primary text-primary-foreground shadow-primary">
              {ocrNewProdSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar e Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SUPPLIER MODAL ===== */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Cadastrar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome do Fornecedor *</Label>
              <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ex: Distribuidora XYZ" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSupplier(); } }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleCreateSupplier()} disabled={supplierSubmitting || !newSupplierName.trim()} className="gradient-primary text-primary-foreground">
              {supplierSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-danger flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Tem certeza que deseja excluir esta compra? O estoque não será revertido automaticamente.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
