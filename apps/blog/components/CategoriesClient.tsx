'use client';

import CategoryCard from '@/components/CategoryCard';
import { Bot, Sparkles, TrendingUp, Video, BarChart } from 'lucide-react';
import { Category } from '@/lib/types';

const categoryIcons = {
  'ai-automation': Bot,
  'content-strategy': Sparkles,
  'revenue-growth': TrendingUp,
  'platform-optimization': Video,
  'case-studies': BarChart,
};

interface CategoriesClientProps {
  categories: Category[];
}

export default function CategoriesClient({ categories }: CategoriesClientProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => {
        const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Bot;
        return (
          <div
            key={category.id}
            className="animate-scale-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CategoryCard category={category} icon={Icon} />
          </div>
        );
      })}
    </div>
  );
}
