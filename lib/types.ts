// Product from get_product_form API
export interface ProductImage {
  url: string;
  alt_text?: string;
  updated_at?: string;
  sizes?: {
    original?: string;
    large?: string;
    medium?: string;
    small?: string;
  };
}

export interface Product {
  id: string;
  supplier?: {
    id: string;
    name: string;
    region?: string;
  };
  product?: {
    code: string;
    name: string;
    status?: string;
  };
  images?: {
    hero?: string;
    gallery?: ProductImage[];
  };
  attachments?: {
    line_art?: string[];
    videos?: string[];
    size_charts?: string[];
  };
}

// Generation status from get_line_product_image API
export interface BrandingResult {
  origin_image: string;
  color: string;
  branding_method: string;
  branding_area: string;
  line_product_image: string;
}

export interface GenerationStatus {
  exists: boolean;
  created_at?: string;
  branding?: BrandingResult[];
}

// API response types
export interface ProductListResponse {
  api_version: string;
  code: number;
  message: string;
  page: number;
  page_size: number;
  total_item: number;
  total_pages: number;
  data: Product[];
}

export interface GenerationCheckResponse {
  success: boolean;
  action: string;
  message: string;
  data: {
    total: number;
    found: number;
    results: Array<{
      product_id: string;
      supplier_id: string;
      product_code: string;
      branding: BrandingResult[];
      created_at: string;
    }>;
  };
}

export interface GenerationTriggerResponse {
  success: boolean;
  action: string;
  message: string;
  processing_time_seconds: number;
  data: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    results: Array<{
      product_id: string;
      status: string;
      images_generated?: number;
    }>;
    errors?: Array<{
      product_id: string;
      error: string;
    }>;
  };
}

// Supplier options
export interface SupplierOption {
  value: string;
  label: string;
  region?: string;
}

export const SUPPLIERS: SupplierOption[] = [
  { value: 'pb', label: 'PB (AU)', region: 'au' },
  { value: 'pb_nz', label: 'PB (NZ)', region: 'nz' },
  { value: 'intex_au', label: 'Intex (AU)', region: 'au' },
  { value: 'intex_nz', label: 'Intex (NZ)', region: 'nz' },
  { value: 'dex_au', label: 'DEX (AU)', region: 'au' },
  { value: 'dex_nz', label: 'DEX (NZ)', region: 'nz' },
  { value: 'pc', label: 'PC', region: 'au' },
  { value: 'js', label: 'JS', region: 'au' },
];

// Page size options
export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// Task status types for async operations
export type TaskStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskProgress {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
}

export interface TaskStatus {
  task_id: string;
  task_type?: string;
  status: TaskStatusType;
  progress?: TaskProgress;
  results?: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    results: Array<{
      product_id: string;
      status: string;
      images_generated?: number;
    }>;
    errors?: Array<{
      product_id: string;
      error: string;
    }>;
  };
  error?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface TaskSubmitResponse {
  success: boolean;
  status_code?: number;
  message?: string;
  data: {
    task_id: string;
    status: TaskStatusType;
    product_count?: number;
  };
}

export interface TaskCheckResponse {
  success: boolean;
  data: TaskStatus;
}

// Active generation task tracker
export interface GenerationTask {
  taskId: string;
  productIds: string[];
  status: TaskStatusType;
  startedAt: Date;
}

// Polling interval in milliseconds
export const TASK_POLLING_INTERVAL = 10000; // 10 seconds
