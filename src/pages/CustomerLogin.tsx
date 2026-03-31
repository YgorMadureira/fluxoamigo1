import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    return digits;
  }

  function validateCpf(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (parseInt(digits[9]) !== check) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    return parseInt(digits[10]) === check;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha todos os campos'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('E-mail ou senha inválidos');
    } else {
      toast.success('Login realizado!');
      navigate('/minha-conta');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regCpf || !regPassword || !regConfirmPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!validateCpf(regCpf)) { toast.error('CPF inválido'); return; }
    if (regPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    if (regPassword !== regConfirmPassword) { toast.error('As senhas não coincidem'); return; }

    setLoading(true);

    const cleanCpf = regCpf.replace(/\D/g, '');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { 
          full_name: regName,
          cpf: cleanCpf,
          phone: regPhone || null
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        toast.error('Este e-mail já está em uso.');
      } else {
        toast.error(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      toast.success('Cadastro realizado! Redirecionando para o checkout...');
      navigate('/checkout');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12 md:py-20 flex items-start justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
            {isLogin ? 'Entrar na sua conta' : 'Criar sua conta'}
          </h1>
          <p className="text-sm font-body text-muted-foreground text-center mb-8">
            {isLogin ? 'Acesse seus pedidos e dados' : 'Cadastre-se para comprar'}
          </p>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Nome Completo *</Label>
                <Input value={regName} onChange={(e) => setRegName(e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">CPF *</Label>
                <Input value={regCpf} onChange={(e) => setRegCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} required className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">E-mail *</Label>
                  <Input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" required className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Telefone</Label>
                  <Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Senha *</Label>
                  <Input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type="password" required minLength={6} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-body font-medium tracking-wide uppercase text-muted-foreground">Confirmar Senha *</Label>
                  <Input value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} type="password" required className="mt-1.5" />
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Criar Conta'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
