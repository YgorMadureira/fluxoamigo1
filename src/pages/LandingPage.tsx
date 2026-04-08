import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Package, BarChart3, TrendingUp, Shield, Zap, Users, FileText,
  ArrowRight, Check, Star, ChevronDown, Layers, ScanLine, RefreshCw, MessageCircle
} from 'lucide-react';
import logo from '@/assets/logo-osdevs.jpeg';
import mockupDashboard from '@/assets/mockup-dashboard.jpg';
import mockupInventory from '@/assets/mockup-inventory.jpg';
import mockupReports from '@/assets/mockup-reports.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } })
};

const features = [
  { icon: ShoppingCart, title: 'Vendas Inteligentes', desc: 'Registre vendas unitárias ou em lote com controle FIFO automático. Saiba exatamente seu lucro em cada venda.' },
  { icon: Package, title: 'Estoque Blindado', desc: 'Controle rigoroso: entradas por compra, saídas por venda ou ajuste com motivo obrigatório. Sem manipulação manual.' },
  { icon: BarChart3, title: 'DRE & Curva ABC', desc: 'Relatórios profissionais de Demonstrativo de Resultados e Curva ABC para decisões estratégicas baseadas em dados.' },
  { icon: ScanLine, title: 'OCR de Notas Fiscais', desc: 'Escaneie notas fiscais de compra e importe automaticamente todos os itens. Tecnologia IA integrada.' },
  { icon: Users, title: 'Gestão de Fornecedores', desc: 'Cadastro completo de fornecedores com telefone, e-mail e histórico de compras centralizado.' },
  { icon: Layers, title: 'Categorias & SKU', desc: 'Organize produtos por categorias, SKU único e unidade de medida. Localização instantânea.' },
  { icon: TrendingUp, title: 'Dashboard em Tempo Real', desc: 'Visualize faturamento, lucro, ticket médio e tendências com gráficos interativos atualizados ao vivo.' },
  { icon: RefreshCw, title: 'Histórico de Movimentações', desc: 'Rastreie toda entrada e saída do estoque com data, quantidade, tipo e responsável.' },
  { icon: Shield, title: 'Segurança Empresarial', desc: 'Acesso por empresa com autenticação segura. Seus dados isolados e protegidos na nuvem.' },
];

const plans = [
  {
    name: 'Starter',
    price: '97',
    setup: '297',
    desc: 'Para quem está começando e quer organizar o negócio',
    features: ['Até 500 produtos', 'Dashboard completo', 'Vendas e Compras', 'Controle de estoque', 'Relatórios básicos', '1 usuário'],
    popular: false
  },
  {
    name: 'Professional',
    price: '197',
    setup: '497',
    desc: 'Para negócios em crescimento que precisam de mais poder',
    features: ['Produtos ilimitados', 'Dashboard completo', 'Vendas e Compras', 'Estoque FIFO avançado', 'DRE & Curva ABC', 'OCR de Notas Fiscais', 'Até 5 usuários', 'Suporte prioritário'],
    popular: true
  },
  {
    name: 'Enterprise',
    price: '397',
    setup: '997',
    desc: 'Para empresas que exigem o máximo em gestão',
    features: ['Tudo do Professional', 'Usuários ilimitados', 'API de integração', 'Relatórios customizados', 'Onboarding dedicado', 'SLA garantido', 'Backup dedicado', 'Consultoria mensal'],
    popular: false
  }
];

