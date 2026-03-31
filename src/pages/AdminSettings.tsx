import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, LogOut, Eye, EyeOff, ArrowLeft, CreditCard, Truck, Package, Image as ImageIcon, FileSpreadsheet, Footprints, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const COMPANY_ID = 'default';

const SETTINGS_KEYS = {
  mp_public_key: 'Chave Pública (Public Key)',
  mp_access_token: 'Token de Acesso (Access Token)',
  carrier_api_key: 'Chave da API da Transportadora',
  carrier_api_url: 'URL da API da Transportadora',
};

type SettingsMap = Record<string, string>;

export default function AdminSettings() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadSettings();
    }
  }, [user, isAdmin]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    const { data } = await supabase
      .from('company_settings')
      .select('setting_key, setting_value')
      .eq('company_id', COMPANY_ID);

    const map: SettingsMap = {};
    Object.keys(SETTINGS_KEYS).forEach((k) => (map[k] = ''));
    data?.forEach((row: any) => {
      map[row.setting_key] = row.setting_value;
    });
    setSettings(map);
    setLoadingSettings(false);
  };

  const handleSave = async (keys: string[]) => {
    setSaving(true);
    try {
      for (const key of keys) {
        const value = settings[key] || '';
        const { error } = await supabase
          .from('company_settings')
          .upsert(
            { company_id: COMPANY_ID, setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
            { onConflict: 'company_id,setting_key' }
          );
        if (error) throw error;
      }
      toast.success('Configurações salvas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
    setSaving(false);
  };

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (authLoading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Carregando...</p>
      </div>
    );
  }

  const renderField = (key: string, label: string, isSecret = true) => (
    <div className="space-y-2" key={key}>
      <Label htmlFor={key}>{label}</Label>
      <div className="relative">
        <Input
          id={key}
          type={isSecret && !visibleFields[key] ? 'password' : 'text'}
          value={settings[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={`Insira ${label.toLowerCase()}`}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => toggleVisibility(key)}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            {visibleFields[key] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
            </Button>
            <h1 className="font-display text-lg font-bold">Configurações</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-body hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-2xl">
        {/* Quick links to admin sections */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <Link to="/admin/products" className="flex flex-col items-center gap-2 p-4 rounded border border-border bg-card hover:border-accent transition-colors">
            <Package size={24} className="text-muted-foreground" />
            <span className="text-xs font-body font-medium">Produtos</span>
          </Link>
          <Link to="/admin/banners" className="flex flex-col items-center gap-2 p-4 rounded border border-border bg-card hover:border-accent transition-colors">
            <ImageIcon size={24} className="text-muted-foreground" />
            <span className="text-xs font-body font-medium">Banners</span>
          </Link>
          <Link to="/admin/footer" className="flex flex-col items-center gap-2 p-4 rounded border border-border bg-card hover:border-accent transition-colors">
            <Footprints size={24} className="text-muted-foreground" />
            <span className="text-xs font-body font-medium">Rodapé</span>
          </Link>
          <Link to="/admin/shipping" className="flex flex-col items-center gap-2 p-4 rounded border border-border bg-card hover:border-accent transition-colors">
            <FileSpreadsheet size={24} className="text-muted-foreground" />
            <span className="text-xs font-body font-medium">Fretes</span>
          </Link>
          <Link to="/admin/customers" className="flex flex-col items-center gap-2 p-4 rounded border border-border bg-card hover:border-accent transition-colors">
            <Users size={24} className="text-muted-foreground" />
            <span className="text-xs font-body font-medium">Clientes</span>
          </Link>
        </div>

        <Tabs defaultValue="mercadopago">
          <TabsList className="w-full">
            <TabsTrigger value="mercadopago" className="flex-1 gap-2">
              <CreditCard size={14} />
              Mercado Pago
            </TabsTrigger>
            <TabsTrigger value="carrier" className="flex-1 gap-2">
              <Truck size={14} />
              Transportadora
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mercadopago">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Mercado Pago</CardTitle>
                <CardDescription className="font-body">
                  Configure as credenciais para processar pagamentos via Cartão e PIX.
                  Encontre suas chaves em{' '}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Mercado Pago Developers
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderField('mp_public_key', SETTINGS_KEYS.mp_public_key)}
                {renderField('mp_access_token', SETTINGS_KEYS.mp_access_token)}
                <Button
                  onClick={() => handleSave(['mp_public_key', 'mp_access_token'])}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Credenciais Mercado Pago'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="carrier">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Transportadora</CardTitle>
                <CardDescription className="font-body">
                  Configure a API da transportadora para rastreio automático dos pedidos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderField('carrier_api_key', SETTINGS_KEYS.carrier_api_key)}
                {renderField('carrier_api_url', SETTINGS_KEYS.carrier_api_url, false)}
                <Button
                  onClick={() => handleSave(['carrier_api_key', 'carrier_api_url'])}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Configuração Transportadora'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
