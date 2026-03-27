import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo-osdevs.jpeg';

interface LoginTransitionProps {
  show: boolean;
  onComplete: () => void;
}

// Generate random bubbles
const bubbles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 12 + Math.random() * 40,
  delay: 0.4 + Math.random() * 0.6,
  duration: 0.8 + Math.random() * 0.6,
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
            // Only trigger on exit complete
            if (def.opacity === 0) onComplete();
          }}
          style={{ background: 'radial-gradient(ellipse at center, hsl(220 25% 12%), hsl(220 30% 6%))' }}
        >
          {/* Water jet sweep */}
          <motion.div
            className="absolute inset-y-0 w-[200px]"
            initial={{ left: '-200px' }}
            animate={{ left: '110%' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(100,180,255,0.15), rgba(150,220,255,0.4), rgba(100,180,255,0.15), transparent)',
              filter: 'blur(8px)',
            }}
          />

          {/* Second subtle jet */}
          <motion.div
            className="absolute inset-y-0 w-[120px]"
            initial={{ left: '-120px' }}
            animate={{ left: '110%' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(130,200,255,0.1), rgba(180,230,255,0.25), rgba(130,200,255,0.1), transparent)',
              filter: 'blur(12px)',
            }}
          />

          {/* Soap bubbles */}
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              className="absolute rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.7, 0.4], scale: [0, 1.1, 1] }}
              transition={{ duration: b.duration, delay: b.delay, ease: 'easeOut' }}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 35% 35%, rgba(200,230,255,0.35), rgba(140,200,255,0.1) 50%, transparent 70%)`,
                border: '1px solid rgba(180,220,255,0.2)',
                boxShadow: `inset 0 -2px 6px rgba(100,180,255,0.1), 0 0 8px rgba(140,200,255,0.08)`,
              }}
            />
          ))}

          {/* Aurora glow behind logo */}
          <motion.div
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0.4], scale: [0.5, 1, 1], rotate: [0, 360] }}
            transition={{
              opacity: { duration: 1, delay: 0.5 },
              scale: { duration: 1, delay: 0.5 },
              rotate: { duration: 3, ease: 'linear', repeat: Infinity },
            }}
            style={{
              width: 220,
              height: 220,
              background: 'conic-gradient(from 0deg, rgba(100,180,255,0.3), rgba(130,100,255,0.2), rgba(100,220,200,0.3), rgba(100,180,255,0.3))',
              filter: 'blur(30px)',
            }}
          />

          {/* Pulse rings */}
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-blue-400/20"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.5, 0], scale: [0.3, 1.8] }}
              transition={{ duration: 1.4, delay: 0.6 + delay, ease: 'easeOut' }}
              style={{ width: 180, height: 180 }}
            />
          ))}

          {/* Logo */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={logo}
              alt="Os Devs"
              className="w-20 h-20 rounded-2xl object-cover shadow-2xl ring-2 ring-blue-400/30"
            />
            <motion.p
              className="text-blue-200/80 text-sm font-medium tracking-wide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              Preparando seu painel
              {/* Pulsing dots */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.25,
                  }}
                >
                  .
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          {/* Auto-dismiss timer */}
          <HiddenTimer duration={2200} onDone={onComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HiddenTimer({ duration, onDone }: { duration: number; onDone: () => void }) {
  // Fire callback after duration
  const ref = { current: false };
  setTimeout(() => {
    if (!ref.current) {
      ref.current = true;
      onDone();
    }
  }, duration);
  return null;
}
