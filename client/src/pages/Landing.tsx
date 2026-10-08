import { APP_NAME } from '@/lib/config';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import Header from '@/components/layout/Header';
import FloatingParticles from '@/components/ui/FloatingParticles';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { ArrowRight, Brain, Cpu, Workflow, Sparkles, Globe, Code, Users, BookOpen, Zap, RefreshCw, ChevronDown } from 'lucide-react';

export default function Landing() {
  const modulosRef = useRef<HTMLDivElement>(null);
  const sobreRef = useRef<HTMLDivElement>(null);
  const contatoRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0.3, 0.8], [0, 0.6]);

  const scrollTo = (id: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = { modulos: modulosRef, sobre: sobreRef, contato: contatoRef };
    refs[id]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,6%)]">
      <Header showNav onScrollTo={scrollTo} />

      {/* ═══ HERO — EMPIRE STYLE ═══ */}
      <section ref={heroRef} className="relative h-[100vh] min-h-[700px] flex flex-col items-center justify-center overflow-hidden">
        {/* Particles background — more intense */}
        <div className="absolute inset-0 z-0">
          <FloatingParticles count={35} color="220, 38, 38" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(0 70% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 70% 50%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Ambient glows — static (no animation = no GPU drain) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[10%] w-[400px] h-[400px] bg-red-600/[0.06] rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-[10%] w-[500px] h-[500px] bg-red-800/[0.04] rounded-full blur-[80px]" />
          <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-red-900/10 to-transparent" />
        </div>

        {/* Gradient overlay on scroll */}
        <motion.div
          className="absolute inset-0 bg-[hsl(220,13%,6%)] pointer-events-none z-[5]"
          style={{ opacity: overlayOpacity }}
        />

        {/* Oversized typography */}
        <motion.div
          className="relative z-[1] text-center px-4"
          style={{ y: heroTextY, opacity: heroOpacity }}
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-red-500 text-sm md:text-base font-semibold tracking-[0.3em] uppercase mb-6"
          >
            {APP_NAME}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-[clamp(2.5rem,8vw,7rem)] font-black leading-[0.9] tracking-tight text-white"
          >
            APRENDA
            <br />
            <span className="gradient-text">NO SEU</span>
            <br />
            RITMO
          </motion.h1>

        </motion.div>

        {/* CTA buttons — separate layer ABOVE robot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="relative z-[10] flex flex-wrap justify-center gap-4 mt-6"
          style={{ opacity: heroOpacity }}
        >
          <Link
            to="/auth"
            className="group relative overflow-hidden bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-full text-base transition-all duration-300 flex items-center gap-3"
            style={{ boxShadow: '0 0 30px rgba(220, 38, 38, 0.4)' }}
          >
            <span className="relative z-10">ACESSAR PLATAFORMA</span>
            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
            />
          </Link>
          <button
            onClick={() => scrollTo('modulos')}
            className="border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-full text-base transition-all duration-300 hover:bg-white/5"
          >
            VER MODULOS
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 z-[6]"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ opacity: heroOpacity }}
        >
          <ChevronDown size={24} className="text-white/30" />
        </motion.div>
      </section>

      {/* ═══ EDITORIAL SECTION — Scroll Reveal ═══ */}
      <section className="relative py-32 overflow-hidden">
        {/* Large background text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-[clamp(6rem,20vw,16rem)] font-black text-white/[0.02] tracking-tighter whitespace-nowrap">
            {APP_NAME}
          </span>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left — editorial text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-red-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
                Sobre a Plataforma
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 text-white">
                Conteúdo{' '}
                <span className="gradient-text">organizado</span>{' '}
                para você evoluir
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Cursos em vídeo, materiais de apoio e acompanhamento de progresso em um só lugar.
                Edite este texto em client/src/pages/Landing.tsx.
              </p>
              <button
                onClick={() => scrollTo('modulos')}
                className="group flex items-center gap-3 text-white font-semibold text-lg hover:text-red-400 transition-colors"
              >
                VER MODULOS
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>

            {/* Right — floating stats cards */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="space-y-4">
                {[
                  { value: '100+', label: 'Membros ativos', icon: Users },
                  { value: '24/7', label: 'Acesso ao conteúdo', icon: Zap },
                  { value: '10+', label: 'Módulos práticos', icon: BookOpen },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    whileHover={{ x: 8, boxShadow: '0 0 30px rgba(220, 38, 38, 0.15)' }}
                    className="flex items-center gap-5 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm cursor-default transition-all duration-300"
                  >
                    <div className="w-14 h-14 rounded-xl bg-red-600/10 flex items-center justify-center flex-shrink-0">
                      <item.icon size={24} className="text-red-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">{item.value}</div>
                      <div className="text-sm text-gray-500">{item.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIAS — Full Width Cards ═══ */}
      <section ref={modulosRef} className="py-28 relative" style={{ background: 'hsl(220 13% 5%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-red-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Categorias
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
              O QUE VOCÊ VAI{' '}
              <span className="gradient-text">APRENDER</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                whileHover={{ y: -8, borderColor: 'rgba(220, 38, 38, 0.3)' }}
                className="group relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-500 cursor-default overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-red-600/5 to-transparent" />

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative w-16 h-16 rounded-2xl bg-red-600/10 flex items-center justify-center mb-5"
                >
                  <cat.icon size={28} className="text-red-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{cat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR — Horizontal ═══ */}
      <section ref={sobreRef} className="py-24 border-y border-white/[0.08] relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/[0.03] via-transparent to-red-600/[0.03]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight">
                  <AnimatedCounter end={stat.count} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-[0.15em] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES — Alternating Layout ═══ */}
      <section className="py-28">
        <div className="max-w-5xl mx-auto px-6 space-y-24">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}
            >
              {/* Icon block */}
              <div className="flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-red-600/10 border border-red-600/20 flex items-center justify-center"
                >
                  <feature.icon size={48} className="text-red-500" />
                </motion.div>
              </div>
              {/* Text */}
              <div>
                <span className="text-red-500 text-xs font-bold tracking-[0.2em] uppercase">
                  {feature.tag}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-4">{feature.title}</h3>
                <p className="text-gray-400 text-lg leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA FINAL — Full Screen ═══ */}
      <section ref={contatoRef} className="relative py-32 overflow-hidden" style={{ background: 'hsl(220 13% 5%)' }}>
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto px-6 text-center"
        >
          <p className="text-red-500 text-sm font-semibold tracking-[0.2em] uppercase mb-6">
            Comece Agora
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
            PRONTO PARA{' '}
            <span className="gradient-text">COMEÇAR</span>
            {'?'}
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
            Crie sua conta pelo convite e comece a estudar hoje mesmo.
          </p>
          <Link
            to="/auth"
            className="group relative overflow-hidden inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-5 rounded-full text-lg transition-all duration-300"
            style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}
          >
            <span className="relative z-10">COMECAR AGORA</span>
            <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
            />
          </Link>
        </motion.div>
      </section>

      {/* ═══ FOOTER — Minimal ═══ */}
      <footer className="py-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xs text-white">{APP_NAME.charAt(0).toUpperCase()}</div>
            <span className="font-bold text-white text-sm">
              {APP_NAME}
            </span>
          </div>
          <p className="text-sm text-gray-600">{APP_NAME} &bull; Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}


/* ═══ DATA ═══ */
const categories = [
  { name: 'Categoria 1', description: 'Descreva aqui o que o aluno vai aprender', icon: Brain },
  { name: 'Categoria 2', description: 'Descreva aqui o que o aluno vai aprender', icon: Workflow },
  { name: 'Categoria 3', description: 'Descreva aqui o que o aluno vai aprender', icon: Cpu },
  { name: 'Categoria 4', description: 'Descreva aqui o que o aluno vai aprender', icon: Sparkles },
  { name: 'Categoria 5', description: 'Descreva aqui o que o aluno vai aprender', icon: Globe },
  { name: 'Categoria 6', description: 'Descreva aqui o que o aluno vai aprender', icon: Code },
];

const stats = [
  { label: 'Membros', count: 100, suffix: '+' },
  { label: 'Módulos', count: 10, suffix: '+' },
  { label: 'Aulas', count: 50, suffix: '+' },
  { label: 'Online', count: 100, suffix: '%' },
];

const features = [
  {
    tag: 'Conteúdo Atualizado',
    title: 'Novos módulos com frequência',
    description: 'Adicione novos cursos e aulas pelo painel de administração a qualquer momento.',
    icon: RefreshCw,
  },
  {
    tag: 'Comunidade',
    title: 'Aprenda junto com outros alunos',
    description: 'Comentários nas aulas e avaliações de curso para trocar experiências.',
    icon: Users,
  },
  {
    tag: 'Prático',
    title: 'Foco em aplicação real',
    description: 'Acompanhe seu progresso e retome de onde parou, em qualquer dispositivo.',
    icon: Zap,
  },
];
