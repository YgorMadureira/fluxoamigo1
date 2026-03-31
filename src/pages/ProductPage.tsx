import { useParams } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import CartDrawer from '@/components/store/CartDrawer';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ProductPage() {
  const { id } = useParams();
  const { product, loading } = useProduct(id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <CartDrawer />
        <main className="flex-1 container py-12">
          <div className="grid md:grid-cols-2 gap-8 animate-pulse">
            <div className="aspect-[3/4] bg-muted" />
            <div className="space-y-4">
              <div className="h-4 bg-muted w-1/4 rounded" />
              <div className="h-8 bg-muted w-3/4 rounded" />
              <div className="h-6 bg-muted w-1/3 rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <CartDrawer />
        <main className="flex-1 container py-20 text-center">
          <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="font-display text-2xl text-foreground mb-2">Produto não encontrado</h2>
          <Link to="/shop" className="text-gold text-sm font-body hover:underline">
            Voltar à loja
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : product.image_url
    ? [product.image_url]
    : ['/placeholder.svg'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        <div className="container py-6">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={14} /> Voltar
          </Link>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="aspect-[3/4] bg-secondary overflow-hidden mb-3">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-20 bg-secondary overflow-hidden border-2 transition-colors ${
                        i === selectedImage ? 'border-gold' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {product.category && (
                <p className="text-xs font-body font-medium tracking-[0.2em] uppercase text-muted-foreground">
                  {product.category}
                </p>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {product.name}
              </h1>
              <p className="font-display text-2xl text-foreground">
                {formatPrice(product.unit_price)}
              </p>

              {product.description && (
                <p className="text-sm font-body text-charcoal leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="pt-4 space-y-4">
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-body font-medium tracking-[0.15em] uppercase text-muted-foreground">
                    Quantidade
                  </span>
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-body text-foreground">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="p-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-xs font-body text-muted-foreground">
                    {product.stock_quantity} disponíveis
                  </span>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => addItem(product, quantity)}
                >
                  Adicionar à Sacola
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
