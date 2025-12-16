"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProductImage } from "@/lib/types";

interface ImageGalleryProps {
  images: ProductImage[];
  maxVisible?: number;
}

export function ImageGallery({ images, maxVisible = 3 }: ImageGalleryProps) {
  const [expanded, setExpanded] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex items-center gap-1 text-zinc-400 text-sm">
        <ImageIcon className="h-4 w-4" />
        <span>No images</span>
      </div>
    );
  }

  const visibleImages = expanded ? images : images.slice(0, maxVisible);
  const hasMore = images.length > maxVisible;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 flex-wrap">
        {visibleImages.map((img, index) => (
          <Popover key={index}>
            <PopoverTrigger asChild>
              <button className="relative h-10 w-10 rounded border border-zinc-200 overflow-hidden hover:border-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400">
                <img
                  src={img.sizes?.small || img.url}
                  alt={img.alt_text || `Product image ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1" side="top">
              <img
                src={img.sizes?.medium || img.url}
                alt={img.alt_text || `Product image ${index + 1}`}
                className="max-w-[300px] max-h-[300px] rounded"
              />
            </PopoverContent>
          </Popover>
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />+{images.length - maxVisible}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
