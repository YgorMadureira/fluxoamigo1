import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Package, Clock, LogOut, Save, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

type Customer = {
  id: string;
  cpf: string;
  full_name: string;
  email: string;
  phone: string | null;
  cep: string | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
};

type Tab = 'profile' | 'orders' | 'history';

function formatCpfDisplay(cpf: string) {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800' },
  shipped: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export default function CustomerAccount() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchCustomer();
  }, [user]);

  useEffect(() => {
    if (!user || tab === 'profile') return;
    fetchOrders();
  }, [user, tab]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (data) {
        setCustomer(data as Customer);
        setFullName(data.full_name);
        setPhone(data.phone || '');
        setCep(data.cep || '');
        setAddress(data.address || '');
        setAddressNumber(data.address_number || '');
        setComplement(data.complement || '');
        setCity(data.city || '');
        setState(data.state || '');
      } else if (!error) {
        // No customer record, redirect to register
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setOrdersLoading(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase.from('customers').update({
      full_name: fullName,
      phone: phone || null,
      cep: cep || null,
      address: address || null,
      address_number: addressNumber || null,
      complement: complement || null,
      city: city || null,
      state: state || null,
    }).eq('id', user!.id);

    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Dados atualizados!');
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!customer) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Meus Dados', icon: <User size={16} /> },
    { key: 'orders', label: 'Meus Pedidos', icon: <Package size={16} /> },
    { key: 'history', label: 'Histórico', icon: <Clock size={16} /> },
  ];

  const activeOrders = orders.filter((o) => ['pending', 'paid', 'shipped'].includes(o.status));
  const completedOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-8 md:py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Olá, {customer.full_name.split(' ')[0]}
              </h1>
              <p className="text-sm font-body text-muted-foreground mt-1">Gerencie sua conta e pedidos</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
              <LogOut size={14} /> Sair
            </Button>
          </div>

          <div className="flex gap-8 flex-col md:flex-row">
            {/* Tabs sidebar */}
            <nav className="flex md:flex-col gap-1 md:w-48 shrink-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-body transition-colors text-left ${
                    tab === t.key
                      ? 'bg-card border border-border text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {tab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card border border-border p-6 space-y-6"
                >
                  <h2 className="font-display text-lg font-semibold text-foreground">Informações Pessoais</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Nome Completo</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground flex items-center gap-1">
                        CPF <Lock size={10} className="text-muted-foreground/50" />
                      </Label>
                      <Input value={formatCpfDisplay(customer.cpf)} disabled className="mt-1.5 bg-secondary cursor-not-allowed" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground flex items-center gap-1">
                        E-mail <Lock size={10} className="text-muted-foreground/50" />
                      </Label>
                      <Input value={customer.email} disabled className="mt-1.5 bg-secondary cursor-not-allowed" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Telefone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
                    </div>
                  </div>

                  <h2 className="font-display text-lg font-semibold text-foreground pt-4">Endereço</h2>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">CEP</Label>
                      <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="mt-1.5" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Endereço</Label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Número</Label>
                      <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Complemento</Label>
                      <Input value={complement} onChange={(e) => setComplement(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Cidade</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Estado</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="UF" className="mt-1.5" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleSave} variant="hero" disabled={saving} className="gap-2">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Alterações
                    </Button>
                  </div>
                </motion.div>
              )}

              {tab === 'orders' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Pedidos em Andamento</h2>
                  {ordersLoading ? (
                    <div className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></div>
                  ) : activeOrders.length === 0 ? (
                    <div className="bg-card border border-border p-8 text-center">
                      <Package size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-body text-muted-foreground">Nenhum pedido em andamento</p>
                      <Link to="/shop"><Button variant="hero" size="sm" className="mt-4">Ir às Compras</Button></Link>
                    </div>
                  ) : (
                    activeOrders.map((order) => <OrderCard key={order.id} order={order} />)
                  )}
                </motion.div>
              )}

              {tab === 'history' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Histórico de Pedidos</h2>
                  {ordersLoading ? (
                    <div className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></div>
                  ) : completedOrders.length === 0 ? (
                    <div className="bg-card border border-border p-8 text-center">
                      <Clock size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-body text-muted-foreground">Nenhum pedido finalizado ainda</p>
                    </div>
                  ) : (
                    completedOrders.map((order) => <OrderCard key={order.id} order={order} />)
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const status = statusMap[order.status] || { label: order.status, color: 'bg-secondary text-foreground' };
  const items = (order.items as any[]) || [];
  const date = new Date(order.created_at).toLocaleDateString('pt-BR');

  return (
    <div className="bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-body text-muted-foreground">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs font-body text-muted-foreground">{date}</p>
        </div>
        <span className={`text-xs font-body font-medium px-2 py-0.5 rounded ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="space-y-2 mb-3">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm font-body">
            <span className="text-foreground">{item.name} × {item.quantity}</span>
            <span className="text-muted-foreground">{formatPrice(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 flex justify-between items-center">
        <div className="text-sm font-body">
          <span className="text-muted-foreground">Frete: {formatPrice(order.shipping_cost)}</span>
        </div>
        <span className="font-display font-semibold text-foreground">{formatPrice(order.total)}</span>
      </div>
      {order.tracking_code && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-body text-muted-foreground">
            Código de rastreio: <span className="font-medium text-foreground">{order.tracking_code}</span>
          </p>
        </div>
      )}
    </div>
  );
}
