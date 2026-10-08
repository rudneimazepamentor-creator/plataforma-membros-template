import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  courseId: number;
  open: boolean;
  onClose: () => void;
}

export default function RatingModal({ courseId, open, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const active = hover || rating;

  const getColor = (value: number) => {
    if (value <= 6) return 'text-red-500';
    if (value <= 8) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getEmoji = (value: number) => {
    if (value === 0) return '';
    if (value <= 4) return 'Precisa melhorar';
    if (value <= 6) return 'Regular';
    if (value <= 8) return 'Bom!';
    if (value <= 9) return 'Excelente!';
    return 'Perfeito!';
  };

  const submit = async () => {
    if (!rating) { toast.error('Selecione uma nota'); return; }
    setLoading(true);
    try {
      await api.post('/ratings', { course_id: courseId, rating, feedback });
      toast.success('Avaliação enviada!');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="card w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold mb-2">Avaliar Módulo</h3>
            <p className="text-sm text-gray-400 mb-6">Sua avaliação nos ajuda a melhorar o conteúdo</p>

            {/* Rating scale 1-10 */}
            <div className="flex gap-1 justify-center mb-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    n <= active
                      ? `${getColor(active)} bg-white/10 scale-110`
                      : 'text-gray-600 hover:bg-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="text-center mb-6">
              <span className={`text-sm font-medium ${active ? getColor(active) : 'text-gray-500'}`}>
                {active ? `${active}/10 — ${getEmoji(active)}` : 'Selecione uma nota'}
              </span>
            </div>

            {/* Feedback */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input-field mb-4"
              rows={3}
              placeholder="Deixe um comentário (opcional)..."
            />

            <button
              onClick={submit}
              disabled={!rating || loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
