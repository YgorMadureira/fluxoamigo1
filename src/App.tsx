import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Shop from "./pages/Shop.tsx";
import ProductPage from "./pages/ProductPage.tsx";
import CartPage from "./pages/CartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import CustomerLogin from "./pages/CustomerLogin.tsx";
import CustomerAccount from "./pages/CustomerAccount.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import AdminProducts from "./pages/AdminProducts.tsx";
import AdminBanners from "./pages/AdminBanners.tsx";
import AdminFooter from "./pages/AdminFooter.tsx";
import AdminShipping from "./pages/AdminShipping.tsx";
import AdminCustomers from "./pages/AdminCustomers.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/minha-conta" element={<CustomerAccount />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/footer" element={<AdminFooter />} />
              <Route path="/admin/shipping" element={<AdminShipping />} />
              <Route path="/admin/customers" element={<AdminCustomers />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