const testimonials = [
  { name: 'Carlos Silva', role: 'Dono de Loja de Roupas', text: 'Em 2 meses usando o Fluxo Amigo, reduzi perdas de estoque em 40% e aumentei meu lucro real em 25%.', stars: 5 },
  { name: 'Ana Oliveira', role: 'Gestora de E-commerce', text: 'O OCR de notas fiscais me economiza 3 horas por semana. É como ter um assistente que nunca erra.', stars: 5 },
  { name: 'Roberto Santos', role: 'Empresário do Varejo', text: 'Finalmente consigo ver meu DRE em tempo real. Decisões que antes levavam dias agora levo minutos.', stars: 5 },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(228,30%,5%)] text-[hsl(220,15%,92%)] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[hsl(228,30%,5%)/0.8] border-b border-[hsl(228,20%,15%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Os Devs" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Fluxo Amigo</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[hsl(220,10%,60%)]">
            <a href="#features" className="hover:text-[hsl(220,15%,92%)] transition-colors">Funcionalidades</a>
            <a href="#screenshots" className="hover:text-[hsl(220,15%,92%)] transition-colors">Telas</a>
            <a href="#pricing" className="hover:text-[hsl(220,15%,92%)] transition-colors">Planos</a>
            <a href="#testimonials" className="hover:text-[hsl(220,15%,92%)] transition-colors">Depoimentos</a>
          </div>
          <Button onClick={() => navigate('/login')} className="gradient-primary text-[hsl(0,0%,100%)] font-semibold px-6 h-9 text-sm shadow-primary hover:opacity-90 transition-opacity">
            Acessar Sistema
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(circle, hsl(234 80% 50%), transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
            style={{ background: 'radial-gradient(circle, hsl(260 75% 58%), transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, hsl(145 70% 40%), transparent)' }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border border-[hsl(234,80%,50%)/0.3] bg-[hsl(234,80%,50%)/0.1] text-[hsl(234,80%,70%)] mb-6">
              <Zap className="w-3 h-3" /> Sistema de Gestão Empresarial Completo
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] mb-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Transforme seu negócio com{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              gestão inteligente
            </span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-lg sm:text-xl text-[hsl(220,10%,55%)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Controle vendas, compras, estoque FIFO e finanças com relatórios DRE e Curva ABC.
            Tudo em um único sistema pensado para o empreendedor brasileiro.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={() => navigate('/login')}
              className="gradient-primary text-[hsl(0,0%,100%)] font-bold px-8 h-13 text-lg shadow-primary hover:opacity-90 transition-all hover:scale-105"
            >
              Começar Agora <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <a
              href="https://wa.me/5511964297572?text=Olá! Gostaria de saber mais sobre o Fluxo Amigo, gestão de caixa."
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="border-[hsl(145,70%,40%)/0.5] bg-[hsl(145,70%,40%)/0.1] text-[hsl(145,70%,60%)] hover:bg-[hsl(145,70%,40%)/0.2] hover:text-[hsl(145,70%,70%)] px-8 h-13 text-lg w-full"
              >
                <MessageCircle className="w-5 h-5 mr-2" /> Falar no WhatsApp
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<1s', label: 'Tempo de resposta' },
              { value: '256-bit', label: 'Criptografia' },
              { value: '24/7', label: 'Monitoramento' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>{s.value}</div>
                <div className="text-xs text-[hsl(220,10%,50%)] mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative max-w-5xl mx-auto mt-16"
        >
          <div className="rounded-2xl overflow-hidden border border-[hsl(228,20%,18%)] shadow-2xl" style={{ boxShadow: '0 40px 80px hsl(234 80% 50% / 0.15), 0 16px 32px hsl(0 0% 0% / 0.4)' }}>
            <div className="h-8 bg-[hsl(228,30%,10%)] flex items-center px-4 gap-2 border-b border-[hsl(228,20%,15%)]">
              <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,55%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(38,90%,50%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(145,70%,40%)]" />
            </div>
            <img src={mockupDashboard} alt="Dashboard Fluxo Amigo" className="w-full aspect-video object-cover object-top" width={1920} height={1080} />
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl"
            style={{ background: 'linear-gradient(135deg, hsl(234 80% 50% / 0.3), hsl(260 75% 58% / 0.2))' }} />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(234,80%,65%)]">Funcionalidades</span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Tudo que seu negócio precisa
            </h2>
            <p className="text-[hsl(220,10%,50%)] mt-4 max-w-xl mx-auto">
              Cada recurso foi pensado para resolver problemas reais do dia a dia empresarial brasileiro.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.5}
                className="group p-6 rounded-2xl border border-[hsl(228,20%,15%)] bg-[hsl(228,28%,8%)] hover:border-[hsl(234,80%,50%)/0.4] hover:bg-[hsl(228,28%,10%)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[hsl(234,80%,50%)/0.1] group-hover:bg-[hsl(234,80%,50%)/0.2] transition-colors">
                  <f.icon className="w-6 h-6 text-[hsl(234,80%,65%)]" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</h3>
                <p className="text-sm text-[hsl(220,10%,50%)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section id="screenshots" className="py-20 sm:py-32 px-4 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
            style={{ background: 'hsl(234 80% 50%)' }} />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(234,80%,65%)]">Telas do Sistema</span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Interface moderna e intuitiva
            </h2>
          </motion.div>

          <div className="space-y-24">
            {[
              { img: mockupDashboard, title: 'Dashboard Completo', desc: 'Visualize faturamento, lucro bruto, ticket médio, quantidade de vendas e tendências com gráficos interativos. Tudo em tempo real para decisões rápidas e assertivas.' },
              { img: mockupInventory, title: 'Controle de Estoque FIFO', desc: 'Gestão de estoque blindada com controle FIFO automático. Entradas por compra, saídas por venda ou ajuste com motivo obrigatório. Impossível manipular manualmente.' },
              { img: mockupReports, title: 'Relatórios DRE & Curva ABC', desc: 'Demonstrativo de Resultados do Exercício completo e Curva ABC para identificar seus produtos mais rentáveis. Dados que transformam seu negócio.' },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={0}
                className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center`}
              >
                <div className="flex-1">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</h3>
                  <p className="text-[hsl(220,10%,50%)] leading-relaxed text-lg">{s.desc}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-2xl overflow-hidden border border-[hsl(228,20%,18%)] shadow-xl" style={{ boxShadow: '0 20px 60px hsl(0 0% 0% / 0.4)' }}>
                    <div className="h-7 bg-[hsl(228,30%,10%)] flex items-center px-3 gap-1.5 border-b border-[hsl(228,20%,15%)]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[hsl(0,72%,55%)]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[hsl(38,90%,50%)]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[hsl(145,70%,40%)]" />
                    </div>
                    <img src={s.img} alt={s.title} loading="lazy" className="w-full aspect-video object-cover object-top" width={1920} height={1080} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(234,80%,65%)]">Planos & Preços</span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Invista no futuro do seu negócio
            </h2>
            <p className="text-[hsl(220,10%,50%)] mt-4 max-w-xl mx-auto">
              Escolha o plano ideal. Sem surpresas, sem taxas escondidas. Cancele quando quiser.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.5}
                className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                  plan.popular
                    ? 'border-[hsl(234,80%,50%)] bg-[hsl(228,28%,10%)] scale-105 shadow-2xl'
                    : 'border-[hsl(228,20%,15%)] bg-[hsl(228,28%,8%)] hover:border-[hsl(228,20%,25%)]'
                }`}
                style={plan.popular ? { boxShadow: '0 20px 60px hsl(234 80% 50% / 0.2)' } : undefined}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold gradient-primary text-[hsl(0,0%,100%)]">
                    MAIS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{plan.name}</h3>
                <p className="text-sm text-[hsl(220,10%,50%)] mb-6">{plan.desc}</p>

                <div className="mb-2">
                  <span className="text-xs text-[hsl(220,10%,50%)]">Implantação única</span>
                  <div className="text-2xl font-bold">
                    R$ {plan.setup}
                  </div>
                </div>
                <div className="mb-6 pb-6 border-b border-[hsl(228,20%,15%)]">
                  <span className="text-xs text-[hsl(220,10%,50%)]">Mensalidade</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                      R$ {plan.price}
                    </span>
                    <span className="text-sm text-[hsl(220,10%,50%)]">/mês</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-[hsl(145,70%,40%)] shrink-0 mt-0.5" />
                      <span className="text-[hsl(220,10%,70%)]">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate('/login')}
                  className={`w-full font-semibold h-11 ${
                    plan.popular
                      ? 'gradient-primary text-[hsl(0,0%,100%)] shadow-primary hover:opacity-90'
                      : 'bg-[hsl(228,25%,16%)] text-[hsl(220,15%,80%)] hover:bg-[hsl(228,25%,22%)]'
                  } transition-all`}
                >
                  Contratar {plan.name}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 sm:py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(234,80%,65%)]">Depoimentos</span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Quem usa, recomenda
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.5}
                className="p-6 rounded-2xl border border-[hsl(228,20%,15%)] bg-[hsl(228,28%,8%)]"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[hsl(38,90%,50%)] text-[hsl(38,90%,50%)]" />
                  ))}
                </div>
                <p className="text-sm text-[hsl(220,10%,65%)] leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-[hsl(220,10%,45%)]">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-4">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={0}
          className="max-w-4xl mx-auto text-center p-12 sm:p-16 rounded-3xl border border-[hsl(234,80%,50%)/0.3] relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(228 28% 10%), hsl(234 30% 14%))' }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(234 80% 50%), transparent 60%)' }} />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Pronto para revolucionar sua gestão?
            </h2>
            <p className="text-[hsl(220,10%,55%)] text-lg mb-8 max-w-xl mx-auto">
              Junte-se a centenas de empresários que já transformaram seus negócios com o Fluxo Amigo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/login')}
                className="gradient-primary text-[hsl(0,0%,100%)] font-bold px-10 h-14 text-lg shadow-primary hover:opacity-90 transition-all hover:scale-105"
              >
                Começar Agora — É Rápido <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <a
                href="https://wa.me/5511964297572?text=Olá! Gostaria de saber mais sobre o Fluxo Amigo, gestão de caixa."
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="border-[hsl(145,70%,40%)/0.5] bg-[hsl(145,70%,40%)/0.1] text-[hsl(145,70%,60%)] hover:bg-[hsl(145,70%,40%)/0.2] hover:text-[hsl(145,70%,70%)] px-10 h-14 text-lg w-full"
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Falar no WhatsApp
                </Button>
              </a>
            </div>
            <p className="text-xs text-[hsl(220,10%,40%)] mt-4">Sem cartão de crédito para começar • Suporte humano incluso</p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[hsl(228,20%,12%)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Os Devs" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Fluxo Amigo</span>
            <span className="text-xs text-[hsl(220,10%,40%)]">by Os Devs</span>
          </div>
          <p className="text-xs text-[hsl(220,10%,35%)]">
            © {new Date().getFullYear()} Fluxo Amigo. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5511964297572?text=Olá! Gostaria de saber mais sobre o Fluxo Amigo, gestão de caixa."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ background: 'hsl(145, 70%, 40%)' }}
        aria-label="Fale conosco pelo WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-[hsl(0,0%,100%)]" fill="hsl(0,0%,100%)" />
      </a>
    </div>
  );
}
