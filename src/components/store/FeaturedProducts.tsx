import { motion } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { ProductGrid } from './ProductGrid';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function FeaturedProducts() {
  const { products, loading } = useProducts();

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Novidades
            </h2>
            <p className="text-muted-foreground font-body text-sm tracking-wide">
              Peças recém chegadas à nossa loja
            </p>
          </div>
          <Link to="/shop" className="hidden md:block">
            <Button variant="ghost" className="text-sm font-body tracking-wide text-muted-foreground hover:text-foreground gap-2">
              Ver todos <ArrowRight size={14} />
            </Button>
          </Link>
        </motion.div>

        <ProductGrid products={products.slice(0, 4)} loading={loading} />

        <div className="mt-10 text-center md:hidden">
          <Link to="/shop">
            <Button variant="heroOutline" size="lg">
              Ver todos os produtos
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
