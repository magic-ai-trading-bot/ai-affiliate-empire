'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { ChevronDown, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';

interface Product {
  id: string;
  title: string;
  score: number;
  revenue: number;
  clicks: number;
  conversions: number;
  roi: number;
}

interface EnhancedTopProductsProps {
  products: Product[];
  loading?: boolean;
}

export function EnhancedTopProducts({ products, loading = false }: EnhancedTopProductsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <div className="h-6 w-40 skeleton" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full skeleton" />
                  <div className="h-3 w-3/4 skeleton" />
                </div>
                <div className="h-8 w-16 skeleton" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Products will appear here once the AI discovers and ranks affiliate opportunities."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" aria-hidden="true" />
          Top Performing Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className={cn(
                  'rounded-lg border bg-card p-4 transition-all duration-200',
                  'hover:shadow-md hover:border-primary/50 cursor-pointer'
                )}
                onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Rank Badge */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm',
                      index === 0 && 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                      index === 1 && 'bg-gray-400/20 text-gray-700 dark:text-gray-400',
                      index === 2 && 'bg-orange-600/20 text-orange-700 dark:text-orange-400',
                      index > 2 && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1 truncate">{product.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatCurrency(product.revenue)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatNumber(product.clicks)} clicks</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{product.conversions} conversions</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          product.roi > 150 && 'bg-success',
                          product.roi > 100 && product.roi <= 150 && 'bg-warning',
                          product.roi <= 100 && 'bg-primary'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((product.roi / 200) * 100, 100)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                      />
                    </div>
                  </div>

                  {/* ROI Badge */}
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-sm font-bold',
                        product.roi > 150 && 'text-success',
                        product.roi > 100 && product.roi <= 150 && 'text-warning',
                        product.roi <= 100 && 'text-primary'
                      )}
                    >
                      {formatPercent(product.roi)}
                    </div>
                    <div className="text-xs text-muted-foreground">ROI</div>
                  </div>

                  {/* Expand Icon */}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-200',
                      expandedId === product.id && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedId === product.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs mb-1">Performance Score</div>
                          <div className="font-semibold">{product.score.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs mb-1">Conv. Rate</div>
                          <div className="font-semibold">
                            {((product.conversions / product.clicks) * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
