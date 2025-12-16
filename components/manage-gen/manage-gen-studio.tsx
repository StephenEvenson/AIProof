"use client";

import { useState, useEffect, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { SupplierSelector } from "./supplier-selector";
import { ProductTable } from "./product-table";
import { BatchActionBar } from "./batch-action-bar";
import { PreviewDialog } from "./preview-dialog";
import {
  Product,
  GenerationStatus,
  ProductListResponse,
  GenerationCheckResponse,
  BrandingResult,
  SUPPLIERS,
  PAGE_SIZE_OPTIONS,
  PageSize,
} from "@/lib/types";

export function ManageGenStudio() {
  // Core data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Supplier selection
  const [selectedSupplier, setSelectedSupplier] = useState(SUPPLIERS[0].value);

  // Selection state (for batch operations)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generation status (async loaded)
  const [generationStatus, setGenerationStatus] = useState<
    Map<string, GenerationStatus>
  >(new Map());
  const [statusLoading, setStatusLoading] = useState(false);

  // Generating state (track which products are currently being generated)
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Preview modal state
  const [previewProduct, setPreviewProduct] = useState<{
    productId: string;
    branding: BrandingResult[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Lambda URL
  const lambdaUrl =
    process.env.NEXT_PUBLIC_LAMBDA_URL || "https://api.openpromo.io/v1/mockup";

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set()); // Clear selection on new fetch

    try {
      const response = await fetch(
        `/api/product-form?supplier_id=${selectedSupplier}&page=${currentPage}&page_size=${pageSize}`
      );
      const data: ProductListResponse = await response.json();

      if (data.code === 0) {
        setProducts(data.data || []);
        setTotalItems(data.total_item);
        setTotalPages(data.total_pages);

        // Trigger async status check after products loaded
        if (data.data && data.data.length > 0) {
          checkGenerationStatus(data.data.map((p) => p.id));
        }
      } else {
        setError(data.message || "Failed to fetch products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier, currentPage, pageSize]);

  // Check generation status for products
  const checkGenerationStatus = async (productIds: string[]) => {
    if (productIds.length === 0) return;

    setStatusLoading(true);

    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: lambdaUrl,
          action: "get_line_product_image",
          product_ids: productIds,
        }),
      });

      const data = await response.json();
      let parsed = data;
      if (data.body && typeof data.body === "string") {
        parsed = JSON.parse(data.body);
      }

      if (parsed.success) {
        const statusMap = new Map<string, GenerationStatus>();

        // Mark found products as having generation
        for (const result of parsed.data.results || []) {
          statusMap.set(result.product_id, {
            exists: true,
            created_at: result.created_at,
            branding: result.branding,
          });
        }

        // Mark unfound products as not generated
        for (const id of productIds) {
          if (!statusMap.has(id)) {
            statusMap.set(id, { exists: false });
          }
        }

        setGenerationStatus((prev) => {
          const newMap = new Map(prev);
          statusMap.forEach((value, key) => newMap.set(key, value));
          return newMap;
        });
      }
    } catch (err) {
      console.error("Failed to check generation status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Trigger generation for products
  const generateLineProductImage = async (
    productIds: string[],
    forceRegenerate = false
  ) => {
    // Add to generating state
    setGeneratingIds((prev) => {
      const newSet = new Set(prev);
      productIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: lambdaUrl,
          action: "gen_line_product_image",
          product_ids: productIds,
          force_regenerate: forceRegenerate,
        }),
      });

      const data = await response.json();
      let parsed = data;
      if (data.body && typeof data.body === "string") {
        parsed = JSON.parse(data.body);
      }

      if (parsed.success) {
        // Refresh status after generation
        await checkGenerationStatus(productIds);
        return { success: true, data: parsed.data };
      } else {
        return { success: false, error: parsed.error || parsed.message };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Generation failed",
      };
    } finally {
      // Remove from generating state
      setGeneratingIds((prev) => {
        const newSet = new Set(prev);
        productIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Handle single product generation
  const handleGenerate = async (productId: string) => {
    await generateLineProductImage([productId]);
  };

  // Handle batch generation
  const handleBatchGenerate = async () => {
    if (selectedIds.size === 0) return;
    await generateLineProductImage(Array.from(selectedIds));
    setSelectedIds(new Set()); // Clear selection after batch
  };

  // Handle selection toggle
  const handleSelectToggle = (productId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(products.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle preview
  const handlePreview = (productId: string) => {
    const status = generationStatus.get(productId);
    if (status?.exists && status.branding) {
      setPreviewProduct({
        productId,
        branding: status.branding,
      });
      setPreviewOpen(true);
    }
  };

  // Handle supplier change
  const handleSupplierChange = (value: string) => {
    setSelectedSupplier(value);
    setCurrentPage(1); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  // Initial fetch and on dependency changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center shadow-sm">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Line Product Image Manager
            </h1>
          </div>

          {/* Supplier Selector */}
          <SupplierSelector
            value={selectedSupplier}
            onChange={handleSupplierChange}
          />
        </header>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Product Table */}
          <div className="flex-1 min-h-0 overflow-auto border border-zinc-200 rounded-lg">
            <ProductTable
              products={products}
              loading={loading}
              selectedIds={selectedIds}
              generationStatus={generationStatus}
              statusLoading={statusLoading}
              generatingIds={generatingIds}
              onSelectToggle={handleSelectToggle}
              onSelectAll={handleSelectAll}
              onGenerate={handleGenerate}
              onPreview={handlePreview}
            />
          </div>

          {/* Bottom Action Bar */}
          <BatchActionBar
            selectedCount={selectedIds.size}
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onBatchGenerate={handleBatchGenerate}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isGenerating={generatingIds.size > 0}
          />
        </div>

        {/* Preview Dialog */}
        <PreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          productId={previewProduct?.productId || ""}
          branding={previewProduct?.branding || []}
        />
      </div>
    </div>
  );
}
