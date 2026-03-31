import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useProducts';
import { ProductGrid } from '@/components/store/ProductGrid';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import CartDrawer from '@/components/store/CartDrawer';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { products, loading } = useProducts({
    category: activeCategory,
    search: searchParams.get('search') || undefined,
  });
  const categories = useCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    const params = new URLSearchParams(searchParams);
    if (cat !== 'all') {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setActiveCategory('all');
    setSearchInput('');
    setSearchParams({});
  };

  const hasFilters = activeCategory !== 'all' || searchParams.get('search');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container py-8 md:py-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Loja
            </h1>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <div className="flex-1 flex items-center gap-2 border border-border bg-background px-3 py-2">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="p-2.5 border border-border bg-background text-muted-foreground hover:text-foreground transition-colors md:hidden"
              >
                <SlidersHorizontal size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex gap-8">
            {/* Sidebar filters - desktop */}
            <aside className="hidden md:block w-52 shrink-0 space-y-6">
              <div>
                <h3 className="font-body text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
                  Categorias
                </h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => handleCategory('all')}
                      className={`text-sm font-body w-full text-left py-1.5 transition-colors ${
                        activeCategory === 'all' ? 'text-gold font-medium' : 'text-foreground hover:text-gold'
                      }`}
                    >
                      Todas
                    </button>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => handleCategory(cat.name)}
                        className={`text-sm font-body w-full text-left py-1.5 transition-colors ${
                          activeCategory === cat.name ? 'text-gold font-medium' : 'text-foreground hover:text-gold'
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </aside>

            {/* Mobile filters */}
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="md:hidden mb-4 pb-4 border-b border-border"
              >
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategory('all')}
                    className={`text-xs font-body px-3 py-1.5 border transition-colors ${
                      activeCategory === 'all'
                        ? 'border-gold text-gold'
                        : 'border-border text-foreground'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategory(cat.name)}
                      className={`text-xs font-body px-3 py-1.5 border transition-colors ${
                        activeCategory === cat.name
                          ? 'border-gold text-gold'
                          : 'border-border text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Products */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-body text-muted-foreground">
                  {loading ? 'Carregando...' : `${products.length} produto(s)`}
                </p>
              </div>
              <ProductGrid products={products} loading={loading} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
