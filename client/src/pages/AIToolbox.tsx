import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { Search, ExternalLink, Sparkles, Brain, Image, Code, Globe } from 'lucide-react';

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  icon_url: string;
  category: string;
}

const categoryIcons: Record<string, typeof Brain> = {
  texto: Brain,
  imagem: Image,
  codigo: Code,
  geral: Sparkles,
};

export default function AIToolbox() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Tool[]>('/ai-tools')
      .then(setTools)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ['', ...new Set(tools.map((t) => t.category || 'geral'))];

  const filtered = tools.filter((tool) => {
    const matchSearch = !search ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || (tool.category || 'geral') === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-bold mb-3"
          >
            Caixa de <span className="gradient-text">Ferramentas IA</span>
          </motion.h1>
          <p className="text-gray-400 text-lg">Ferramentas curadas para potencializar seu trabalho com IA</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ferramentas..."
              className="input-field !pl-11"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat || 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-12 w-12 rounded-xl mb-4" style={{ background: 'hsl(var(--muted))' }} />
                <div className="h-5 w-3/4 rounded mb-2" style={{ background: 'hsl(var(--muted))' }} />
                <div className="h-4 w-full rounded" style={{ background: 'hsl(var(--muted))' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">Nenhuma ferramenta encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tool, i) => {
              const Icon = categoryIcons[tool.category] || Globe;
              return (
                <motion.a
                  key={tool.id}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card group hover:shadow-glow transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      {tool.icon_url ? (
                        <img src={tool.icon_url} alt="" className="w-6 h-6" />
                      ) : (
                        <Icon size={22} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold group-hover:text-red-400 transition-colors truncate">{tool.name}</h3>
                        <ExternalLink size={12} className="text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{tool.description}</p>
                      <span className="badge bg-white/5 text-gray-400 mt-2 text-xs">{tool.category || 'geral'}</span>
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
