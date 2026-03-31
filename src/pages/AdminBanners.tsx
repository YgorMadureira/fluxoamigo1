import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Save, Image as ImageIcon } from 'lucide-react';

const COMPANY_ID = 'default';

type BannerSlide = {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
};

const DEFAULT_SLIDES: BannerSlide[] = [
  { image: '', title: 'Nova Coleção', subtitle: 'Outono / Inverno 2026', cta: 'Explorar' },
  { image: '', title: 'Acessórios', subtitle: 'Elegância em cada detalhe', cta: 'Ver Coleção' },
  { image: '', title: 'Edição Limitada', subtitle: 'Peças exclusivas para você', cta: 'Comprar Agora' },
];

export default function AdminBanners() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<BannerSlide[]>(DEFAULT_SLIDES);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadBanners();
  }, [user, isAdmin]);

  const loadBanners = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('company_id', COMPANY_ID)
      .eq('setting_key', 'hero_banners')
      .maybeSingle();
    if (data?.setting_value) {
      try {
        const parsed = JSON.parse(data.setting_value);
        if (Array.isArray(parsed) && parsed.length > 0) setSlides(parsed);
      } catch {}
    }
  };

  const handleUploadImage = async (index: number, file: File) => {
    setUploading(index);
    try {
      const ext = file.name.split('.').pop();
      const path = `banner-${index}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('banners')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path);
      const updated = [...slides];
      updated[index] = { ...updated[index], image: urlData.publicUrl };
      setSlides(updated);
      toast.success('Imagem enviada!');
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    }
    setUploading(null);
  };

  const updateSlide = (index: number, field: keyof BannerSlide, value: string) => {
    const updated = [...slides];
    updated[index] = { ...updated[index], [field]: value };
    setSlides(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          {
            company_id: COMPANY_ID,
            setting_key: 'hero_banners',
            setting_value: JSON.stringify(slides),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,setting_key' }
        );
      if (error) throw error;
      toast.success('Banners salvos com sucesso!');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSaving(false);
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
            <h1 className="font-display text-lg font-bold">Banners do Topo</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Banners'}
          </Button>
        </div>
      </header>

      <div className="container py-8 max-w-2xl space-y-6">
        {slides.map((slide, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="font-display text-base">Banner {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image */}
              <div className="space-y-2">
                <Label>Imagem</Label>
                {slide.image ? (
                  <div className="relative aspect-[21/9] bg-muted rounded overflow-hidden">
                    <img src={slide.image} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => updateSlide(i, 'image', '')}
                      className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded cursor-pointer hover:border-muted-foreground transition-colors">
                    {uploading === i ? (
                      <p className="text-sm text-muted-foreground">Enviando...</p>
                    ) : (
                      <>
                        <ImageIcon size={24} className="text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Clique para enviar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(i, f);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={slide.title}
                    onChange={(e) => updateSlide(i, 'title', e.target.value)}
                    placeholder="Título"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide(i, 'subtitle', e.target.value)}
                    placeholder="Subtítulo"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Botão (CTA)</Label>
                  <Input
                    value={slide.cta}
                    onChange={(e) => updateSlide(i, 'cta', e.target.value)}
                    placeholder="Ex: Comprar Agora"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
