"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductRow } from "./product-row";
import { Product, GenerationStatus } from "@/lib/types";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  selectedIds: Set<string>;
  generationStatus: Map<string, GenerationStatus>;
  statusLoading: boolean;
  generatingIds: Set<string>;
  onSelectToggle: (productId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onGenerate: (productId: string, forceRegenerate: boolean) => void;
  onPreview: (productId: string) => void;
}

export function ProductTable({
  products,
  loading,
  selectedIds,
  generationStatus,
  statusLoading,
  generatingIds,
  onSelectToggle,
  onSelectAll,
  onGenerate,
  onPreview,
}: ProductTableProps) {
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id));

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <p>No products found for this supplier</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-zinc-50 z-10">
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              aria-label="Select all"
              className={someSelected && !allSelected ? "opacity-50" : ""}
            />
          </TableHead>
          <TableHead className="w-40">Product ID</TableHead>
          <TableHead className="w-64">Images</TableHead>
          <TableHead className="w-24">Line Art</TableHead>
          <TableHead className="w-32">Status</TableHead>
          <TableHead className="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            selected={selectedIds.has(product.id)}
            status={generationStatus.get(product.id)}
            statusLoading={statusLoading}
            isGenerating={generatingIds.has(product.id)}
            onSelectToggle={() => onSelectToggle(product.id)}
            onGenerate={() => onGenerate(product.id, generationStatus.get(product.id)?.exists ?? false)}
            onPreview={() => onPreview(product.id)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
