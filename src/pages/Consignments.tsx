import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Handshake, Plus, Search, X, Loader2, Package, FileDown, CircleDollarSign,
  ListPlus, RefreshCw, Truck, Filter,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Database } from '@/integrations/supabase/database.types';

type ConsignmentRow = Database['public']['Tables']['consignments']['Row'];
type PaymentRow = Database['public']['Tables']['consignment_payments']['Row'];
interface Supplier { id: string; name: string; phone: string | null; email: string | null }
interface Product { id: string; name: string; sku: string | null; cost_price: number; stock_quantity: number }

interface EnrichedConsignment extends ConsignmentRow {
  totalAmount: number;
  paidQty: number;
  paidAmount: number;
  pendingQty: number;
  pendingAmount: number;
  status: 'paid' | 'partial' | 'pending';
}

interface EntryItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: string;
  productSearch: string;
  dropdownOpen: boolean;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDateBR = (dateStr: string | null) => {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return format(parseISO(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  }
  return dateStr;
};

const newEntryItem = (): EntryItem => ({
  id: Math.random().toString(36).slice(2),
  product_id: '', product_name: '', sku: '', quantity: 1, unit_cost: '',
  productSearch: '', dropdownOpen: false,
});

const statusMeta = (status: EnrichedConsignment['status']) => {
  if (status === 'paid') return { label: 'Pago', cls: 'bg-success/15 text-success border-success/30' };
  if (status === 'partial') return { label: 'Parcial', cls: 'bg-warning/15 text-warning border-warning/30' };
  return { label: 'Pendente', cls: 'bg-danger/15 text-danger border-danger/30' };
};

export default function Consignments() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [consignments, setConsignments] = useState<ConsignmentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // New entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryNotes, setEntryNotes] = useState('');
  const [entryItems, setEntryItems] = useState<EntryItem[]>([newEntryItem()]);
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  // Payment dialog
  const [payingRow, setPayingRow] = useState<EnrichedConsignment | null>(null);
  const [payQty, setPayQty] = useState('1');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [supRes, prodRes, consRes, payRes] = await Promise.all([
      supabase.from('suppliers' as never).select('id, name, phone, email').eq('company_id', cid).order('name') as unknown as Promise<{ data: Supplier[] | null }>,
      supabase.from('products').select('id, name, sku, cost_price, stock_quantity').eq('company_id', cid).order('name'),
      supabase.from('consignments').select('*').eq('company_id', cid).order('received_date', { ascending: false }),
      supabase.from('consignment_payments').select('*').eq('company_id', cid).order('payment_date', { ascending: false }),
    ]);
    setSuppliers(supRes.data ?? []);
    setProducts((prodRes.data as Product[]) ?? []);
    setConsignments(consRes.data ?? []);
    setPayments(payRes.data ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ===== DERIVED DATA =====
  const supplierNameById = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const paidByConsignment = useMemo(() => {
    const map = new Map<string, { qty: number; amount: number }>();
    payments.forEach(p => {
      const prev = map.get(p.consignment_id) ?? { qty: 0, amount: 0 };
      map.set(p.consignment_id, { qty: prev.qty + p.quantity_paid, amount: prev.amount + Number(p.amount || 0) });
    });
    return map;
  }, [payments]);

  const enrichedConsignments = useMemo<EnrichedConsignment[]>(() => {
    return consignments.map(c => {
      const paid = paidByConsignment.get(c.id) ?? { qty: 0, amount: 0 };
      const totalAmount = Number(c.unit_cost) * c.quantity;
      const pendingQty = Math.max(0, c.quantity - paid.qty);
      const pendingAmount = Math.max(0, totalAmount - paid.amount);
      const status: EnrichedConsignment['status'] = pendingQty <= 0 ? 'paid' : paid.qty > 0 ? 'partial' : 'pending';
      return { ...c, totalAmount, paidQty: paid.qty, paidAmount: paid.amount, pendingQty, pendingAmount, status };
    });
  }, [consignments, paidByConsignment]);

  const filteredConsignments = useMemo(() => {
    return selectedSupplierId === 'all'
      ? enrichedConsignments
      : enrichedConsignments.filter(c => c.supplier_id === selectedSupplierId);
  }, [enrichedConsignments, selectedSupplierId]);

  const filteredPayments = useMemo(() => {
    const idsInScope = new Set(filteredConsignments.map(c => c.id));
    return payments
      .filter(p => idsInScope.has(p.consignment_id))
      .map(p => ({ ...p, consignment: consignments.find(c => c.id === p.consignment_id) ?? null }))
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }, [payments, filteredConsignments, consignments]);

  const kpis = useMemo(() => {
    const totalReceived = filteredConsignments.reduce((s, c) => s + c.totalAmount, 0);
    const totalPaid = filteredConsignments.reduce((s, c) => s + c.paidAmount, 0);
    const totalPending = filteredConsignments.reduce((s, c) => s + c.pendingAmount, 0);
    const pendingItems = filteredConsignments.filter(c => c.pendingQty > 0).length;
    return { totalReceived, totalPaid, totalPending, pendingItems };
  }, [filteredConsignments]);

  // ===== NEW ENTRY DIALOG =====
  const openEntryDialog = () => {
    setEntrySupplierId(selectedSupplierId !== 'all' ? selectedSupplierId : '');
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
    setEntryNotes('');
    setEntryItems([newEntryItem()]);
    setEntryDialogOpen(true);
  };

  const updateEntryItem = (id: string, patch: Partial<EntryItem>) => {
    setEntryItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const selectEntryProduct = (itemId: string, p: Product) => {
    updateEntryItem(itemId, {
      product_id: p.id, product_name: p.name, sku: p.sku ?? '',
      unit_cost: p.cost_price ? String(p.cost_price) : '',
      productSearch: p.name, dropdownOpen: false,
    });
  };

  const entryTotal = entryItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0), 0);

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    if (!entrySupplierId) {
      toast({ title: 'Selecione um fornecedor', variant: 'destructive' }); return;
    }
    const validItems = entryItems.filter(it => it.product_id && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: 'Adicione ao menos um produto cadastrado', variant: 'destructive' }); return;
    }

    setEntrySubmitting(true);
    const supplierName = suppliers.find(s => s.id === entrySupplierId)?.name ?? 'Fornecedor';
    // Running stock per product, so repeated lines of the same product in this
    // entry accumulate instead of each overwriting the others' result.
    const stockMap = new Map(products.map(p => [p.id, p.stock_quantity ?? 0]));
    let successCount = 0;

    for (const item of validItems) {
      const prod = products.find(p => p.id === item.product_id);
      const unitCost = parseFloat(item.unit_cost) || 0;
      const qty = Number(item.quantity);

      const payload = {
        company_id: profile.company_id,
        supplier_id: entrySupplierId,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku || null,
        quantity: qty,
        unit_cost: unitCost,
        received_date: entryDate,
        notes: entryNotes || null,
        user_id: user?.id ?? null,
      };

      const { error } = await supabase.from('consignments').insert(payload as never);
      if (error) {
        console.error('[Consignments] Erro ao registrar item:', error);
        continue;
      }
      successCount++;

      if (prod) {
        const currentQty = stockMap.get(prod.id) ?? prod.stock_quantity ?? 0;
        const newQty = currentQty + qty;
        stockMap.set(prod.id, newQty);

        const stockRes = await supabase.from('products').update({ stock_quantity: newQty, cost_price: unitCost, updated_at: new Date().toISOString() } as never).eq('id', prod.id);
        if (stockRes.error) console.error('[Consignments] Erro ao atualizar estoque:', stockRes.error);

        const logRes = await supabase.from('inventory_logs').insert({
          product_id: prod.id,
          user_id: user?.id ?? null,
          type: 'purchase',
          quantity_change: qty,
          quantity_before: currentQty,
          quantity_after: newQty,
          justification: `Consignação recebida — Fornecedor: ${supplierName}`,
          user_name: profile?.full_name ?? user?.email ?? 'Usuário',
        } as never);
        if (logRes.error) console.error('[Consignments] Erro ao inserir log de estoque:', logRes.error);
      }
    }

    toast({ title: `✅ ${successCount} produto(s) recebido(s) em consignação!` });
    setEntryDialogOpen(false);
    setEntrySubmitting(false);
    fetchAll();
  };

  // ===== PAYMENT DIALOG =====
  const openPayment = (row: EnrichedConsignment) => {
    setPayingRow(row);
    setPayQty(String(row.pendingQty));
    setPayAmount(row.pendingAmount.toFixed(2));
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setPayNotes('');
  };

  const handlePayQtyChange = (v: string) => {
    setPayQty(v);
    if (!payingRow) return;
    const q = Math.max(0, Math.min(Number(v) || 0, payingRow.pendingQty));
    setPayAmount((q * Number(payingRow.unit_cost)).toFixed(2));
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRow || !profile?.company_id) return;
    const qty = Number(payQty);
    if (qty <= 0 || qty > payingRow.pendingQty) {
      toast({ title: `Quantidade deve ser entre 1 e ${payingRow.pendingQty}`, variant: 'destructive' }); return;
    }
    const amount = parseFloat(payAmount) || 0;
    setPaySubmitting(true);

    const { error: payError } = await supabase.from('consignment_payments').insert({
      company_id: profile.company_id,
      consignment_id: payingRow.id,
      quantity_paid: qty,
      amount,
      payment_date: payDate,
      notes: payNotes || null,
      user_id: user?.id ?? null,
    } as never);

    if (payError) {
      toast({ title: 'Erro ao registrar pagamento', description: payError.message, variant: 'destructive' });
      setPaySubmitting(false);
      return;
    }

    const supplierName = supplierNameById.get(payingRow.supplier_id) ?? 'Fornecedor';
    const { error: purchError } = await supabase.from('purchases').insert({
      product_id: payingRow.product_id,
      product_name: payingRow.product_name,
      quantity: qty,
      unit_cost: Number(payingRow.unit_cost),
      total_amount: amount,
      purchase_date: payDate,
      supplier: supplierName,
      category: 'Consignado',
      notes: `Pagamento de consignação — ${qty} un. de ${payingRow.product_name}`,
      user_id: user?.id ?? null,
      company_id: profile.company_id,
    } as never);
    if (purchError) console.error('[Consignments] Erro ao lançar pagamento em Compras:', purchError);

    toast({ title: 'Pagamento registrado!' });
    setPayingRow(null);
    setPaySubmitting(false);
    fetchAll();
  };

  // ===== PDF REPORT =====
  const handleGeneratePdf = () => {
    if (selectedSupplierId === 'all') return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const marginX = 14;
      let y = 18;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Consignação', marginX, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Empresa: ${profile?.company_name ?? '-'}`, marginX, y); y += 5;
      doc.text(`Fornecedor: ${supplier.name}`, marginX, y); y += 5;
      doc.text(`Data de geração: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, marginX, y); y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('Resumo', marginX, y); y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total recebido: ${formatBRL(kpis.totalReceived)}`, marginX, y); y += 5;
      doc.text(`Total pago: ${formatBRL(kpis.totalPaid)}`, marginX, y); y += 5;
      doc.text(`Total pendente: ${formatBRL(kpis.totalPending)}`, marginX, y); y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Produto', 'SKU', 'Recebido em', 'Qtd', 'Custo Unit.', 'Total', 'Pago', 'Pendente', 'Status']],
        body: filteredConsignments.map(c => [
          c.product_name,
          c.sku ?? '-',
          formatDateBR(c.received_date),
          String(c.quantity),
          formatBRL(Number(c.unit_cost)),
          formatBRL(c.totalAmount),
          formatBRL(c.paidAmount),
          formatBRL(c.pendingAmount),
          statusMeta(c.status).label,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      const afterFirstTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
      let nextY = afterFirstTable + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Histórico de Pagamentos', marginX, nextY);
      nextY += 4;

      autoTable(doc, {
        startY: nextY,
        head: [['Data', 'Produto', 'Qtd Paga', 'Valor']],
        body: filteredPayments.length > 0
          ? filteredPayments.map(p => [
              formatDateBR(p.payment_date),
              p.consignment?.product_name ?? '-',
              String(p.quantity_paid),
              formatBRL(Number(p.amount)),
            ])
          : [['—', 'Nenhum pagamento registrado', '-', '-']],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
      });

      const filename = `consignacao-${supplier.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const pdfDisabled = selectedSupplierId === 'all' || filteredConsignments.length === 0 || generatingPdf;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Handshake className="w-6 h-6 text-primary" /> Consignação
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de produtos recebidos, pagos e pendentes por fornecedor</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAll} variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={handleGeneratePdf} variant="outline" size="sm" disabled={pdfDisabled} className="gap-2">
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Gerar Relatório PDF
            </Button>
            <Button onClick={openEntryDialog} size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-primary">
              <Plus className="w-4 h-4" /> Nova Entrada
            </Button>
          </div>
        </div>

        {!loading && suppliers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum fornecedor cadastrado</p>
            <p className="text-sm mt-1 mb-4">Cadastre um fornecedor antes de controlar a consignação</p>
            <Button size="sm" asChild className="gap-2 gradient-primary text-primary-foreground">
              <a href="/suppliers"><Plus className="w-4 h-4" /> Ir para Fornecedores</a>
            </Button>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm w-fit">
              <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase">
                <Filter className="w-3.5 h-3.5 text-primary" /> Fornecedor:
              </div>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="h-8 w-56 text-xs font-medium bg-background border-border">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Recebido', value: formatBRL(kpis.totalReceived), color: 'text-primary' },
                { label: 'Total Pago', value: formatBRL(kpis.totalPaid), color: 'text-success' },
                { label: 'Total Pendente', value: formatBRL(kpis.totalPending), color: 'text-danger' },
                { label: 'Itens Pendentes', value: String(kpis.pendingItems), color: 'text-warning' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                  <p className={`text-xl font-display font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Consignments table */}
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">Produtos em Consignação</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredConsignments.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Handshake className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma consignação registrada</p>
                  <p className="text-sm mt-1 mb-4">Registre os produtos recebidos do fornecedor</p>
                  <Button size="sm" onClick={openEntryDialog} className="gap-2 gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4" /> Nova Entrada
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Produto', 'SKU', 'Fornecedor', 'Recebido em', 'Qtd', 'Custo Unit.', 'Total', 'Pago', 'Pendente', 'Status', 'Ação'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConsignments.map((c, i) => {
                        const meta = statusMeta(c.status);
                        return (
                          <motion.tr
                            key={c.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold text-foreground max-w-[180px] truncate">{c.product_name}</td>
                            <td className="px-4 py-3">
                              {c.sku ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{c.sku}</span> : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{supplierNameById.get(c.supplier_id) ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateBR(c.received_date)}</td>
                            <td className="px-4 py-3 text-center font-bold">{c.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatBRL(Number(c.unit_cost))}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatBRL(c.totalAmount)}</td>
                            <td className="px-4 py-3 text-right text-success">{formatBRL(c.paidAmount)}</td>
                            <td className="px-4 py-3 text-right text-danger font-semibold">{formatBRL(c.pendingAmount)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-xs ${meta.cls}`}>{meta.label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm" variant="outline" disabled={c.pendingQty <= 0}
                                onClick={() => openPayment(c)}
                                className="h-7 px-2 text-xs gap-1 text-success border-success/30 hover:bg-success/10 disabled:opacity-40"
                              >
                                <CircleDollarSign className="w-3.5 h-3.5" /> Pagar
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/40 border-t-2 border-border">
                        <td colSpan={6} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">TOTAL</td>
                        <td className="px-4 py-3 text-right font-bold">{formatBRL(kpis.totalReceived)}</td>
                        <td className="px-4 py-3 text-right font-bold text-success">{formatBRL(kpis.totalPaid)}</td>
                        <td className="px-4 py-3 text-right font-bold text-danger">{formatBRL(kpis.totalPending)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Payment history */}
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-success" />
                <h2 className="font-display font-semibold text-foreground text-sm">Histórico de Pagamentos</h2>
              </div>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Nenhum pagamento registrado ainda</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Data', 'Fornecedor', 'Produto', 'Qtd Paga', 'Valor', 'Observação'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(p => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateBR(p.payment_date)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{p.consignment ? supplierNameById.get(p.consignment.supplier_id) ?? '—' : '—'}</td>
                          <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{p.consignment?.product_name ?? '—'}</td>
                          <td className="px-4 py-3 text-center font-bold">{p.quantity_paid}</td>
                          <td className="px-4 py-3 text-right font-semibold text-success">{formatBRL(Number(p.amount))}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{p.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary" /> Nova Entrada de Consignação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEntrySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fornecedor *</Label>
                {suppliers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum fornecedor cadastrado. <a href="/suppliers" target="_blank" rel="noopener" className="text-primary underline">Cadastre um</a> primeiro.
                  </p>
                ) : (
                  <Select value={entrySupplierId} onValueChange={setEntrySupplierId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label>Data de Recebimento *</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Produtos ({entryItems.length})</Label>
                <span className="text-sm font-bold text-primary">{formatBRL(entryTotal)}</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {entryItems.map((item, idx) => {
                  const filtProd = products.filter(p =>
                    p.name.toLowerCase().includes(item.productSearch.toLowerCase()) ||
                    (p.sku ?? '').toLowerCase().includes(item.productSearch.toLowerCase())
                  );
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-lg p-3 bg-card space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input
                            value={item.productSearch}
                            onChange={e => updateEntryItem(item.id, { productSearch: e.target.value, product_id: '', product_name: '', dropdownOpen: true })}
                            onFocus={() => updateEntryItem(item.id, { dropdownOpen: true })}
                            placeholder="Buscar produto cadastrado..."
                            className="pl-7 h-8 text-sm"
                          />
                          <AnimatePresence>
                            {item.dropdownOpen && filtProd.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                className="absolute z-50 w-full mt-0.5 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {filtProd.map(p => (
                                  <button key={p.id} type="button" onClick={() => selectEntryProduct(item.id, p)}
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
                          {item.dropdownOpen && <button type="button" className="fixed inset-0 z-40" onClick={() => updateEntryItem(item.id, { dropdownOpen: false })} />}
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEntryItems(prev => prev.filter(it => it.id !== item.id))}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {item.product_id && (
                        <div className="grid grid-cols-3 gap-2 pl-7">
                          <div>
                            <Label className="text-xs text-muted-foreground">Qtd *</Label>
                            <Input type="number" min={1} value={item.quantity} className="h-8 text-sm"
                              onChange={e => updateEntryItem(item.id, { quantity: Number(e.target.value) })} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Custo Unit. (R$) *</Label>
                            <Input type="number" step="0.01" value={item.unit_cost} className="h-8 text-sm" placeholder="0,00"
                              onChange={e => updateEntryItem(item.id, { unit_cost: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Total</Label>
                            <div className="h-8 flex items-center text-sm font-semibold text-foreground">
                              {formatBRL((Number(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0))}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setEntryItems(prev => [...prev, newEntryItem()])}>
                <Plus className="w-3.5 h-3.5" /> Adicionar Produto
              </Button>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="Opcional" className="min-h-[52px] text-sm" />
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{entryItems.filter(it => it.product_id).length} produto(s) · {formatDateBR(entryDate)}</span>
              <span className="font-bold text-primary text-base">{formatBRL(entryTotal)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEntryDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={entrySubmitting} className="gradient-primary text-primary-foreground shadow-primary">
                {entrySubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Registrar Entrada'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payingRow} onOpenChange={(open) => !open && setPayingRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-success" /> Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          {payingRow && (
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Produto</span><span className="font-semibold text-foreground">{payingRow.product_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fornecedor</span><span className="font-semibold text-foreground">{supplierNameById.get(payingRow.supplier_id) ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pendente</span><span className="font-semibold text-danger">{payingRow.pendingQty} un. · {formatBRL(payingRow.pendingAmount)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Qtd a pagar *</Label>
                  <Input type="number" min={1} max={payingRow.pendingQty} value={payQty} onChange={e => handlePayQtyChange(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Data do Pagamento *</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional" rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayingRow(null)}>Cancelar</Button>
                <Button type="submit" disabled={paySubmitting} className="gradient-primary text-primary-foreground shadow-primary">
                  {paySubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Confirmar Pagamento'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
