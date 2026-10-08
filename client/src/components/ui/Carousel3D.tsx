import { useState, useRef, ReactNode, useEffect, useCallback } from 'react';

interface Carousel3DProps {
  children: ReactNode[];
  onItemClick?: (index: number) => void;
}

export default function Carousel3D({ children, onItemClick }: Carousel3DProps) {
  const count = children.length;
  const angleStep = 360 / count;
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const lastX = useRef(0);
  const startX = useRef(0);
  const tappedIndex = useRef<number | null>(null);
  const onItemClickRef = useRef(onItemClick);
  onItemClickRef.current = onItemClick;

  const radius = 350;

  // Block browser back/forward swipe gesture
  useEffect(() => {
    const originalStyle = document.body.style.overscrollBehaviorX;
    document.body.style.overscrollBehaviorX = 'none';
    document.documentElement.style.overscrollBehaviorX = 'none';
    return () => {
      document.body.style.overscrollBehaviorX = originalStyle;
      document.documentElement.style.overscrollBehaviorX = '';
    };
  }, []);

  const handleGlobalMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - lastX.current;
    if (Math.abs(e.clientX - startX.current) > 8) didDrag.current = true;
    lastX.current = e.clientX;
    angleRef.current += delta * 0.4;
    setAngle(angleRef.current);
  }, []);

  const handleGlobalUp = useCallback(() => {
    isDragging.current = false;
    // Navigate if it was a tap (not a drag) on a card
    if (!didDrag.current && tappedIndex.current !== null && onItemClickRef.current) {
      onItemClickRef.current(tappedIndex.current);
    }
    tappedIndex.current = null;
    document.removeEventListener('pointermove', handleGlobalMove);
    document.removeEventListener('pointerup', handleGlobalUp);
  }, [handleGlobalMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    didDrag.current = false;
    lastX.current = e.clientX;
    startX.current = e.clientX;

    // Find which card was tapped by walking up from e.target
    const target = e.target as HTMLElement;
    const cardEl = target.closest?.('[data-carousel-index]');
    if (cardEl) {
      tappedIndex.current = Number(cardEl.getAttribute('data-carousel-index'));
    } else {
      tappedIndex.current = null;
    }

    document.addEventListener('pointermove', handleGlobalMove);
    document.addEventListener('pointerup', handleGlobalUp);
  };

  // Horizontal scroll wheel to rotate
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 1) {
        e.preventDefault();
        e.stopPropagation();
        angleRef.current -= delta * 0.3;
        setAngle(angleRef.current);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Auto slow rotation
  useEffect(() => {
    const id = setInterval(() => {
      if (!isDragging.current) {
        angleRef.current -= 0.15;
        setAngle(angleRef.current);
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handleGlobalMove);
      document.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [handleGlobalMove, handleGlobalUp]);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2">
          Módulos em <span className="gradient-text">Destaque</span>
        </h2>
        <p className="text-gray-400 text-lg">
          Explore nossos módulos de IA e Automações
        </p>
      </div>

      {/* 3D Scene */}
      <div
        ref={containerRef}
        className="relative w-full mx-auto overflow-hidden select-none cursor-pointer active:cursor-grabbing"
        style={{
          height: '380px',
          perspective: '1800px',
          perspectiveOrigin: '50% 45%',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Rotating ring */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${angle}deg)`,
          }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              data-carousel-index={i}
              className="absolute"
              style={{
                width: '160px',
                left: '-80px',
                top: '-140px',
                transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                transformStyle: 'preserve-3d',
                cursor: 'pointer',
              }}
            >
              {child}
            </div>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[hsl(220,13%,8%)] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[hsl(220,13%,8%)] to-transparent z-10 pointer-events-none" />

        {/* Center glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-red-600/8 rounded-full blur-[60px] pointer-events-none" />
      </div>

      <p className="text-center text-[11px] text-gray-600 mt-2 tracking-wider">
        ← arraste ou scroll para girar →
      </p>
    </div>
  );
}
