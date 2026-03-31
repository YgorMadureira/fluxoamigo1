import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Menu, X, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <Link to="/" className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
          ShoeStore
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/" className="text-sm font-body font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors">
            Início
          </Link>
          <Link to="/shop" className="text-sm font-body font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors">
            Loja
          </Link>
          <Link to="/categories" className="text-sm font-body font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors">
            Categorias
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
          <Link
            to="/minha-conta"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            aria-label="Minha conta"
          >
            <User size={18} />
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Carrinho"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gold text-accent-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="container py-3">
              <SearchBar onClose={() => setSearchOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-border overflow-hidden bg-card"
          >
            <div className="container py-4 flex flex-col gap-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-body font-medium tracking-wide uppercase py-2 text-foreground">
                Início
              </Link>
              <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="text-sm font-body font-medium tracking-wide uppercase py-2 text-foreground">
                Loja
              </Link>
              <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="text-sm font-body font-medium tracking-wide uppercase py-2 text-foreground">
                Categorias
              </Link>
              <Link to="/minha-conta" onClick={() => setMobileMenuOpen(false)} className="text-sm font-body font-medium tracking-wide uppercase py-2 text-foreground">
                Minha Conta
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function SearchBar({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(query.trim())}`;
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <Search size={16} className="text-muted-foreground shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar produtos..."
        className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none"
        autoFocus
      />
      <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
        <X size={16} />
      </button>
    </form>
  );
}
