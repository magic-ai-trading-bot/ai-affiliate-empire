import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-md',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
      ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
      outline:
        'border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-5 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
