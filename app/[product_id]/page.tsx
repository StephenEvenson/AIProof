import { BrandingStudio } from "@/components/branding-studio";

interface PageProps {
    params: Promise<{
        product_id: string;
    }>;
}

export default async function ProductPage({ params }: PageProps) {
    const resolvedParams = await params;
    return <BrandingStudio initialProductId={resolvedParams.product_id} />;
}
