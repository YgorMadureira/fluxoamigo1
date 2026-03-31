import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import hero1 from '@/assets/hero-1.jpg';
import hero2 from '@/assets/hero-2.jpg';
import hero3 from '@/assets/hero-3.jpg';

const defaultSlides = [
  { image: hero1, title: 'Nova Coleção', subtitle: 'Outono / Inverno 2026', cta: 'Explorar' },
  { image: hero2, title: 'Acessórios', subtitle: 'Elegância em cada detalhe', cta: 'Ver Coleção' },
  { image: hero3, title: 'Edição Limitada', subtitle: 'Peças exclusivas para você', cta: 'Comprar Agora' },
];

type Slide = { image: string; title: string; subtitle: string; cta: string };

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<Slide[]>(defaultSlides);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('company_id', 'default')
        .eq('setting_key', 'hero_banners')
        .maybeSingle();
      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value) as Slide[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Use default images as fallback for slides without uploaded images
            const merged = parsed.map((s, i) => ({
              ...s,
              image: s.image || defaultSlides[i]?.image || defaultSlides[0].image,
            }));
            setSlides(merged);
          }
        } catch {}
      }
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-primary">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img src={slides[current].image} alt={slides[current].title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
        <div className="container">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <p className="text-sm md:text-base font-body tracking-[0.2em] uppercase text-primary-foreground/70 mb-2">
                {slides[current].subtitle}
              </p>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
                {slides[current].title}
              </h1>
              <Link to="/shop">
                <Button variant="hero" size="lg">{slides[current].cta}</Button>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
        aria-label="Anterior"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
        aria-label="Próximo"
      >
        <ChevronRight size={28} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-gold w-6' : 'bg-primary-foreground/40'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
