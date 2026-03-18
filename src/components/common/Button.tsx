interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ variant, children, onClick, disabled, className = '' }: ButtonProps) {
  const base = 'py-3 rounded-lg font-medium transition-colors';
  const styles = {
    primary: 'bg-sbb-red text-white hover:bg-sbb-red/90 disabled:opacity-40 disabled:cursor-not-allowed',
    secondary: 'border border-gray-300 dark:border-dark-border text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text hover:border-gray-400 dark:hover:border-dark-muted',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}
