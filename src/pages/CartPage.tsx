import { Link } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import CartDrawer from '@/components/store/CartDrawer';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        <div className="container py-8 md:py-12">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={14} /> Continuar Comprando
          </Link>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Sacola ({totalItems})
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Sua sacola está vazia</h3>
              <p className="text-muted-foreground text-sm font-body mb-6">
                Adicione produtos para continuar
              </p>
              <Link to="/shop">
                <Button variant="hero">Explorar Produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Items list */}
              <div className="lg:col-span-2 space-y-0 divide-y divide-border">
                {items.map((item, i) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 md:gap-6 py-6 first:pt-0"
                  >
                    <Link to={`/product/${item.product.id}`} className="w-24 h-32 md:w-28 md:h-36 bg-secondary shrink-0 overflow-hidden">
                      <img
                        src={item.product.image_url || item.product.images?.[0] || '/placeholder.svg'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {item.product.category && (
                          <p className="text-[10px] font-body font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">
                            {item.product.category}
                          </p>
                        )}
                        <Link to={`/product/${item.product.id}`}>
                          <h3 className="font-display text-base md:text-lg font-medium text-foreground hover:text-gold transition-colors">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-sm font-body text-foreground mt-1">
                          {formatPrice(item.product.unit_price)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-2 text-muted-foreground hover:text-foreground"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-body text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, Math.min(item.quantity + 1, item.product.stock_quantity))}
                            className="p-2 text-muted-foreground hover:text-foreground"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <p className="font-display text-base font-semibold text-foreground">
                            {formatPrice(item.product.unit_price * item.quantity)}
                          </p>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border p-6 sticky top-24">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-6">Resumo</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">Subtotal ({totalItems} itens)</span>
                      <span className="text-foreground">{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">Frete</span>
                      <span className="text-muted-foreground">Calculado no checkout</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex justify-between">
                      <span className="font-display text-base font-semibold text-foreground">Total</span>
                      <span className="font-display text-xl font-bold text-foreground">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                  <Link to="/checkout">
                    <Button variant="hero" size="lg" className="w-full">
                      Ir para o Checkout
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
