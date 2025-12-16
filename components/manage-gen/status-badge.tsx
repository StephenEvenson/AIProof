"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Circle, Loader2, AlertCircle, Eye } from "lucide-react";
import { GenerationStatus } from "@/lib/types";

interface StatusBadgeProps {
  status?: GenerationStatus;
  loading: boolean;
  isGenerating: boolean;
  onClick?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function StatusBadge({
  status,
  loading,
  isGenerating,
  onClick,
}: StatusBadgeProps) {
  if (isGenerating) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating...
      </Badge>
    );
  }

  if (loading && !status) {
    return <Skeleton className="h-5 w-20" />;
  }

  if (!status || !status.exists) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Circle className="h-3 w-3" />
        Not Generated
      </Badge>
    );
  }

  const timeText = status.created_at
    ? formatRelativeTime(status.created_at)
    : "";

  return (
    <Badge
      variant="secondary"
      className={`bg-green-100 text-green-700 gap-1 ${onClick ? "cursor-pointer hover:bg-green-200" : ""}`}
      onClick={onClick}
    >
      <CheckCircle className="h-3 w-3" />
      Generated
      {timeText && <span className="text-green-600 text-xs">({timeText})</span>}
      {onClick && <Eye className="h-3 w-3 ml-1" />}
    </Badge>
  );
}
