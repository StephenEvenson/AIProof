
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Allow up to 5 minutes

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUrl, ...payload } = body;

        if (!targetUrl) {
            return NextResponse.json(
                { error: "targetUrl is required" },
                { status: 400 }
            );
        }

        // Forward the request to the target URL with a long timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // Try to read error body
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Upstream error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Proxy error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
