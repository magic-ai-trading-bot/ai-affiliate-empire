import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'ghost';
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, ...props }, ref) => {
    const baseStyles = 'rounded-xl transition-all duration-300';

    const variants = {
      default: 'bg-card border border-border',
      elevated: 'bg-card border border-border shadow-sm hover:shadow-md',
      interactive:
        'bg-card border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer',
      ghost: 'bg-transparent',
    };

    const hoverStyles = hover ? 'hover:bg-card-hover' : '';

    return (
      <div ref={ref} className={cn(baseStyles, variants[variant], hoverStyles, className)} {...props} />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
  }
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return <h3 ref={ref} className={cn('text-2xl font-bold leading-tight', className)} {...props} />;
  }
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
  }
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
