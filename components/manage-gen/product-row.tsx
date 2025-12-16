"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { StatusBadge } from "./status-badge";
import { LineArtLink } from "./line-art-link";
import { Product, GenerationStatus } from "@/lib/types";

interface ProductRowProps {
  product: Product;
  selected: boolean;
  status?: GenerationStatus;
  statusLoading: boolean;
  isGenerating: boolean;
  onSelectToggle: () => void;
  onGenerate: () => void;
  onPreview: () => void;
}

export function ProductRow({
  product,
  selected,
  status,
  statusLoading,
  isGenerating,
  onSelectToggle,
  onGenerate,
  onPreview,
}: ProductRowProps) {
  const images = product.images?.gallery || [];
  const lineArt = product.attachments?.line_art || [];
  const canPreview = status?.exists && status.branding && status.branding.length > 0;

  return (
    <TableRow className={selected ? "bg-zinc-50" : ""}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onSelectToggle}
          aria-label={`Select ${product.id}`}
        />
      </TableCell>
      <TableCell className="font-mono text-sm">{product.id}</TableCell>
      <TableCell>
        <ImageGallery images={images} />
      </TableCell>
      <TableCell>
        <LineArtLink urls={lineArt} />
      </TableCell>
      <TableCell>
        <StatusBadge
          status={status}
          loading={statusLoading}
          isGenerating={isGenerating}
          onClick={canPreview ? onPreview : undefined}
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={status?.exists ? "outline" : "default"}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Generating
            </>
          ) : status?.exists ? (
            "Regenerate"
          ) : (
            "Generate"
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
