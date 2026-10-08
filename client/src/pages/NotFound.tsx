import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(220 13% 8%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-extrabold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Página não encontrada</h1>
        <p className="text-gray-400 mb-8">A página que você está procurando não existe ou foi movida.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home size={16} /> Início
          </Link>
          <button onClick={() => history.back()} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
