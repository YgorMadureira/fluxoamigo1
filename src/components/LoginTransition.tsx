import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo-osdevs.jpeg';

interface LoginTransitionProps {
  show: boolean;
  onComplete: () => void;
}

const bubbles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 10 + Math.random() * 36,
  delay: 0.2 + Math.random() * 1.5,
  duration: 1 + Math.random() * 1,
  floatY: -(15 + Math.random() * 40),
}));

// Thin vertical lines
const verticalLines = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: 5 + (i / 17) * 90,
  delay: 0.1 + Math.random() * 0.8,
  opacity: 0.06 + Math.random() * 0.12,
  width: 1 + Math.random() * 0.5,
}));

export default function LoginTransition({ show, onComplete }: LoginTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={(def: { opacity?: number }) => {
            if (def.opacity === 0) onComplete();
          }}
          style={{ background: 'radial-gradient(ellipse at center, hsl(220 25% 12%), hsl(220 30% 6%))' }}
        >
          {/* Thin vertical lines */}
          {verticalLines.map((line) => (
            <motion.div
              key={`vline-${line.id}`}
              className="absolute inset-y-0"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: line.opacity, scaleY: 1 }}
              transition={{ duration: 1.2, delay: line.delay, ease: 'easeOut' }}
              style={{
                left: `${line.x}%`,
                width: line.width,
                background: `linear-gradient(180deg, transparent 0%, rgba(140,200,255,0.3) 30%, rgba(140,200,255,0.15) 70%, transparent 100%)`,
                transformOrigin: 'top',
              }}
            />
          ))}

          {/* Water jet sweep */}
          <motion.div
            className="absolute inset-y-0 w-[200px]"
            initial={{ left: '-200px' }}
            animate={{ left: '110%' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(100,180,255,0.12), rgba(150,220,255,0.3), rgba(100,180,255,0.12), transparent)',
              filter: 'blur(8px)',
            }}
          />

          {/* Soap bubbles */}
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              className="absolute rounded-full"
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 0.6, 0.4, 0],
                scale: [0, 1.1, 0.9],
                y: [0, b.floatY],
              }}
              transition={{ duration: b.duration, delay: b.delay, ease: 'easeOut' }}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 30% 30%, rgba(200,230,255,0.4), rgba(140,200,255,0.12) 50%, transparent 70%)`,
                border: '1px solid rgba(180,220,255,0.2)',
                boxShadow: `inset 0 -3px 8px rgba(100,180,255,0.1), 0 0 10px rgba(140,200,255,0.08)`,
              }}
            />
          ))}

          {/* Aurora glow */}
          <motion.div
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.5, 0.6], scale: [0.3, 0.9, 1], rotate: [0, 180] }}
            transition={{ duration: 2.5, delay: 0.3, ease: 'easeOut' }}
            style={{
              width: 220,
              height: 220,
              background: 'conic-gradient(from 0deg, rgba(100,180,255,0.3), rgba(130,100,255,0.2), rgba(100,220,200,0.3), rgba(100,180,255,0.3))',
              filter: 'blur(30px)',
            }}
          />

          {/* Pulse rings */}
          {[0, 0.4, 0.8].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-blue-400/20"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: [0, 0.35, 0], scale: [0.2, 2] }}
              transition={{ duration: 1.5, delay: 0.5 + delay, ease: 'easeOut' }}
              style={{ width: 180, height: 180 }}
            />
          ))}

          {/* Logo */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={logo}
              alt="Os Devs"
              className="w-20 h-20 rounded-2xl object-cover shadow-2xl ring-2 ring-blue-400/30"
            />

            <motion.h2
              className="text-xl font-bold tracking-wider"
              style={{ color: 'rgba(200,220,255,0.9)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              Fluxo Amigo
            </motion.h2>

            <motion.p
              className="text-sm font-medium tracking-wide"
              style={{ color: 'rgba(160,190,230,0.7)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            >
              Preparando seu painel
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                >
                  .
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          <HiddenTimer duration={3000} onDone={onComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HiddenTimer({ duration, onDone }: { duration: number; onDone: () => void }) {
  const fired = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        onDone();
      }
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);
  return null;
}
