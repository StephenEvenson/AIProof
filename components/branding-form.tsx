import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Wand2 } from "lucide-react";
import type { ProductData, BrandingOption } from "@/components/branding-studio";

interface BrandingFormProps {
    productData: ProductData;
    selectedBranding: BrandingOption | null;
    onBrandingChange: (option: BrandingOption) => void;
    onPreviewGenerated: (base64: string) => void;
    lambdaUrl: string;
}

export function BrandingForm({ productData, selectedBranding, onBrandingChange, onPreviewGenerated, lambdaUrl }: BrandingFormProps) {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extract unique options
    const colors = Array.from(new Set(productData.branding.map(b => b.color)));
    const methods = Array.from(new Set(productData.branding.map(b => b.branding_method)));
    const areas = Array.from(new Set(productData.branding.map(b => b.branding_area)));

    // Progress Simulation Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + (98 / 600); // 98% over 60s (approx 600 ticks of 100ms) - tick speed needs to be higher or step lower
                    // Let's do 1 sec ticks for simplicity or 100ms ticks?
                    // User said "default 60s time... to 98%"
                    // If we update every 1s, step is 98/60 = 1.63%
                    // Let's do 100ms updates for smoothness: 98 / 600 = 0.1633%
                    return next >= 98 ? 98 : next;
                });
            }, 100);
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);

            const reader = new FileReader();
            reader.onload = (ev) => {
                setLogoPreview(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOptionChange = (key: keyof BrandingOption, value: string) => {
        if (!selectedBranding) return;

        // Find the branding option that matches the new criteria
        // We try to keep other selected values if possible
        const targetColor = key === 'color' ? value : selectedBranding.color;
        const targetMethod = key === 'branding_method' ? value : selectedBranding.branding_method;
        const targetArea = key === 'branding_area' ? value : selectedBranding.branding_area;

        const newOption = productData.branding.find(b =>
            b.color === targetColor &&
            b.branding_method === targetMethod &&
            b.branding_area === targetArea
        );

        // If exact match not found, fallback to just matching the changed key and taking first available
        if (newOption) {
            onBrandingChange(newOption);
        } else {
            // Fallback logic
            const fallbackOption = productData.branding.find(b => b[key] === value);
            if (fallbackOption) onBrandingChange(fallbackOption);
        }
    };

    const handleGenerateClick = async () => {
        if (!selectedBranding || !logoFile || !lambdaUrl) return;

        setIsGenerating(true);
        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.onload = async () => {
                const base64String = (reader.result as string).split(',')[1];

                // 1. Submit Task
                const startRes = await fetch("/api/proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        targetUrl: lambdaUrl,
                        action: "gen_logo_product_image",
                        line_product_image: selectedBranding.line_product_image,
                        logo_base64: base64String
                    })
                });

                const startData = await startRes.json();

                let parsedStartData = startData;
                if (startData.body && typeof startData.body === 'string') {
                    parsedStartData = JSON.parse(startData.body);
                }

                if (!parsedStartData.success || !parsedStartData.data?.task_id) {
                    console.error("Task submission failed", parsedStartData);
                    alert("Failed to submit task: " + (parsedStartData.message || "Unknown error"));
                    setIsGenerating(false);
                    return;
                }

                const taskId = parsedStartData.data.task_id;
                console.log("Task submitted, ID:", taskId);

                // 2. Poll for Result
                const pollInterval = setInterval(async () => {
                    try {
                        const pollRes = await fetch("/api/proxy", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                targetUrl: lambdaUrl,
                                action: "get_logo_product_image",
                                task_id: taskId
                            })
                        });

                        const pollData = await pollRes.json();
                        let parsedPollData = pollData;
                        if (pollData.body && typeof pollData.body === 'string') {
                            parsedPollData = JSON.parse(pollData.body);
                        }

                        if (parsedPollData.success) {
                            const status = parsedPollData.data.status;
                            if (status === 'completed') {
                                clearInterval(pollInterval);
                                onPreviewGenerated(parsedPollData.data.logo_product_image);
                                setIsGenerating(false);
                            } else if (status === 'failed') {
                                clearInterval(pollInterval);
                                alert("Generation failed: " + parsedPollData.data.error);
                                setIsGenerating(false);
                            }
                            // If processing/pending, continue polling
                        } else {
                            console.warn("Polling error or task not found", parsedPollData);
                        }
                    } catch (e) {
                        console.error("Polling network error", e);
                    }
                }, 3000); // Poll every 3 seconds

            };
            reader.readAsDataURL(logoFile);
        } catch (e) {
            console.error(e);
            setIsGenerating(false);
            alert("Error during generation");
        }
    };

    return (
        <Card className="h-full bg-white border border-zinc-100 shadow-none flex flex-col rounded-2xl">
            <CardHeader className="pb-4 border-b border-zinc-100">
                <CardTitle className="text-xl text-zinc-900">Configuration</CardTitle>
                <CardDescription className="text-zinc-500">Select options and upload your logo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 overflow-y-auto pt-6">

                <div className="grid grid-cols-3 gap-4">
                    {/* Colors */}
                    <div className="space-y-2">
                        <Label className="text-zinc-700">Product Color</Label>
                        <Select
                            value={selectedBranding?.color}
                            onValueChange={(val) => handleOptionChange('color', val)}
                        >
                            <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 focus:ring-black">
                                <SelectValue placeholder="Select Color" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                                {colors.map(c => <SelectItem key={c} value={c} className="hover:bg-zinc-50 focus:bg-zinc-50">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Branding Method */}
                    <div className="space-y-2">
                        <Label className="text-zinc-700">Branding Method</Label>
                        <Select
                            value={selectedBranding?.branding_method}
                            onValueChange={(val) => handleOptionChange('branding_method', val)}
                        >
                            <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 focus:ring-black">
                                <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                                {methods.map(m => <SelectItem key={m} value={m} className="hover:bg-zinc-50 focus:bg-zinc-50">{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Branding Area */}
                    <div className="space-y-2">
                        <Label className="text-zinc-700">Branding Area</Label>
                        <Select
                            value={selectedBranding?.branding_area}
                            onValueChange={(val) => handleOptionChange('branding_area', val)}
                        >
                            <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 focus:ring-black">
                                <SelectValue placeholder="Select Area" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                                {areas.map(a => <SelectItem key={a} value={a} className="hover:bg-zinc-50 focus:bg-zinc-50">{a}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="my-6 border-t border-zinc-100"></div>

                {/* Logo Upload */}
                <div className="space-y-4">
                    <Label className="text-zinc-700">Logo Upload</Label>

                    <div
                        className="border-2 border-dashed border-zinc-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-zinc-50 transition-colors bg-zinc-50/50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {logoPreview ? (
                            <div className="relative w-32 h-32">
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="text-center text-zinc-400">
                                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                                <span className="text-sm">Click to upload logo</span>
                            </div>
                        )}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    {logoFile && <p className="text-xs text-zinc-500 text-center font-medium bg-zinc-100 py-1 px-2 rounded-full inline-block mx-auto">{logoFile.name}</p>}
                </div>

            </CardContent>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
                {isGenerating ? (
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between text-xs text-zinc-500 font-medium">
                            <span>Generating Preview...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-4 bg-zinc-200 w-full rounded-full" />
                    </div>
                ) : (
                    <Button
                        className="w-full bg-black hover:bg-zinc-800 text-white font-medium py-6 rounded-xl shadow-lg shadow-zinc-200 transition-all hover:shadow-xl"
                        size="lg"
                        onClick={handleGenerateClick}
                        disabled={!logoFile || !selectedBranding}
                    >
                        <Wand2 className="mr-2 h-5 w-5" />
                        Generate Preview
                    </Button>
                )}
            </div>
        </Card>
    );
}
