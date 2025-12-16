"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPLIERS } from "@/lib/types";

interface SupplierSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SupplierSelector({ value, onChange }: SupplierSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500">Supplier:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select supplier" />
        </SelectTrigger>
        <SelectContent>
          {SUPPLIERS.map((supplier) => (
            <SelectItem key={supplier.value} value={supplier.value}>
              {supplier.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
