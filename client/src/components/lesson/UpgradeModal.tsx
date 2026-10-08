import { X, Crown, MessageCircle, Sparkles } from 'lucide-react';
import { APP_NAME } from '@/lib/config';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  lessonTitle?: string;
  courseTitle?: string;
}

const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) || '';

export default function UpgradeModal({ open, onClose, lessonTitle, courseTitle }: UpgradeModalProps) {
  if (!open) return null;

  const message = encodeURIComponent(
    `Olá! Tenho interesse em fazer upgrade para o plano premium.\n\n` +
      (lessonTitle ? `Vi a aula "${lessonTitle}"` : 'Vi uma aula') +
      (courseTitle ? ` do curso "${courseTitle}"` : '') +
      ` e gostaria de saber mais sobre o acesso completo.`,
  );

  const waUrl = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`
    : `https://wa.me/?text=${message}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-dark-2 border border-red-600/30 rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center mb-4">
            <Crown size={32} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Conteúdo premium</h2>
          <p className="text-gray-400 text-sm mb-6">
            {lessonTitle ? (
              <>A aula <span className="text-white font-medium">"{lessonTitle}"</span> faz parte do conteúdo premium de {APP_NAME}.</>
            ) : (
              <>Esta aula faz parte do conteúdo premium de {APP_NAME}.</>
            )}
          </p>

          <div className="w-full bg-dark-3 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">O que você ganha no plano premium</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Acesso completo a todas as aulas e materiais.
                </p>
              </div>
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <MessageCircle size={18} />
            Falar com a equipe
          </a>

          <button
            onClick={onClose}
            className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
}
