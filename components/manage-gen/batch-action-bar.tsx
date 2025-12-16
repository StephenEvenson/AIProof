"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { PAGE_SIZE_OPTIONS, PageSize } from "@/lib/types";

interface BatchActionBarProps {
  selectedCount: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  onBatchGenerate: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  isGenerating: boolean;
}

export function BatchActionBar({
  selectedCount,
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onBatchGenerate,
  onPageChange,
  onPageSizeChange,
  isGenerating,
}: BatchActionBarProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between py-4 px-2 border-t border-zinc-200 bg-white mt-4">
      {/* Left: Batch Actions */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBatchGenerate}
          disabled={selectedCount === 0 || isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Selected ({selectedCount})
            </>
          )}
        </Button>

        {selectedCount > 0 && (
          <span className="text-sm text-zinc-500">
            {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {/* Right: Pagination */}
      <div className="flex items-center gap-4">
        {/* Total Count */}
        <span className="text-sm text-zinc-500">
          {totalItems.toLocaleString()} product{totalItems !== 1 ? "s" : ""}
        </span>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Show:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as PageSize)}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-zinc-700 min-w-[100px] text-center">
            Page {currentPage} of {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
