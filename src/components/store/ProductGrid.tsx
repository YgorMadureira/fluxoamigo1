import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Product } from '@/lib/supabase';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem } = useCart();

  const imageUrl = product.image_url || product.images?.[0] || '/placeholder.svg';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary mb-4">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          {product.stock_quantity <= 3 && product.stock_quantity > 0 && (
            <span className="absolute top-3 left-3 text-[10px] font-body font-medium tracking-wider uppercase bg-card/90 backdrop-blur-sm text-foreground px-3 py-1">
              Últimas peças
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product);
            }}
            className="absolute bottom-3 right-3 p-3 bg-card/90 backdrop-blur-sm text-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gold hover:text-accent-foreground"
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
      </Link>
      <div className="space-y-1">
        {product.category && (
          <p className="text-[10px] font-body font-medium tracking-[0.15em] uppercase text-muted-foreground">
            {product.category}
          </p>
        )}
        <Link to={`/product/${product.id}`}>
          <h3 className="font-display text-sm md:text-base font-medium text-foreground leading-tight group-hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm font-body font-semibold text-foreground">
          {formatPrice(product.unit_price)}
        </p>
      </div>
    </motion.div>
  );
}

export function ProductGrid({ products, loading }: { products: Product[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-muted mb-4" />
            <div className="h-3 bg-muted rounded w-1/3 mb-2" />
            <div className="h-4 bg-muted rounded w-2/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-display text-xl text-foreground mb-2">Nenhum produto encontrado</h3>
        <p className="text-muted-foreground text-sm font-body">
          Tente ajustar seus filtros de busca
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  );
}
