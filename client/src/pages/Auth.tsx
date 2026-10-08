import { APP_NAME } from '@/lib/config';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Bem-vindo de volta!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'hsl(220 13% 8%)' }}>
      <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 self-center">
        <ArrowLeft size={16} />
        Voltar ao início
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-glow">
            {APP_NAME.charAt(0).toUpperCase()}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">{APP_NAME}</h1>
        <p className="text-gray-500 mt-2">Acesse sua conta para continuar</p>
      </div>

      <div className="w-full max-w-md card">
        <div className="mb-6">
          <h3 className="text-xl font-bold">Entrar</h3>
          <p className="text-sm text-gray-500 mt-1">Use as credenciais que você cadastrou pelo convite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                placeholder="Sua senha"
                required
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 !py-3.5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>

          <div className="text-center mt-4">
            <Link to="/forgot-password" className="text-sm text-red-500 hover:text-red-400 transition-colors">
              Esqueci minha senha
            </Link>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 pt-6 border-t border-white/5">
            Acesso restrito. O cadastro é feito apenas pelo link de convite enviado pela equipe.
          </p>
        </form>
      </div>
    </div>
  );
}
