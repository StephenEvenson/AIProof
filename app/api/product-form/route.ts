import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplier_id = searchParams.get("supplier_id");
  const page = searchParams.get("page") || "1";
  const page_size = searchParams.get("page_size") || "100";

  if (!supplier_id) {
    return NextResponse.json(
      { error: "supplier_id is required" },
      { status: 400 }
    );
  }

  const lambdaUrl = process.env.PRODUCT_FORM_LAMBDA_URL;
  if (!lambdaUrl) {
    return NextResponse.json(
      { error: "PRODUCT_FORM_LAMBDA_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `${lambdaUrl}?supplier_id=${encodeURIComponent(supplier_id)}&page=${page}&page_size=${page_size}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Product form API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
