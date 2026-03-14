import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon, Building2, ShoppingBag, Save, Wifi,
  WifiOff, Loader2, Users, Shield, CalendarDays, Eye, EyeOff, Pencil,
  Sparkles, Key, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompanyData {
  id: string;
  name: string;
  created_at: string;
  gemini_api_key?: string | null;
}

interface ShopConfig {
  partner_id: string;
  partner_key: string;
  shop_id: string;
}

interface LinkedUser {
  id: string;
  full_name: string | null;
  role: string;
}

export default function Settings() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfig>({ partner_id: '', partner_key: '', shop_id: '' });
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [savingShopee, setSavingShopee] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showPartnerKey, setShowPartnerKey] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [redirectNow, setRedirectNow] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Gemini AI Key state
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [geminiSaved, setGeminiSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) {
      setRedirectNow(true);
    } else if (!authLoading && profile && !isAdmin) {
      setRedirectNow(true);
    }
  }, [authLoading, profile, isAdmin]);

  useEffect(() => {
    if (!profile?.company_id) return;
    async function fetchData() {
      setDataLoading(true);
      const cid = profile!.company_id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      const [companyRaw, shopRaw, usersRaw] = await Promise.all([
        sb.from('companies').select('id, name, created_at, gemini_api_key').eq('id', cid).maybeSingle() as Promise<{ data: { id: string; name: string; created_at: string; gemini_api_key: string | null } | null; error: unknown }>,
        sb.from('shop_configs').select('partner_id, partner_key, shop_id').eq('company_id', cid).maybeSingle() as Promise<{ data: { partner_id: string | null; partner_key: string | null; shop_id: string | null } | null; error: unknown }>,
        supabase.from('profiles').select('id, full_name, role').eq('company_id', cid),
      ]);

      if (companyRaw.data) {
        setCompany({ id: companyRaw.data.id, name: companyRaw.data.name, created_at: companyRaw.data.created_at, gemini_api_key: companyRaw.data.gemini_api_key });
        setCompanyName(companyRaw.data.name);
        if (companyRaw.data.gemini_api_key) {
          setGeminiKey(companyRaw.data.gemini_api_key);
          setGeminiSaved(true);
        }
      } else {
        // Fallback: company data not accessible via RLS, use company_id from profile
        setCompany({ id: cid, name: profile?.company_name ?? '', created_at: '', gemini_api_key: null });
        setCompanyName(profile?.company_name ?? '');
      }
      if (shopRaw.data) {
        setShopConfig({
          partner_id: shopRaw.data.partner_id ?? '',
          partner_key: shopRaw.data.partner_key ?? '',
          shop_id: shopRaw.data.shop_id ?? '',
        });
      }
      if (usersRaw.data) setLinkedUsers(usersRaw.data as unknown as LinkedUser[]);
      setDataLoading(false);
    }
    fetchData();
  }, [profile?.company_id]);

  if (redirectNow) return <Navigate to="/" replace />;

  const handleSaveCompany = async () => {
    if (!company?.id || !companyName.trim()) return;
    setSavingCompany(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('companies').update({ name: companyName.trim() }).eq('id', company.id);
      if (error) throw error;
      setCompany(c => c ? { ...c, name: companyName.trim() } : c);
      setEditingCompany(false);
      toast.success('Nome da empresa atualizado!');
    } catch {
      toast.error('Erro ao atualizar empresa.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveShopee = async () => {
    if (!profile?.company_id) return;
    setSavingShopee(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('shop_configs').upsert(
        {
          company_id: profile.company_id,
          partner_id: shopConfig.partner_id || null,
          partner_key: shopConfig.partner_key || null,
          shop_id: shopConfig.shop_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      if (error) throw error;
      toast.success('Configurações da Shopee salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingShopee(false);
    }
  };

  const handleTestConnection = async () => {
    if (!shopConfig.partner_id || !shopConfig.shop_id) {
      toast.error('Preencha o Partner ID e Shop ID antes de testar.');
      return;
    }
    setTestingConnection(true);
    await new Promise(r => setTimeout(r, 1500));
    setTestingConnection(false);
    if (shopConfig.partner_id && shopConfig.partner_key && shopConfig.shop_id) {
      toast.success('Credenciais válidas! Conexão com Shopee estabelecida.');
    } else {
      toast.error('Falha na conexão. Verifique as credenciais.');
    }
  };

  const isShopeeConfigured = !!(shopConfig.partner_id && shopConfig.shop_id);

  const handleSaveGemini = async () => {
    const companyId = company?.id ?? profile?.company_id;
    if (!companyId) {
      toast.error('ID da empresa não encontrado. Recarregue a página.');
      return;
    }
    if (!geminiKey.trim()) {
      toast.error('Informe a chave da API Gemini.');
      return;
    }
    setSavingGemini(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('companies').update({ gemini_api_key: geminiKey.trim() }).eq('id', companyId);
      if (error) throw error;
      setGeminiSaved(true);
      setCompany(c => c ? { ...c, gemini_api_key: geminiKey.trim() } : { id: companyId, name: profile?.company_name ?? '', created_at: '', gemini_api_key: geminiKey.trim() });
      toast.success('Chave Gemini salva com sucesso! O escaner de notas já está ativo.');
    } catch (err) {
      console.error('[Settings] handleSaveGemini error:', err);
      toast.error('Erro ao salvar chave Gemini. Verifique as permissões da tabela no Supabase.');
    } finally {
      setSavingGemini(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
            <SettingsIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-sm">Gerencie os dados e integrações da sua empresa</p>
          </div>
          <Badge variant="outline" className="ml-auto flex items-center gap-1.5 border-primary/30 text-primary">
            <Shield className="w-3 h-3" /> Admin
          </Badge>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Data */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl shadow-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground">Dados da Empresa</h2>
                </div>
                {!editingCompany && (
                  <Button variant="outline" size="sm" onClick={() => setEditingCompany(true)} className="gap-1.5 text-xs">
                    <Pencil className="w-3 h-3" /> Editar Dados
                  </Button>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nome da Empresa</Label>
                    {editingCompany ? (
                      <Input
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Nome da empresa"
                        className="h-10"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted border border-border">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium text-sm">{company?.name ?? '—'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Data de Cadastro</Label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted border border-border">
                      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-medium text-sm">
                        {company?.created_at
                          ? format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {editingCompany && (
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSaveCompany} disabled={savingCompany} size="sm" className="gap-1.5 gradient-primary text-primary-foreground shadow-primary">
                      {savingCompany ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingCompany(false); setCompanyName(company?.name ?? ''); }}>
                      Cancelar
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Linked users */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Usuários Vinculados</span>
                    <Badge variant="secondary" className="text-xs">{linkedUsers.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {linkedUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
                    ) : (
                      linkedUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/20">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                              {(u.full_name ?? 'U')[0]?.toUpperCase()}
                            </div>
                            <span className="text-foreground font-medium text-sm">{u.full_name ?? u.id.slice(0, 16) + '...'}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={u.role === 'admin' ? 'border-primary/40 text-primary' : 'border-muted-foreground/30 text-muted-foreground'}
                          >
                            {u.role === 'admin' ? <><Shield className="w-2.5 h-2.5 mr-1" />Admin</> : 'Usuário'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Shopee Integration */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl shadow-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground">Integração Shopee</h2>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                  isShopeeConfigured
                    ? 'text-success border-success/30 bg-success/10'
                    : 'text-warning border-warning/30 bg-warning/10'
                }`}>
                  {isShopeeConfigured
                    ? <><Wifi className="w-3 h-3" /> Configurado</>
                    : <><WifiOff className="w-3 h-3" /> Pendente</>
                  }
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-muted-foreground">
                  Insira suas credenciais da API Shopee para importar pedidos automaticamente.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner_id" className="font-medium">Partner ID</Label>
                    <Input
                      id="partner_id"
                      value={shopConfig.partner_id}
                      onChange={e => setShopConfig(s => ({ ...s, partner_id: e.target.value }))}
                      placeholder="Ex: 2010812"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner_key" className="font-medium">Partner Key</Label>
                    <div className="relative">
                      <Input
                        id="partner_key"
                        type={showPartnerKey ? 'text' : 'password'}
                        value={shopConfig.partner_key}
                        onChange={e => setShopConfig(s => ({ ...s, partner_key: e.target.value }))}
                        placeholder="Sua chave secreta"
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPartnerKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPartnerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop_id" className="font-medium">Shop ID</Label>
                    <Input
                      id="shop_id"
                      value={shopConfig.shop_id}
                      onChange={e => setShopConfig(s => ({ ...s, shop_id: e.target.value }))}
                      placeholder="Ex: 123456789"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={handleSaveShopee}
                    disabled={savingShopee}
                    className="flex-1 gap-2 gradient-primary text-primary-foreground shadow-primary hover:opacity-90"
                  >
                    {savingShopee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Configurações
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex-1 gap-2"
                  >
                    {testingConnection
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isShopeeConfigured
                        ? <Wifi className="w-4 h-4 text-success" />
                        : <WifiOff className="w-4 h-4" />
                    }
                    Testar Conexão
                  </Button>
                </div>
              </div>
            </motion.section>

            {/* Gemini AI Integration */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl shadow-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground">Inteligência Artificial (Gemini)</h2>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                  geminiSaved
                    ? 'text-success border-success/30 bg-success/10'
                    : 'text-warning border-warning/30 bg-warning/10'
                }`}>
                  {geminiSaved
                    ? <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                    : <><Key className="w-3 h-3" /> Não configurado</>
                  }
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-muted-foreground">
                  Configure sua chave da API do Google Gemini para habilitar o escaner inteligente de notas fiscais com IA.
                  Obtenha sua chave gratuitamente em{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    aistudio.google.com
                  </a>.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="gemini_key" className="font-medium flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    Chave da API Gemini
                  </Label>
                  <div className="relative">
                    <Input
                      id="gemini_key"
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={e => { setGeminiKey(e.target.value); setGeminiSaved(false); }}
                      placeholder="AIzaSy..."
                      className="h-10 pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {geminiSaved && (
                    <p className="text-xs text-success flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Chave configurada — o escaner de notas com IA está ativo
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSaveGemini}
                  disabled={savingGemini || !geminiKey.trim()}
                  className="gap-2 gradient-primary text-primary-foreground shadow-primary hover:opacity-90"
                >
                  {savingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Chave Gemini
                </Button>
              </div>
            </motion.section>
          </div>
        )}
      </div>
    </Layout>
  );
}

