import { APP_NAME } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, AlertCircle, Check, ArrowLeft } from 'lucide-react';

export default function Register() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', whatsapp: '',
    city: '', uf: '', occupation: '', motivation: '', objective: '', instagram: '',
  });

  // Se já logado, redireciona
  if (user) { navigate('/'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error('Nome, email e senha são obrigatórios');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: any }>('/auth/register', {
        invite_token: token,
        ...form,
      });
      api.setToken(data.token);
      setSuccess(true);
      toast.success('Conta criada com sucesso!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(220 13% 8%)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Bem-vindo ao {APP_NAME}!</h1>
          <p className="text-gray-400">Redirecionando para a plataforma...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'hsl(220 13% 8%)' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Voltar ao início
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-glow mx-auto mb-4">{APP_NAME.charAt(0).toUpperCase()}</div>
          <h1 className="text-3xl font-bold">{APP_NAME}</h1>
          <p className="text-gray-400 mt-2">Crie sua conta para acessar a plataforma</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="text-lg font-bold mb-2">Cadastro de Aluno</h3>

          {/* Obrigatórios */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome completo *</label>
            <input className="input-field" placeholder="Seu nome completo" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input className="input-field" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha *</label>
            <div className="relative">
              <input className="input-field pr-12" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={8} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
            <input className="input-field" placeholder="(41) 99999-9999" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
          </div>

          {/* Opcionais */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cidade</label>
              <input className="input-field" placeholder="Sua cidade" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">UF</label>
              <input className="input-field" placeholder="PR" maxLength={2} value={form.uf} onChange={(e) => update('uf', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Profissão</label>
            <input className="input-field" placeholder="O que você faz?" value={form.occupation} onChange={(e) => update('occupation', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">O que te motivou a entrar?</label>
            <textarea className="input-field" rows={2} placeholder="Conte sua motivação..." value={form.motivation} onChange={(e) => update('motivation', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Qual seu maior objetivo com IA?</label>
            <textarea className="input-field" rows={2} placeholder="O que quer conquistar?" value={form.objective} onChange={(e) => update('objective', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Instagram</label>
            <input className="input-field" placeholder="@seuperfil" value={form.instagram} onChange={(e) => update('instagram', e.target.value)} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-50">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><UserPlus size={18} /> Criar minha conta</>
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            Já tem conta? <Link to="/auth" className="text-red-500 hover:text-red-400">Faça login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
