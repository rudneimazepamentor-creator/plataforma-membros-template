import { APP_NAME } from '@/lib/config';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings, BookOpen, User, Menu, X, LogIn, Sparkles, Gift, Calendar } from 'lucide-react';
import { NotificationButton } from '@/components/ui/InstallBanner';

interface HeaderProps {
  onScrollTo?: (id: string) => void;
  showNav?: boolean;
}

export default function Header({ onScrollTo, showNav = false }: HeaderProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: 'hsla(220, 13%, 8%, 0.8)', borderColor: 'hsl(220 13% 18%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-glow">
              {APP_NAME.charAt(0).toUpperCase()}
            </div>
            <span className="text-lg font-bold tracking-wide text-white">
              {APP_NAME}
            </span>
          </Link>

          {/* Nav público (landing) */}
          {showNav && !user && (
            <nav className="hidden md:flex items-center gap-6">
              {['Modulos', 'Sobre', 'Contato'].map((item) => (
                <button
                  key={item}
                  onClick={() => onScrollTo?.(item.toLowerCase())}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {item === 'Modulos' ? 'Módulos' : item}
                </button>
              ))}
            </nav>
          )}

          {/* Nav logado */}
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                <BookOpen size={16} />
                Cursos
              </Link>
              <Link to="/agenda" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                <Calendar size={16} />
                Agenda
              </Link>
              <Link to="/indicar" className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20">
                <Gift size={14} />
                Indicar
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-sm">
                  <Settings size={16} />
                  Admin
                </Link>
              )}
              <NotificationButton />
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden md:flex items-center gap-3 ml-4 pl-4" style={{ borderLeft: '1px solid hsl(220 13% 18%)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                    <User size={14} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-300">{user.display_name}</span>
                </div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors" title="Sair">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/auth" className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2">
                  Entrar
                </Link>
                <Link to="/auth" className="btn-primary text-sm !px-5 !py-2.5 flex items-center gap-2">
                  <Sparkles size={14} />
                  Começar Agora
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-gray-400 hover:text-white p-2"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 space-y-3" style={{ borderTop: '1px solid hsl(220 13% 18%)' }}>
            {user ? (
              <>
                <Link to="/" className="block text-gray-300 py-2" onClick={() => setMobileOpen(false)}>Cursos</Link>
                <Link to="/agenda" className="flex items-center gap-2 text-gray-300 py-2" onClick={() => setMobileOpen(false)}><Calendar size={16} /> Agenda</Link>
                <Link to="/indicar" className="flex items-center gap-2 text-red-400 py-2 font-medium" onClick={() => setMobileOpen(false)}>
                  <Gift size={16} /> Indicar e Ganhar
                </Link>
                {isAdmin && <Link to="/admin" className="block text-gray-300 py-2" onClick={() => setMobileOpen(false)}>Admin</Link>}
                <button onClick={handleLogout} className="text-red-400 py-2">Sair</button>
              </>
            ) : (
              <>
                <Link to="/auth" className="block text-gray-300 py-2" onClick={() => setMobileOpen(false)}>Entrar</Link>
                <Link to="/auth" className="btn-primary text-sm text-center block" onClick={() => setMobileOpen(false)}>Começar Agora</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
