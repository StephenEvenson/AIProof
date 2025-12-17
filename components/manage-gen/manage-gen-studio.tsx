"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { SupplierSelector } from "./supplier-selector";
import { ProductTable } from "./product-table";
import { BatchActionBar } from "./batch-action-bar";
import { PreviewDialog } from "./preview-dialog";
import {
  Product,
  GenerationStatus,
  ProductListResponse,
  BrandingResult,
  SUPPLIERS,
  PAGE_SIZE_OPTIONS,
  PageSize,
  GenerationTask,
  TaskStatusType,
  TASK_POLLING_INTERVAL,
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

  // Active tasks state (for async processing)
  const [activeTasks, setActiveTasks] = useState<Map<string, GenerationTask>>(
    new Map()
  );

  // Pending generations state - tracks product IDs that are being submitted (before API response)
  const [pendingGenerations, setPendingGenerations] = useState<Set<string>>(
    new Set()
  );

  // Generating state - computed from pendingGenerations and activeTasks
  const generatingIds = new Set<string>();
  // Include pending submissions (button clicked but API not yet responded)
  pendingGenerations.forEach((id) => generatingIds.add(id));
  // Include active tasks (API responded, task in progress)
  activeTasks.forEach((task) => {
    if (task.status === "pending" || task.status === "processing") {
      task.productIds.forEach((id) => generatingIds.add(id));
    }
  });

  // Polling intervals ref
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  // Check task status via check_task action
  const checkTaskStatus = async (taskId: string): Promise<TaskStatusType | null> => {
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: lambdaUrl,
          action: "check_task",
          task_id: taskId,
        }),
      });

      const data = await response.json();
      let parsed = data;
      if (data.body && typeof data.body === "string") {
        parsed = JSON.parse(data.body);
      }

      if (parsed.success && parsed.data) {
        return parsed.data.status as TaskStatusType;
      }
      return null;
    } catch (err) {
      console.error("Failed to check task status:", err);
      return null;
    }
  };

  // Start polling for a task
  const startPolling = (taskId: string, productIds: string[]) => {
    // Clear existing interval if any
    const existingInterval = pollingIntervalsRef.current.get(taskId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new polling interval
    const intervalId = setInterval(async () => {
      const status = await checkTaskStatus(taskId);

      if (status) {
        // Update task status
        setActiveTasks((prev) => {
          const newMap = new Map(prev);
          const task = newMap.get(taskId);
          if (task) {
            newMap.set(taskId, { ...task, status });
          }
          return newMap;
        });

        // If completed or failed, stop polling and refresh status
        if (status === "completed" || status === "failed") {
          clearInterval(intervalId);
          pollingIntervalsRef.current.delete(taskId);

          // Remove task from active tasks after a short delay
          setTimeout(() => {
            setActiveTasks((prev) => {
              const newMap = new Map(prev);
              newMap.delete(taskId);
              return newMap;
            });
          }, 1000);

          // Refresh generation status for affected products
          if (status === "completed") {
            await checkGenerationStatus(productIds);
          }
        }
      }
    }, TASK_POLLING_INTERVAL);

    pollingIntervalsRef.current.set(taskId, intervalId);
  };

  // Submit generation task (async)
  const submitGenerationTask = async (
    productIds: string[],
    forceRegenerate = false
  ): Promise<{ success: boolean; taskId?: string; error?: string }> => {
    // Immediately add to pending state for instant button disable
    setPendingGenerations((prev) => {
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

      if (parsed.success && parsed.data?.task_id) {
        const taskId = parsed.data.task_id;

        // Remove from pending (will be tracked by activeTasks now)
        setPendingGenerations((prev) => {
          const newSet = new Set(prev);
          productIds.forEach((id) => newSet.delete(id));
          return newSet;
        });

        // Add to active tasks
        const newTask: GenerationTask = {
          taskId,
          productIds,
          status: "pending",
          startedAt: new Date(),
        };
        setActiveTasks((prev) => {
          const newMap = new Map(prev);
          newMap.set(taskId, newTask);
          return newMap;
        });

        // Start polling for this task
        startPolling(taskId, productIds);

        return { success: true, taskId };
      } else {
        // Remove from pending on failure
        setPendingGenerations((prev) => {
          const newSet = new Set(prev);
          productIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
        return {
          success: false,
          error: parsed.error || parsed.message || "Failed to submit task",
        };
      }
    } catch (err) {
      // Remove from pending on error
      setPendingGenerations((prev) => {
        const newSet = new Set(prev);
        productIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to submit task",
      };
    }
  };

  // Handle single product generation
  const handleGenerate = async (productId: string, forceRegenerate = false) => {
    const result = await submitGenerationTask([productId], forceRegenerate);
    if (!result.success) {
      console.error("Generation failed:", result.error);
    }
  };

  // Handle batch generation
  const handleBatchGenerate = async () => {
    if (selectedIds.size === 0) return;
    const result = await submitGenerationTask(Array.from(selectedIds));
    if (result.success) {
      setSelectedIds(new Set()); // Clear selection after batch
    } else {
      console.error("Batch generation failed:", result.error);
    }
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

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      pollingIntervalsRef.current.clear();
    };
  }, []);

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

          {/* Active Tasks Indicator */}
          {activeTasks.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <p className="text-sm">
                {activeTasks.size} task{activeTasks.size !== 1 ? "s" : ""} in progress...
              </p>
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
