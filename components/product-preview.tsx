import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

import type { ProductData, BrandingOption } from "@/components/branding-studio";

interface ProductPreviewProps {
    productData: ProductData | null;
    selectedBranding: BrandingOption | null;
    generatedPreview: string | null;
}

export function ProductPreview({ productData, selectedBranding, generatedPreview }: ProductPreviewProps) {
    // Determine the image to show if no generated preview
    // Priority: selectedBranding line image -> first product branding image -> null
    const baseImage = selectedBranding?.line_product_image || productData?.branding[0]?.origin_image;

    // Helper to download image
    const handleDownload = async () => {
        const imageUrl = generatedPreview
            ? (generatedPreview.startsWith('http') || generatedPreview.startsWith('data:') ? generatedPreview : `data:image/jpeg;base64,${generatedPreview}`)
            : baseImage;

        if (!imageUrl) return;

        try {
            // Fetch the image to create a blob for reliable downloading (avoids cross-origin open-in-tab issues)
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `product-preview-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback for simple opening if fetch fails (e.g. CORS)
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-white border border-zinc-100 shadow-none relative group">

            {/* Main Preview Area */}
            <div className="flex-1 relative w-full h-full flex items-center justify-center bg-zinc-50 p-8">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

                {/* Download Button Overlay */}
                {(generatedPreview || baseImage) && (
                    <div className="absolute top-4 right-4 z-20">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="bg-white/90 text-zinc-700 hover:text-zinc-900 shadow-sm border border-zinc-200 hover:bg-white"
                            onClick={handleDownload}
                            title="Download Image"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {generatedPreview ? (
                    // Generated Preview (URL or Base64)
                    <img
                        src={generatedPreview.startsWith('http') || generatedPreview.startsWith('data:') ? generatedPreview : `data:image/jpeg;base64,${generatedPreview}`}
                        alt="Generated Preview"
                        className="relative z-10 max-h-full max-w-full object-contain rounded-lg shadow-xl"
                    />
                ) : (
                    baseImage ? (
                        <>
                            <img
                                src={baseImage}
                                alt="Product Line Art"
                                className="relative z-10 max-h-full max-w-full object-contain mix-blend-multiply"
                            />
                            {selectedBranding && (
                                <div className="absolute top-4 left-4 flex flex-col gap-1 z-20">
                                    <Badge variant="secondary" className="bg-white/90 text-zinc-900 shadow-sm border-zinc-200">
                                        {selectedBranding?.branding_method}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-white/90 text-zinc-900 shadow-sm border-zinc-200">
                                        {selectedBranding?.branding_area}
                                    </Badge>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-zinc-500">No Image Available</div>
                    )
                )}
            </div>
        </div>
    );
}
