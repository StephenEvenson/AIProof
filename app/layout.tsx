
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for premium look
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Product Branding Studio",
  description: "Generate product logo previews instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-foreground`}>
        {children}
      </body>
    </html>
  );
}
