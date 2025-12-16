"use client";

import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LineArtLinkProps {
  urls: string[];
}

export function LineArtLink({ urls }: LineArtLinkProps) {
  if (urls.length === 0) {
    return <span className="text-zinc-400 text-sm">-</span>;
  }

  if (urls.length === 1) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => window.open(urls[0], "_blank", "noopener,noreferrer")}
            >
              <FileText className="h-4 w-4 mr-1 text-red-500" />
              PDF
              <ExternalLink className="h-3 w-3 ml-1 text-zinc-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open PDF in new tab</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {urls.map((url, index) => (
        <TooltipProvider key={index}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs justify-start"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              >
                <FileText className="h-3 w-3 mr-1 text-red-500" />
                PDF {index + 1}
                <ExternalLink className="h-2 w-2 ml-1 text-zinc-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open PDF {index + 1} in new tab</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
