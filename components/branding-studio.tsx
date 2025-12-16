"use client";

import { useState, useEffect } from "react";
import { ProductPreview } from "@/components/product-preview";
import { BrandingForm } from "@/components/branding-form";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define Types
export type BrandingOption = {
    origin_image: string;
    color: string;
    branding_method: string;
    branding_area: string;
    line_product_image: string;
};

export type ProductData = {
    product_id: string;
    branding: BrandingOption[];
};

interface BrandingStudioProps {
    initialProductId?: string;
}

export function BrandingStudio({ initialProductId }: BrandingStudioProps) {
    const [productData, setProductData] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedBranding, setSelectedBranding] = useState<BrandingOption | null>(null);
    const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

    // Lambda URL from Env or Default
    const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_URL || "https://api.openpromo.io/v1/mockup";
    const [error, setError] = useState<string | null>(null);

    const fetchProductOptions = async () => {
        if (!lambdaUrl || !initialProductId) return;
        setLoading(true);
        setError(null);
        try {
            // Use Proxy to bypass CORS
            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUrl: lambdaUrl,
                    action: "get_line_product_image",
                    product_ids: [initialProductId]
                }),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            let parsedData = data;
            if (data.body && typeof data.body === 'string') {
                parsedData = JSON.parse(data.body);
            }

            if (parsedData.success && parsedData.data.results.length > 0) {
                const product = parsedData.data.results[0];
                setProductData(product);
                if (product.branding.length > 0) {
                    setSelectedBranding(product.branding[0]);
                }
            } else {
                console.error("No product data found or success=false", parsedData);
                setError("API returned success=false or no data. Check console.");
            }
        } catch (err) {
            console.error("Failed to fetch product options", err);
            setError(err instanceof Error ? err.message : "Using Unknown Error");
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch on mount or when product ID changes
    useEffect(() => {
        if (initialProductId) {
            fetchProductOptions();
        }
    }, [initialProductId]);

    const handleBrandingChange = (option: BrandingOption) => {
        setSelectedBranding(option);
        setGeneratedPreview(null);
    };

    const handlePreviewGenerated = (url: string) => {
        setGeneratedPreview(url);
    };

    return (
        <div className="min-h-screen bg-white text-zinc-900">
            <div className="max-w-[1600px] mx-auto px-6 py-6 h-screen flex flex-col">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center shadow-sm">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Branding Studio</h1>
                    </div>
                </header>

                {/* Content Area */}
                {!initialProductId ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-white border border-zinc-200 rounded-2xl shadow-sm p-12 text-center">
                        <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="h-8 w-8 text-zinc-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Welcome to Branding Studio</h2>
                        <p className="text-zinc-500 max-w-md">
                            Please select a product to begin. You can access a product by adding its ID to the URL (e.g., <code>/pb_au_T156</code>).
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                        {/* Left Panel: Preview */}
                        <div className="lg:col-span-7 h-full min-h-0">
                            <ProductPreview
                                productData={productData}
                                selectedBranding={selectedBranding}
                                generatedPreview={generatedPreview}
                            />
                        </div>

                        {/* Right Panel: Controls */}
                        <div className="lg:col-span-5 h-full min-h-0">
                            {loading ? (
                                <div className="h-full flex items-center justify-center border border-dashed border-zinc-200 rounded-xl bg-white/50">
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-4 w-32 bg-zinc-200 rounded mb-2"></div>
                                        <div className="text-zinc-400 text-sm">Loading Options...</div>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="h-full flex items-center justify-center border border-red-100 rounded-xl bg-red-50/50">
                                    <div className="text-center p-6 text-red-600">
                                        <p className="mb-2 font-semibold">Error Loading Data</p>
                                        <p className="text-sm text-red-500">{error}</p>
                                        <Button onClick={fetchProductOptions} variant="outline" className="mt-4 border-red-200 text-red-600 hover:bg-red-100">Retry</Button>
                                    </div>
                                </div>
                            ) : productData ? (
                                <BrandingForm
                                    productData={productData}
                                    selectedBranding={selectedBranding}
                                    onBrandingChange={handleBrandingChange}
                                    onPreviewGenerated={handlePreviewGenerated}
                                    lambdaUrl={lambdaUrl}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-900/50">
                                    <div className="text-center p-6">
                                        <p className="text-zinc-400 mb-4">No product data loaded.</p>
                                        <Button onClick={fetchProductOptions} variant="secondary">Fetch Product Data</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
