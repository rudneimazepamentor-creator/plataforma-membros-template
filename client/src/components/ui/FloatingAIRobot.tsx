import { useState, useEffect } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';

const messages = [
  'Explore as ferramentas',
  'Continue de onde parou',
  'Confira os novos conteúdos',
  'Bons estudos!',
];

export default function FloatingAIRobot() {
  const [showBubble, setShowBubble] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Speech bubble */}
      {showBubble && (
        <div className="relative max-w-[200px] animate-fade-in">
          <div className="card !p-3 !rounded-2xl !rounded-br-sm text-sm relative" style={{ background: 'hsl(220 13% 14%)', borderColor: 'hsla(0, 72%, 51%, 0.2)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <X size={10} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-red-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs">{messages[messageIndex]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Robot button */}
      <button
        onMouseEnter={() => { setIsHovered(true); if (!showBubble) setShowBubble(true); }}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group"
        style={{ animation: 'float 4s ease-in-out infinite' }}
      >
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping" style={{ animationDuration: '3s' }} />

        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-full bg-red-600/20 animate-pulse-glow" />

        {/* Robot body */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow transition-transform group-hover:scale-110">
          <Bot size={28} className="text-white" />

          {/* Sparkle */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
            <Sparkles size={10} className="text-yellow-900" />
          </div>
        </div>
      </button>
    </div>
  );
}
