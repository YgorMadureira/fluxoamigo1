import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Loader2, BarChart3, Package, ShoppingCart, AlertTriangle } from 'lucide-react';
import logo from '@/assets/logo-osdevs.jpeg';
import LoginTransition from '@/components/LoginTransition';

export default function Login() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  // Authenticated + has profile → go to dashboard (but not during transition)
  if (!loading && user && profile && !showTransition) return <Navigate to="/" replace />;

  // Authenticated but no profile → show unauthorized
  const showUnauthorized = !loading && user && !profile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUnauthorized(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, company_id')
          .eq('id', data.user.id)
          .maybeSingle();

        const pd = profileData as { id: string; company_id: string | null } | null;
        if (!pd || !pd.company_id) {
          await supabase.auth.signOut();
          setUnauthorized(true);
        } else {
          toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
          setShowTransition(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOutUnauthorized = async () => {
    await supabase.auth.signOut();
    setUnauthorized(false);
  };

  return (
    <>
      <LoginTransition show={showTransition} onComplete={() => navigate('/', { replace: true })} />
      <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(234 80% 60%), transparent)' }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(145 65% 42%), transparent)' }} />
        </div>

        <div className="relative z-10">
          {/* Logo Os Devs — visível e profissional */}
          <div className="flex items-center gap-4 mb-16">
            <div className="relative">
              <img src={logo} alt="Os Devs" className="w-16 h-16 rounded-2xl object-cover shadow-xl ring-2 ring-sidebar-primary/30" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 gradient-primary rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
            <div>
              <span className="text-2xl font-display font-bold text-sidebar-primary-foreground block leading-tight">Fluxo Amigo</span>
              <span className="text-sidebar-foreground text-sm font-medium">by Os Devs</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                <span className="text-xs text-sidebar-foreground/70">Sistema Certificado</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-display font-bold text-sidebar-primary-foreground mb-4 leading-tight">
            Gestão Financeira<br />
            <span className="text-gradient-primary">Inteligente</span>
          </h1>
          <p className="text-sidebar-foreground text-lg leading-relaxed">
            Controle vendas, compras, estoque e fluxo de caixa com relatórios avançados e análise de dados em tempo real.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-4">
          {[
            { icon: ShoppingCart, label: 'Vendas & Compras', desc: 'Controle completo com CRUD' },
            { icon: Package, label: 'Gestão de Estoque', desc: 'Inventário automatizado' },
            { icon: BarChart3, label: 'Relatórios DRE & ABC', desc: 'Análise e projeções' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-sidebar-accent border border-sidebar-border">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-sidebar-primary" />
              </div>
              <div>
                <div className="text-sidebar-primary-foreground font-semibold text-sm">{label}</div>
                <div className="text-sidebar-foreground text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={logo} alt="Os Devs" className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-2 ring-primary/20" />
            <div>
              <span className="text-2xl font-display font-bold block leading-tight">Fluxo Amigo</span>
              <span className="text-muted-foreground text-sm font-medium">by Os Devs</span>
            </div>
          </div>

          {/* Unauthorized state */}
          {(showUnauthorized || unauthorized) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Aguardando liberação</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sua conta ainda não foi vinculada a uma empresa no sistema.<br />
                Entre em contato com o administrador para liberar seu acesso.
              </p>
              <Button
                variant="outline"
                onClick={handleSignOutUnauthorized}
                className="w-full"
              >
                Voltar ao Login
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground">Entrar na conta</h2>
                <p className="text-muted-foreground mt-2">Acesse seu painel de controle</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 h-11"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 gradient-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                  ) : 'Entrar'}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Acesso restrito a usuários cadastrados pelo administrador.
              </p>

              {/* Os Devs branding footer */}
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2">
                <img src={logo} alt="Os Devs" className="w-5 h-5 rounded-md object-cover" />
                <span className="text-xs text-muted-foreground font-medium">Desenvolvido por <span className="text-foreground font-semibold">Os Devs</span></span>
              </div>
            </>
          )}
        </motion.div>
      </div>
      </div>
    </>
  );
}
