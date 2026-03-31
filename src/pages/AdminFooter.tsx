import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

const COMPANY_ID = 'default';

export type FooterData = {
  brand_name: string;
  brand_description: string;
  phone: string;
  email: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  whatsapp_url: string;
  copyright_text: string;
};

const DEFAULT_FOOTER: FooterData = {
  brand_name: 'ShoeStore',
  brand_description: 'Moda com elegância e sofisticação.',
  phone: '(11) 99999-0000',
  email: 'contato@shoestore.com',
  address: 'São Paulo, SP – Brasil',
  instagram_url: 'https://instagram.com',
  facebook_url: 'https://facebook.com',
  tiktok_url: '',
  whatsapp_url: '',
  copyright_text: '',
};

export default function AdminFooter() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [footerData, setFooterData] = useState<FooterData>(DEFAULT_FOOTER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadFooter();
  }, [user, isAdmin]);

  const loadFooter = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('company_id', COMPANY_ID)
      .eq('setting_key', 'footer_data')
      .maybeSingle();
    if (data?.setting_value) {
      try {
        setFooterData({ ...DEFAULT_FOOTER, ...JSON.parse(data.setting_value) });
      } catch {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          {
            company_id: COMPANY_ID,
            setting_key: 'footer_data',
            setting_value: JSON.stringify(footerData),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,setting_key' }
        );
      if (error) throw error;
      toast.success('Rodapé salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSaving(false);
  };

  const update = (field: keyof FooterData, value: string) => {
    setFooterData((prev) => ({ ...prev, [field]: value }));
  };

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
            <h1 className="font-display text-lg font-bold">Editar Rodapé</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      <div className="container py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome da Marca</Label>
              <Input value={footerData.brand_name} onChange={(e) => update('brand_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={footerData.brand_description} onChange={(e) => update('brand_description', e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto de Copyright (opcional)</Label>
              <Input value={footerData.copyright_text} onChange={(e) => update('copyright_text', e.target.value)} placeholder="Ex: © 2026 MinhaLoja" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={footerData.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={footerData.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Endereço</Label>
              <Input value={footerData.address} onChange={(e) => update('address', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Instagram (URL)</Label>
              <Input value={footerData.instagram_url} onChange={(e) => update('instagram_url', e.target.value)} placeholder="https://instagram.com/sualoja" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Facebook (URL)</Label>
              <Input value={footerData.facebook_url} onChange={(e) => update('facebook_url', e.target.value)} placeholder="https://facebook.com/sualoja" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">TikTok (URL)</Label>
              <Input value={footerData.tiktok_url} onChange={(e) => update('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@sualoja" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp (URL)</Label>
              <Input value={footerData.whatsapp_url} onChange={(e) => update('whatsapp_url', e.target.value)} placeholder="https://wa.me/5511999990000" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
