"use client";

import ProductCard from "./ProductCard";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Product } from "@/types/product";

export default function RelatedProductCard({
  product,
  priority = false,
}: {
  product: Product;
  /** Az első (LCP) kártyán preload-olja a képet. */
  priority?: boolean;
}) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  return (
    <ProductCard
      product={product}
      isBookmarked={isBookmarked(product.id)}
      onToggleBookmark={toggleBookmark}
      priority={priority}
    />
  );
}
