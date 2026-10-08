import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Check, ShieldOff } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setBlocked(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setBlocked(data.error || 'Este email não tem acesso à plataforma.');
      } else if (!res.ok) {
        toast.error(data.error || 'Erro ao processar solicitação');
      } else {
        setSent(true);
        toast.success('Email enviado!');
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'hsl(220 13% 8%)' }}>
      <Link to="/auth" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
        <ArrowLeft size={16} /> Voltar ao login
      </Link>

      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-glow mx-auto mb-3">D</div>
        <h1 className="text-2xl font-bold text-white">Esqueci minha senha</h1>
        <p className="text-gray-500 mt-2">Informe seu email para receber o link de redefinição</p>
      </div>

      <div className="w-full max-w-md card">
        {blocked ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldOff size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Acesso não autorizado</h3>
            <p className="text-gray-400 text-sm mb-6">
              O email <strong className="text-white">{email}</strong> não está cadastrado na plataforma.
            </p>
            <p className="text-gray-500 text-xs mb-6">
              {blocked}
            </p>
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2">
              Voltar ao login
            </Link>
          </motion.div>
        ) : sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Email enviado!</h3>
            <p className="text-gray-400 text-sm mb-6">
              Enviamos um link de redefinição para <strong className="text-white">{email}</strong>.
            </p>
            <p className="text-gray-500 text-xs mb-4">Verifique também a pasta de spam.</p>
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2">
              Voltar ao login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field !pl-11"
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 !py-3.5">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Mail size={18} /> Enviar link de redefinição
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
