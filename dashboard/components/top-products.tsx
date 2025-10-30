import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  score: number;
  revenue: number;
  clicks: number;
  conversions: number;
  roi: number;
}

interface TopProductsProps {
  products: Product[];
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Top Performing Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center">
              <div className="flex-1 space-y-1">
                <div className="flex items-center">
                  <span className="font-medium text-sm mr-2">#{index + 1}</span>
                  <p className="text-sm font-medium leading-none">{product.title}</p>
                </div>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{formatCurrency(product.revenue)} revenue</span>
                  <span>{formatNumber(product.clicks)} clicks</span>
                  <span>{product.conversions} conversions</span>
                </div>
              </div>
              <div className="ml-auto font-medium">
                <div className="text-right">
                  <div className="text-sm font-bold">{formatPercent(product.roi)}</div>
                  <div className="text-xs text-muted-foreground">ROI</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
