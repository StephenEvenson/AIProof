import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Wand2 } from "lucide-react";
import type { ProductData, BrandingOption } from "@/components/branding-studio";
import promptPresets from "@/lib/prompt-presets.json";

// Determine colour options based on branding method
// Defined outside component to avoid unnecessary recreations and useEffect dependency issues
const getColourOptions = (method: string): string[] => {
    const lowerMethod = method.toLowerCase();

    // Priority 1: Explicit "per colour" indication (multi-colour)
    if (lowerMethod.includes('per colour') || lowerMethod.includes('per col')) {
        return ['1 Colour', '2 Colours', '3 Colours'];
    }

    // Priority 2: Full Colour methods - contains "full" or specific full-colour methods
    const fullColourKeywords = ['digital transfer', 'full colour transfer', 'dtf', 'uv digital print', 'uv dtf', 'dtg', 'sublimation'];
    if (lowerMethod.includes('full') || fullColourKeywords.some(k => lowerMethod.includes(k))) {
        return ['Full Colour'];
    }

    // Priority 3: Screen/Pad Print (if not already matched by "per colour")
    const multiColourKeywords = ['screen print', 'pad print'];
    if (multiColourKeywords.some(k => lowerMethod.includes(k))) {
        return ['1 Colour', '2 Colours', '3 Colours'];
    }

    // Priority 4: Single Colour methods
    const singleColourKeywords = ['laser', 'deboss', 'emboss', 'foil', 'metal badge'];
    if (lowerMethod.includes('one colour') || lowerMethod.includes('1 colour') ||
        lowerMethod.includes('one col') || lowerMethod.includes('1 col') ||
        singleColourKeywords.some(k => lowerMethod.includes(k))) {
        return ['1 Colour'];
    }

    // Default: Multi-colour options
    return ['1 Colour', '2 Colours', '3 Colours'];
};

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
    const [userPrompt, setUserPrompt] = useState<string>("");
    const [numberOfColours, setNumberOfColours] = useState<string>("");
    const [logoColours, setLogoColours] = useState<Array<{name: string, pms: string, hex: string}>>([]);
    const [isAnalyzingLogo, setIsAnalyzingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extract unique options
    const colors = Array.from(new Set(productData.branding.map(b => b.color)));
    const methods = Array.from(new Set(productData.branding.map(b => b.branding_method)));
    const areas = Array.from(new Set(productData.branding.map(b => b.branding_area)));

    // Auto-select first colour option when branding method changes
    useEffect(() => {
        if (selectedBranding?.branding_method) {
            const options = getColourOptions(selectedBranding.branding_method);
            setNumberOfColours(options[0]);
        }
    }, [selectedBranding?.branding_method]);

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

    const analyzeLogoColours = async (base64String: string) => {
        setIsAnalyzingLogo(true);
        setLogoColours([]);

        try {
            const response = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUrl: lambdaUrl,
                    action: "get_logo_colours",
                    logo_base64: base64String
                })
            });

            const data = await response.json();
            let parsedData = data;
            if (data.body && typeof data.body === 'string') {
                parsedData = JSON.parse(data.body);
            }

            if (parsedData.success && parsedData.data?.colours) {
                setLogoColours(parsedData.data.colours);
            } else {
                console.error("Logo colour analysis failed:", parsedData.message);
            }
        } catch (e) {
            console.error("Logo colour analysis error:", e);
        } finally {
            setIsAnalyzingLogo(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);

            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                setLogoPreview(dataUrl);

                // Extract base64 and analyze colours
                const base64String = dataUrl.split(',')[1];
                analyzeLogoColours(base64String);
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

                // Validate numberOfColours against current branding method
                const validOptions = getColourOptions(selectedBranding.branding_method);
                const validColour = validOptions.includes(numberOfColours) ? numberOfColours : validOptions[0];

                // 1. Submit Task
                const startRes = await fetch("/api/proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        targetUrl: lambdaUrl,
                        action: "gen_logo_product_image",
                        line_product_image: selectedBranding.line_product_image,
                        logo_base64: base64String,
                        user_prompt: userPrompt || undefined,
                        number_of_colours: validColour,
                        branding_method: selectedBranding.branding_method
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
            <CardContent className="space-y-6 flex-1 overflow-y-auto pt-6">

                {/* Logo Upload - MOVED TO TOP */}
                <div className="space-y-2">
                    <Label className="text-zinc-700 font-medium">Logo Upload</Label>
                    <div
                        className="border-2 border-dashed border-zinc-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-zinc-50 transition-colors bg-zinc-50/50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {logoPreview ? (
                            <div className="relative w-20 h-20">
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="text-center text-zinc-400">
                                <Upload className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
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
                    {logoFile && <p className="text-xs text-zinc-500 text-center font-medium bg-zinc-100 py-1 px-2 rounded-full inline-block">{logoFile.name}</p>}
                </div>

                {/* Logo Colours Display */}
                {(isAnalyzingLogo || logoColours.length > 0) && (
                    <div className="space-y-2">
                        <Label className="text-zinc-700 font-medium">Logo Colours</Label>
                        {isAnalyzingLogo ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <div className="w-4 h-4 border-2 border-zinc-300 border-t-black rounded-full animate-spin"></div>
                                <span>Analyzing colours...</span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {logoColours.map((colour, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg"
                                    >
                                        <div
                                            className="w-6 h-6 rounded-md border border-zinc-300 shadow-sm"
                                            style={{ backgroundColor: colour.hex }}
                                        />
                                        <div className="text-xs">
                                            <div className="font-medium text-zinc-700">{colour.name}</div>
                                            <div className="text-zinc-500">{colour.pms} · {colour.hex}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Divider between logo section and product options */}
                <div className="my-2 border-t border-zinc-100"></div>

                {/* Product Color */}
                <div className="space-y-2">
                    <Label className="text-zinc-700 font-medium">Product Colour</Label>
                    <div className="flex flex-wrap gap-2">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => handleOptionChange('color', c)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                    selectedBranding?.color === c
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Branding Method */}
                <div className="space-y-2">
                    <Label className="text-zinc-700 font-medium">Branding Method</Label>
                    <div className="flex flex-wrap gap-2">
                        {methods.map(m => (
                            <button
                                key={m}
                                onClick={() => handleOptionChange('branding_method', m)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                    selectedBranding?.branding_method === m
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Number of Colours - dynamically based on branding method */}
                {selectedBranding?.branding_method && (
                    <div className="space-y-2">
                        <Label className="text-zinc-700 font-medium">Number of Colours</Label>
                        <div className="flex flex-wrap gap-2">
                            {getColourOptions(selectedBranding.branding_method).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setNumberOfColours(option)}
                                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                        numberOfColours === option
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Branding Area */}
                <div className="space-y-2">
                    <Label className="text-zinc-700 font-medium">Branding Area</Label>
                    <div className="flex flex-wrap gap-2">
                        {areas.map(a => (
                            <button
                                key={a}
                                onClick={() => handleOptionChange('branding_area', a)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                    selectedBranding?.branding_area === a
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                                }`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="my-6 border-t border-zinc-100"></div>

                {/* Logo Adjustment (Optional) */}
                <div className="space-y-2">
                    <Label className="text-zinc-700 font-medium">Logo Adjustment (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                        {promptPresets.map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => setUserPrompt(preset.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                    userPrompt === preset.value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
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
