export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  category: Category;
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  createdAt?: string;
  readTime: number;
  featured: boolean;
  image: string;
  tags: string[];
  product?: {
    imageUrl?: string;
    category?: string;
  };
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  count?: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ArticlesResponse {
  data: Article[];
  meta: PaginationMeta;
}
