import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Footprints, Watch, Shirt, Gem, ShoppingBag, Glasses } from 'lucide-react';

const defaultCategories = [
  { name: 'Calçados', icon: Footprints },
  { name: 'Relógios', icon: Watch },
  { name: 'Roupas', icon: Shirt },
  { name: 'Joias', icon: Gem },
  { name: 'Bolsas', icon: ShoppingBag },
  { name: 'Óculos', icon: Glasses },
];

export default function CategoriesSection() {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Categorias
          </h2>
          <p className="text-muted-foreground font-body text-sm tracking-wide">
            Explore nossa seleção curada
          </p>
        </motion.div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {defaultCategories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                  <cat.icon
                    size={24}
                    strokeWidth={1.5}
                    className="text-muted-foreground group-hover:text-gold transition-colors"
                  />
                </div>
                <span className="text-xs md:text-sm font-body font-medium tracking-wide text-foreground group-hover:text-gold transition-colors">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
