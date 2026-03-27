import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo-osdevs.jpeg';

interface LoginTransitionProps {
  show: boolean;
  onComplete: () => void;
}

// Generate random bubbles — more for a longer show
const bubbles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 14 + Math.random() * 48,
  delay: 0.6 + Math.random() * 3.5,
  duration: 1.5 + Math.random() * 1.5,
  floatY: -(20 + Math.random() * 60),
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
          transition={{ duration: 0.4 }}
          onAnimationComplete={(def: { opacity?: number }) => {
            if (def.opacity === 0) onComplete();
          }}
          style={{ background: 'radial-gradient(ellipse at center, hsl(220 25% 12%), hsl(220 30% 6%))' }}
        >
          {/* Water jet sweep 1 — slow cinematic */}
          <motion.div
            className="absolute inset-y-0 w-[280px]"
            initial={{ left: '-280px' }}
            animate={{ left: '110%' }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(100,180,255,0.12), rgba(150,220,255,0.35), rgba(100,180,255,0.12), transparent)',
              filter: 'blur(10px)',
            }}
          />

          {/* Water jet sweep 2 */}
          <motion.div
            className="absolute inset-y-0 w-[160px]"
            initial={{ left: '-160px' }}
            animate={{ left: '110%' }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(130,200,255,0.08), rgba(180,230,255,0.22), rgba(130,200,255,0.08), transparent)',
              filter: 'blur(14px)',
            }}
          />

          {/* Water jet sweep 3 — late dramatic pass */}
          <motion.div
            className="absolute inset-y-0 w-[220px]"
            initial={{ right: '-220px' }}
            animate={{ right: '110%' }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 3.5 }}
            style={{
              background: 'linear-gradient(270deg, transparent, rgba(100,200,255,0.1), rgba(140,220,255,0.3), rgba(100,200,255,0.1), transparent)',
              filter: 'blur(10px)',
            }}
          />

          {/* Soap bubbles with float animation */}
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              className="absolute rounded-full"
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{
                opacity: [0, 0.7, 0.6, 0.3, 0],
                scale: [0, 1.15, 1, 0.9],
                y: [0, b.floatY],
              }}
              transition={{
                duration: b.duration + 1.5,
                delay: b.delay,
                ease: 'easeOut',
              }}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 30% 30%, rgba(200,230,255,0.4), rgba(140,200,255,0.12) 50%, transparent 70%)`,
                border: '1px solid rgba(180,220,255,0.25)',
                boxShadow: `inset 0 -3px 8px rgba(100,180,255,0.12), 0 0 12px rgba(140,200,255,0.1)`,
              }}
            />
          ))}

          {/* Ambient glow particles */}
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0], y: [0, -(40 + Math.random() * 80)] }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: 1 + i * 0.6,
                ease: 'easeInOut',
              }}
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${30 + Math.random() * 40}%`,
                width: 4 + Math.random() * 6,
                height: 4 + Math.random() * 6,
                background: 'rgba(160,210,255,0.5)',
                filter: 'blur(2px)',
              }}
            />
          ))}

          {/* Aurora glow behind logo — slower rotation */}
          <motion.div
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: [0, 0.5, 0.7, 0.5],
              scale: [0.3, 0.8, 1, 1.05],
              rotate: [0, 360],
            }}
            transition={{
              opacity: { duration: 3, delay: 1.2 },
              scale: { duration: 3, delay: 1.2, ease: 'easeOut' },
              rotate: { duration: 6, ease: 'linear', repeat: Infinity },
            }}
            style={{
              width: 260,
              height: 260,
              background: 'conic-gradient(from 0deg, rgba(100,180,255,0.35), rgba(130,100,255,0.25), rgba(100,220,200,0.35), rgba(180,140,255,0.2), rgba(100,180,255,0.35))',
              filter: 'blur(35px)',
            }}
          />

          {/* Secondary aurora ring */}
          <motion.div
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.25, 0.15],
              scale: [0.5, 1.3],
              rotate: [0, -360],
            }}
            transition={{
              opacity: { duration: 4, delay: 2 },
              scale: { duration: 5, delay: 2 },
              rotate: { duration: 8, ease: 'linear', repeat: Infinity },
            }}
            style={{
              width: 340,
              height: 340,
              background: 'conic-gradient(from 180deg, rgba(100,220,200,0.2), rgba(130,100,255,0.15), rgba(100,180,255,0.2), transparent)',
              filter: 'blur(40px)',
            }}
          />

          {/* Pulse rings — staggered waves */}
          {[0, 0.6, 1.2, 2.0, 3.0, 4.0].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-blue-400/20"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: [0, 0.4, 0], scale: [0.2, 2.2] }}
              transition={{ duration: 2.5, delay: 1.5 + delay, ease: 'easeOut' }}
              style={{ width: 200, height: 200 }}
            />
          ))}

          {/* Logo — appears mid-animation */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Logo with subtle float */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            >
              <img
                src={logo}
                alt="Os Devs"
                className="w-24 h-24 rounded-2xl object-cover shadow-2xl ring-2 ring-blue-400/30"
              />
            </motion.div>

            {/* App name */}
            <motion.h2
              className="text-xl font-bold tracking-wider"
              style={{ color: 'rgba(200,220,255,0.9)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.6, duration: 0.6 }}
            >
              Fluxo Amigo
            </motion.h2>

            {/* Loading text with pulsing dots */}
            <motion.p
              className="text-sm font-medium tracking-wide"
              style={{ color: 'rgba(160,190,230,0.7)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.2, duration: 0.5 }}
            >
              Preparando seu painel
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                >
                  .
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          {/* Auto-dismiss timer */}
          <HiddenTimer duration={8500} onDone={onComplete} />
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
