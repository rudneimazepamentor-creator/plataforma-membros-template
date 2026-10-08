import { APP_NAME } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Check, AlertCircle, ChevronDown, ShieldCheck as Shield } from 'lucide-react';

export default function ReferralApply() {
  const { code } = useParams();
  const [referrerName, setReferrerName] = useState('');
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', whatsapp: '', instagram: '',
    occupation: '', current_revenue: '', uses_ai: '',
    objective: '', why_deserves: '', commitment: '',
    payment_preference: '',
  });

  useEffect(() => {
    api.get<{ valid: boolean; referrer_name: string }>(`/referrals/validate/${code}`)
      .then((data) => { setValid(true); setReferrerName(data.referrer_name); })
      .catch(() => setValid(false));
  }, [code]);

  const u = (field: string, value: string) => setForm({ ...form, [field]: value });

  // Máscara WhatsApp
  const maskWhatsApp = (v: string) => {
    let d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length > 7) d = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    else if (d.length > 2) d = `(${d.slice(0,2)}) ${d.slice(2)}`;
    return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['full_name', 'email', 'whatsapp', 'occupation', 'current_revenue', 'uses_ai', 'objective', 'why_deserves', 'commitment', 'payment_preference'];
    const missing = required.filter(f => !(form as any)[f]);
    if (missing.length) { toast.error('Preencha todos os campos obrigatórios'); return; }

    setLoading(true);
    try {
      await api.post('/referrals/apply', {
        code,
        ...form,
        main_challenge: form.objective,
        why_join: form.why_deserves,
      });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#09070d' }}><div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (valid === false) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#09070d' }}>
      <div className="text-center"><AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link inválido</h1>
        <p className="text-gray-400 mb-6">Este link de indicação não é válido ou expirou.</p></div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#09070d' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="text-2xl font-bold mb-3" style={{ background: 'linear-gradient(135deg, #d4a053, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aplicação Enviada!</h1>
        <p className="text-gray-400 mb-4">Sua ficha de seleção foi recebida com sucesso. Vamos analisar suas respostas e entrar em contato pelo WhatsApp informado.</p>
        <p className="text-sm text-gray-600">Prazo de resposta: até 48 horas úteis.</p>
        <p className="text-sm text-gray-500 mt-4">Indicado por: <strong className="text-white">{referrerName}</strong></p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#09070d', fontFamily: "'Inter', sans-serif" }}>

      {/* Marquee */}
      <div className="overflow-hidden whitespace-nowrap py-2.5" style={{ background: 'linear-gradient(90deg, #4c1d95, #6c3aed, #4c1d95)', borderBottom: '1px solid rgba(108,58,237,0.4)' }}>
        <div className="inline-flex animate-[marquee_28s_linear_infinite]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="inline-flex">
              {['INDICAÇÃO ESPECIAL', APP_NAME.toUpperCase()].map((t, j) => (
                <span key={j} className="inline-flex items-center gap-2.5 px-9 text-xs font-semibold tracking-wider uppercase" style={{ color: '#ecc888' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4a053' }} />
                  {t} <span className="text-white/50 font-normal">Vagas limitadas</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 text-center relative overflow-hidden px-5">
        <div className="absolute w-[600px] h-[600px] rounded-full top-[-200px] left-1/2 -translate-x-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(108,58,237,0.15), transparent 70%)' }} />

        <div className="relative z-10 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(108,58,237,0.12)', border: '1px solid rgba(108,58,237,0.3)', color: '#8b5cf6' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Indicação de {referrerName}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
            Ficha de Seleção{' '}
            <span style={{ background: 'linear-gradient(135deg, #ecc888, #d4a053, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{APP_NAME}</span>
          </h1>
          <p className="text-white/50 mb-8 leading-relaxed">
            Preencha a ficha abaixo para se candidatar por indicação. Entraremos em contato após a análise.
          </p>

          <div className="flex gap-6 justify-center mb-6 flex-wrap">
            {[['100%', 'Online'], ['24/7', 'Acesso'], ['Suporte', 'Dedicado']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-black" style={{ color: '#ecc888' }}>{v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/35">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 px-5" style={{ background: '#0f0b15' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-center text-xl font-black mb-7">O que você recebe ao ser <span style={{ background: 'linear-gradient(135deg, #ecc888, #d4a053, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>selecionado</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['🎓', 'Cursos e aulas', 'Conteúdo em vídeo organizado por módulos.'],
              ['📈', 'Acompanhe seu progresso', 'Veja o que já concluiu em cada curso.'],
              ['📎', 'Materiais complementares', 'PDFs e arquivos de apoio em cada aula.'],
              ['⚡', 'Atualizações', 'Novos conteúdos adicionados continuamente.'],
            ].map(([ico, t, d]) => (
              <div key={t} className="p-5 rounded-xl transition-all hover:bg-purple-500/10" style={{ background: 'rgba(108,58,237,0.05)', border: '1px solid rgba(108,58,237,0.15)' }}>
                <div className="text-xl mb-2">{ico}</div>
                <h3 className="font-bold text-sm mb-1" style={{ color: '#ecc888' }}>{t}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 px-5">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl p-8 sm:p-10 relative overflow-hidden" style={{ background: '#151020', border: '1px solid rgba(108,58,237,0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #6c3aed, #d4a053, #8b5cf6)' }} />

            <h2 className="text-xl font-black mb-1">Preencha sua aplicação</h2>
            <p className="text-sm text-white/40 mb-8">Todos os campos com * são obrigatórios. Quanto mais detalhado, maiores suas chances.</p>

            <form onSubmit={handleSubmit}>

              {/* Dados Pessoais */}
              <SectionTitle>Dados Pessoais</SectionTitle>

              <Field label="Nome completo" required>
                <input className="fi" placeholder="Seu nome completo" value={form.full_name} onChange={(e) => u('full_name', e.target.value)} />
              </Field>

              <Field label="E-mail" required>
                <input className="fi" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => u('email', e.target.value)} />
              </Field>

              <Field label="WhatsApp (com DDD)" required>
                <input className="fi" placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => u('whatsapp', maskWhatsApp(e.target.value))} />
              </Field>

              <Field label="Instagram" hint="Opcional, mas ajuda na análise do seu perfil.">
                <input className="fi" placeholder="@seuusuario" value={form.instagram} onChange={(e) => u('instagram', e.target.value)} />
              </Field>

              <Divider />
              <SectionTitle>Sobre você e seu negócio</SectionTitle>

              <Field label="Qual sua área de atuação?" required>
                <input className="fi" placeholder="Ex: Marketing digital, e-commerce, consultoria, saúde..." value={form.occupation} onChange={(e) => u('occupation', e.target.value)} />
              </Field>

              <Field label="Qual seu faturamento mensal atual?" required>
                <select className="fi" value={form.current_revenue} onChange={(e) => u('current_revenue', e.target.value)}>
                  <option value="">Selecione uma faixa</option>
                  <option value="ainda-nao-faturo">Ainda não faturo</option>
                  <option value="ate-5k">Até R$ 5.000/mês</option>
                  <option value="5k-15k">R$ 5.000 a R$ 15.000/mês</option>
                  <option value="15k-50k">R$ 15.000 a R$ 50.000/mês</option>
                  <option value="50k-100k">R$ 50.000 a R$ 100.000/mês</option>
                  <option value="acima-100k">Acima de R$ 100.000/mês</option>
                </select>
              </Field>

              <Field label="Você já tem experiência na sua área?" required>
                <select className="fi" value={form.uses_ai} onChange={(e) => u('uses_ai', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="nao">Não, estou começando</option>
                  <option value="basico">Sim, nível básico</option>
                  <option value="intermediario">Sim, nível intermediário</option>
                  <option value="avancado">Sim, nível avançado</option>
                </select>
              </Field>

              <Divider />
              <SectionTitle>Qualificação</SectionTitle>

              <Field label="Qual seu principal objetivo ao entrar?" required>
                <textarea className="fi min-h-[90px] resize-y" placeholder="Descreva o que você espera conquistar..." value={form.objective} onChange={(e) => u('objective', e.target.value)} />
              </Field>

              <Field label="Por que você acredita que merece uma vaga?" required hint="Seja honesto e direto. Queremos conhecer seu comprometimento real.">
                <textarea className="fi min-h-[90px] resize-y" placeholder="O que te diferencia? Por que devemos escolher você?" value={form.why_deserves} onChange={(e) => u('why_deserves', e.target.value)} />
              </Field>

              <Field label="Você se compromete a aplicar os conhecimentos durante o programa?" required>
                <select className="fi" value={form.commitment} onChange={(e) => u('commitment', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="sim-total">Sim, compromisso total</option>
                  <option value="sim-parcial">Sim, mas com algumas limitações de agenda</option>
                  <option value="nao-tenho-certeza">Não tenho certeza</option>
                </select>
              </Field>

              <Divider />
              <SectionTitle>Investimento</SectionTitle>

              <Field label="Caso seja selecionado, qual forma de pagamento você prefere?" required>
                <div className="space-y-3">
                  {[
                    { value: 'avista', label: 'À vista', sub: 'Pagamento único' },
                    { value: 'parcelado', label: 'Parcelado', sub: 'Em parcelas' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all" style={{
                      background: form.payment_preference === opt.value ? 'rgba(108,58,237,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.payment_preference === opt.value ? 'rgba(108,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                      <input type="radio" name="payment" checked={form.payment_preference === opt.value} onChange={() => u('payment_preference', opt.value)}
                        className="w-5 h-5 accent-purple-500" />
                      <span className="text-sm text-white/70"><strong className="text-white">{opt.label}</strong> — {opt.sub}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <button type="submit" disabled={loading} className="w-full py-4 px-6 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-2 relative overflow-hidden transition-all hover:-translate-y-1 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6c3aed, #8b5cf6)', color: 'white', boxShadow: '0 4px 30px rgba(108,58,237,0.4)' }}>
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ENVIAR MINHA APLICAÇÃO →'}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-white/30">
                <Shield size={12} /> Suas informações estão seguras e não serão compartilhadas.
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-white/25" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p>{APP_NAME} © {new Date().getFullYear()}. Todos os direitos reservados.</p>
        <p className="mt-1">Este é um processo seletivo por indicação. O preenchimento não garante a vaga.</p>
      </footer>

      <style>{`
        .fi { width:100%; padding:14px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:white; font-size:15px; font-family:inherit; outline:none; transition:.3s; appearance:none; }
        .fi::placeholder { color:rgba(255,255,255,0.25); }
        .fi:focus { border-color:rgba(108,58,237,0.6); background:rgba(108,58,237,0.06); box-shadow:0 0 0 3px rgba(108,58,237,0.12); }
        select.fi { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 16px center; cursor:pointer; }
        select.fi option { background:#09070d; color:white; }
        @keyframes marquee { to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: '#8b5cf6' }}>{children}</div>;
}

function Divider() {
  return <div className="my-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(108,58,237,0.2), transparent)' }} />;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold mb-2 text-white/80">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
    </div>
  );
}
