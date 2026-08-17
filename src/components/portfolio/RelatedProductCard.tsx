"use client";

import ProductCard from "./ProductCard";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Product } from "@/types/product";

export default function RelatedProductCard({ product }: { product: Product }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  return (
    <ProductCard
      product={product}
      isBookmarked={isBookmarked(product.id)}
      onToggleBookmark={toggleBookmark}
    />
  );
}
