import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, FileSpreadsheet, AlertCircle } from 'lucide-react';

type ShippingRate = {
  id: string;
  cep_start: string;
  cep_end: string;
  weight_min: number;
  weight_max: number;
  price: number;
  carrier_name: string | null;
  delivery_days: number | null;
  created_at: string;
};

const COMPANY_ID = 'default';

export default function AdminShipping() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('company_id', COMPANY_ID)
      .order('cep_start');
    if (data) setRates(data as ShippingRate[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) fetchRates();
  }, [user, isAdmin, fetchRates]);

  const parseCSV = (text: string): Omit<ShippingRate, 'id' | 'created_at'>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV precisa ter pelo menos o cabeçalho e uma linha de dados');

    const header = lines[0].toLowerCase().split(/[;,]/).map((h) => h.trim());
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/).map((c) => c.trim());
      if (cols.length < 3) continue;

      const row: any = { company_id: COMPANY_ID };

      header.forEach((h, idx) => {
        const val = cols[idx] || '';
        if (h.includes('cep_inicio') || h.includes('cep_start') || h === 'cep_de') row.cep_start = val.replace(/\D/g, '');
        else if (h.includes('cep_fim') || h.includes('cep_end') || h === 'cep_ate') row.cep_end = val.replace(/\D/g, '');
        else if (h.includes('peso_min') || h.includes('weight_min')) row.weight_min = parseFloat(val) || 0;
        else if (h.includes('peso_max') || h.includes('weight_max')) row.weight_max = parseFloat(val) || 99999;
        else if (h.includes('preco') || h.includes('price') || h.includes('valor')) row.price = parseFloat(val.replace(',', '.')) || 0;
        else if (h.includes('transportadora') || h.includes('carrier')) row.carrier_name = val || null;
        else if (h.includes('prazo') || h.includes('dias') || h.includes('delivery')) row.delivery_days = parseInt(val) || null;
      });

      if (row.cep_start && row.cep_end && row.price !== undefined) {
        result.push(row);
      }
    }
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) throw new Error('Nenhuma linha válida encontrada no CSV');

      // Delete existing rates and insert new ones
      await supabase.from('shipping_rates').delete().eq('company_id', COMPANY_ID);

      const { error } = await supabase.from('shipping_rates').insert(parsed);
      if (error) throw error;

      toast.success(`${parsed.length} faixas de frete importadas com sucesso!`);
      fetchRates();
    } catch (err: any) {
      toast.error('Erro ao importar CSV: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!confirm('Excluir todas as faixas de frete?')) return;
    const { error } = await supabase.from('shipping_rates').delete().eq('company_id', COMPANY_ID);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Faixas de frete removidas');
      fetchRates();
    }
  };

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatCep = (c: string) =>
    c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')}>
              <ArrowLeft size={18} />
            </Button>
            <h1 className="font-display text-lg font-bold">Tabela de Fretes</h1>
          </div>
          <div className="flex gap-2">
            {rates.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClearAll} className="gap-1">
                <Trash2 size={14} />
                Limpar
              </Button>
            )}
            <label>
              <Button asChild disabled={uploading} className="gap-2 cursor-pointer">
                <span>
                  <Upload size={16} />
                  {uploading ? 'Importando...' : 'Importar CSV'}
                </span>
              </Button>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {/* CSV Format Info */}
        <Card className="mb-6 border-accent/30 bg-accent/5">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body font-medium text-foreground mb-1">Formato do CSV</p>
                <p className="text-xs text-muted-foreground font-body">
                  O CSV deve conter as colunas: <code className="bg-muted px-1 rounded">cep_inicio</code>, <code className="bg-muted px-1 rounded">cep_fim</code>, <code className="bg-muted px-1 rounded">valor</code>.
                  Opcionais: <code className="bg-muted px-1 rounded">peso_min</code>, <code className="bg-muted px-1 rounded">peso_max</code>, <code className="bg-muted px-1 rounded">transportadora</code>, <code className="bg-muted px-1 rounded">prazo</code>.
                  Separador: vírgula ou ponto e vírgula.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center py-20">
            <FileSpreadsheet size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl text-foreground mb-2">Nenhuma tabela de frete</h3>
            <p className="text-muted-foreground text-sm font-body">
              Importe um CSV para configurar as faixas de CEP e valores
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">CEP Início</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">CEP Fim</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">Peso Min</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">Peso Max</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">Valor</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">Transportadora</th>
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 px-3">{formatCep(r.cep_start)}</td>
                    <td className="py-2 px-3">{formatCep(r.cep_end)}</td>
                    <td className="py-2 px-3">{r.weight_min}kg</td>
                    <td className="py-2 px-3">{r.weight_max}kg</td>
                    <td className="py-2 px-3 font-semibold">{formatPrice(r.price)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.carrier_name || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.delivery_days ? `${r.delivery_days} dias` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3 font-body">
              {rates.length} faixas de frete cadastradas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
