import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export default function ThemeToggle({
  className = '',
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`gap-2 transition-all duration-200 ${className}`}
      title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-warning animate-in spin-in-180 duration-300" />
          {showLabel && <span>Tema Claro</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-primary animate-in spin-in-180 duration-300" />
          {showLabel && <span>Tema Escuro</span>}
        </>
      )}
    </Button>
  );
}
