import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search' | 'email';
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', type, error, icon, iconPosition = 'left', ...props }, ref) => {
    const baseStyles =
      'flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    const variants = {
      default: '',
      search: 'pl-10',
      email: 'pr-10',
    };

    const errorStyles = error ? 'border-destructive focus-visible:ring-destructive' : '';

    if (icon) {
      return (
        <div className="relative">
          {iconPosition === 'left' && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              baseStyles,
              variants[variant],
              errorStyles,
              iconPosition === 'left' && 'pl-10',
              iconPosition === 'right' && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {iconPosition === 'right' && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
      );
    }

    return (
      <>
        <input
          type={type}
          className={cn(baseStyles, variants[variant], errorStyles, className)}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </>
    );
  }
);

Input.displayName = 'Input';

export default Input;
