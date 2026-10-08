import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'hsl(220 13% 8%)' }}>
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link inválido</h1>
          <p className="text-gray-400 mb-6">Este link de redefinição de senha é inválido ou expirou.</p>
          <Link to="/forgot-password" className="btn-primary inline-flex">Solicitar novo link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'hsl(220 13% 8%)' }}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-glow mx-auto mb-3">D</div>
        <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
        <p className="text-gray-500 mt-2">Crie uma nova senha para sua conta</p>
      </div>

      <div className="w-full max-w-md card">
        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Senha alterada!</h3>
            <p className="text-gray-400 text-sm mb-6">Sua senha foi atualizada com sucesso. Faça login com a nova senha.</p>
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2">
              <Lock size={16} /> Ir para o login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Repita a senha"
                minLength={6}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 !py-3.5">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} /> Salvar nova senha
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
