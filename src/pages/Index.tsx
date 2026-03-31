import Navbar from '@/components/store/Navbar';
import HeroBanner from '@/components/store/HeroBanner';
import CategoriesSection from '@/components/store/CategoriesSection';
import FeaturedProducts from '@/components/store/FeaturedProducts';
import Footer from '@/components/store/Footer';
import CartDrawer from '@/components/store/CartDrawer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <HeroBanner />
        <CategoriesSection />
        <FeaturedProducts />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
