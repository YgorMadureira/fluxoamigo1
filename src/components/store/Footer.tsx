import { useState, useEffect } from 'react';
import { Instagram, Facebook, Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type FooterData = {
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

const DEFAULT: FooterData = {
  brand_name: 'ShoeStore',
  brand_description: 'Moda com elegância e sofisticação. Peças selecionadas para quem valoriza estilo e qualidade.',
  phone: '(11) 99999-0000',
  email: 'contato@shoestore.com',
  address: 'São Paulo, SP – Brasil',
  instagram_url: 'https://instagram.com',
  facebook_url: 'https://facebook.com',
  tiktok_url: '',
  whatsapp_url: '',
  copyright_text: '',
};

export default function Footer() {
  const [data, setData] = useState<FooterData>(DEFAULT);

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('company_id', 'default')
        .eq('setting_key', 'footer_data')
        .maybeSingle();
      if (row?.setting_value) {
        try {
          setData({ ...DEFAULT, ...JSON.parse(row.setting_value) });
        } catch {}
      }
    };
    load();
  }, []);

  const socials = [
    { url: data.instagram_url, icon: Instagram, label: 'Instagram' },
    { url: data.facebook_url, icon: Facebook, label: 'Facebook' },
    { url: data.whatsapp_url, icon: MessageCircle, label: 'WhatsApp' },
  ].filter((s) => s.url);

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div className="md:col-span-1">
            <h3 className="font-display text-2xl font-bold mb-4">{data.brand_name}</h3>
            <p className="text-sm font-body text-primary-foreground/60 leading-relaxed">
              {data.brand_description}
            </p>
          </div>

          <div>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/40 mb-4">
              Navegação
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Início', to: '/' },
                { label: 'Loja', to: '/shop' },
                { label: 'Categorias', to: '/shop' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm font-body text-primary-foreground/70 hover:text-gold transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/40 mb-4">
              Contato
            </h4>
            <ul className="space-y-3">
              {data.phone && (
                <li className="flex items-center gap-2 text-sm font-body text-primary-foreground/70">
                  <Phone size={14} className="text-gold shrink-0" />
                  {data.phone}
                </li>
              )}
              {data.email && (
                <li className="flex items-center gap-2 text-sm font-body text-primary-foreground/70">
                  <Mail size={14} className="text-gold shrink-0" />
                  {data.email}
                </li>
              )}
              {data.address && (
                <li className="flex items-start gap-2 text-sm font-body text-primary-foreground/70">
                  <MapPin size={14} className="text-gold shrink-0 mt-0.5" />
                  {data.address}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-primary-foreground/40 mb-4">
              Redes Sociais
            </h4>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-primary-foreground/20 flex items-center justify-center text-primary-foreground/60 hover:text-gold hover:border-gold transition-colors"
                  aria-label={s.label}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-primary-foreground/10 text-center">
          <p className="text-xs font-body text-primary-foreground/40">
            {data.copyright_text || `© ${new Date().getFullYear()} ${data.brand_name}. Todos os direitos reservados.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
