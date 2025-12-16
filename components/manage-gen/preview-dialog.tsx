"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { BrandingResult } from "@/lib/types";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  branding: BrandingResult[];
}

export function PreviewDialog({
  open,
  onOpenChange,
  productId,
  branding,
}: PreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (branding.length === 0) {
    return null;
  }

  const current = branding[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < branding.length - 1;

  const handlePrev = () => {
    if (canGoPrev) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (canGoNext) setCurrentIndex(currentIndex + 1);
  };

  const handleDownload = () => {
    if (current?.line_product_image) {
      window.open(current.line_product_image, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Generated Line Product Images - {productId}</span>
            <span className="text-sm font-normal text-zinc-500">
              {currentIndex + 1} / {branding.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Image Display */}
          <div className="relative flex items-center justify-center bg-zinc-100 rounded-lg min-h-[400px]">
            {/* Previous Button */}
            {branding.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 z-10"
                onClick={handlePrev}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Image */}
            <img
              src={current?.line_product_image}
              alt={`Line product image for ${productId}`}
              className="max-h-[400px] max-w-full object-contain rounded"
            />

            {/* Next Button */}
            {branding.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 z-10"
                onClick={handleNext}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Info Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {current?.color && (
                <Badge variant="outline">Color: {current.color}</Badge>
              )}
              {current?.branding_method && (
                <Badge variant="outline">Method: {current.branding_method}</Badge>
              )}
              {current?.branding_area && (
                <Badge variant="outline">Area: {current.branding_area}</Badge>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Open Image
            </Button>
          </div>

          {/* Thumbnail Strip */}
          {branding.length > 1 && (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {branding.map((item, index) => (
                  <button
                    key={index}
                    className={`relative h-16 w-16 rounded border-2 overflow-hidden flex-shrink-0 transition-colors ${
                      index === currentIndex
                        ? "border-zinc-900"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <img
                      src={item.line_product_image}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Original Image Reference */}
          {current?.origin_image && (
            <div className="border-t pt-4">
              <p className="text-sm text-zinc-500 mb-2">Original Image:</p>
              <img
                src={current.origin_image}
                alt="Original product"
                className="h-20 w-20 object-cover rounded border"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
