import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, BarChart3,
  LogOut, Menu, X, ChevronRight, Settings, Shield, Tag, BoxesIcon, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-osdevs.jpeg';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/sales', icon: ShoppingCart, label: 'Vendas' },
  { to: '/purchases', icon: ShoppingBag, label: 'Compras' },
  { to: '/products', icon: BoxesIcon, label: 'Produtos' },
  { to: '/inventory', icon: Package, label: 'Estoque' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/suppliers', icon: Truck, label: 'Fornecedores' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
];

const adminItems = [
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { user, signOut, profile, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavItem = ({ to, icon: Icon, label, exact }: { to: string; icon: React.ElementType; label: string; exact?: boolean }) => {
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
    return (
      <NavLink
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <img src={logo} alt="Fluxo Amigo" className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-md" />
        <div>
          <div className="text-sidebar-primary-foreground font-display font-bold text-sm leading-none">Fluxo Amigo</div>
          <div className="text-sidebar-foreground text-xs mt-0.5">Gestão Financeira</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">Menu Principal</div>
        {navItems.map(({ to, icon, label, exact }) => (
          <NavItem key={to} to={to} icon={icon} label={label} exact={exact} />
        ))}

        {isAdmin && (
          <>
            <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2 mt-4 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Administração
            </div>
            {adminItems.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        {profile?.company_name && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20">
            <p className="text-sidebar-foreground text-xs font-medium uppercase tracking-wide mb-0.5">Empresa</p>
            <p className="text-sidebar-primary-foreground text-sm font-bold truncate">{profile.company_name}</p>
            {isAdmin && (
              <p className="text-sidebar-foreground text-xs mt-0.5 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Admin
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sidebar-primary-foreground text-xs font-semibold truncate">{user?.email}</div>
            <div className="text-sidebar-foreground text-xs">{profile?.role ?? 'Usuário'}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground hover:text-danger hover:bg-danger-light/10 gap-2 h-8"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 h-screen bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Fluxo Amigo" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-sidebar-primary-foreground font-display font-bold text-sm">Fluxo Amigo</span>
          {profile?.company_name && (
            <span className="text-sidebar-foreground text-xs ml-1 opacity-70">— {profile.company_name}</span>
          )}
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-sidebar z-50"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
