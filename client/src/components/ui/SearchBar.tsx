import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Play, X } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  courses: Array<{ id: number; title: string; category: string }>;
  lessons: Array<{ id: number; title: string; course_id: number; module_name: string }>;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setOpen(true);
    try {
      const data = await api.get<SearchResult>(`/courses/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } catch {
      setResults({ courses: [], lessons: [] });
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setOpen(false); setResults(null); };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 card !p-3 !rounded-full" style={{ background: 'hsl(220 13% 12%)', borderColor: 'hsl(220 13% 20%)' }}>
        <Search size={18} className="text-gray-500 ml-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Busque por módulos, aulas ou materiais..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="btn-primary !rounded-full !px-5 !py-2 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Search size={14} />
          Buscar
        </button>
      </div>

      <AnimatePresence>
        {open && results && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full card !p-4 z-50 max-h-80 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-500">
                {results.courses.length + results.lessons.length} resultados
              </span>
              <button onClick={close} className="text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            </div>

            {results.courses.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <BookOpen size={12} /> Cursos ({results.courses.length})
                </h4>
                {results.courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate(`/courses/${c.id}`); close(); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300"
                  >
                    {c.title}
                    <span className="text-xs text-gray-500 ml-2">{c.category}</span>
                  </button>
                ))}
              </div>
            )}

            {results.lessons.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Play size={12} /> Aulas ({results.lessons.length})
                </h4>
                {results.lessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { navigate(`/courses/${l.course_id}/lesson/${l.id}`); close(); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300"
                  >
                    {l.title}
                    <span className="text-xs text-gray-500 ml-2">{l.module_name}</span>
                  </button>
                ))}
              </div>
            )}

            {results.courses.length === 0 && results.lessons.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nenhum resultado encontrado.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
