import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Rocky Companion",
  description:
    "Child safety monitoring — pulse, motion, and audio signals turned into actionable parent alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased text-slate-700 relative min-h-screen bg-transparent overflow-x-hidden`}>
        {/* Colorful Blurred Background Layer */}
        <div
          className="fixed inset-0 z-[1] bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/background.jpg')",
            filter: 'blur(36px) saturate(350%) contrast(120%)',
            opacity: 0.1,
            transform: 'scale(1.2)', // To prevent blurry edges from bleeding inwards
          }}
        />

        {/* Grainy Paper Texture Layer overlaying the colors */}
        <div className="fixed inset-0 z-[2] bg-paper pointer-events-none mix-blend-multiply opacity-70" />

        {/* Ensure content stays above */}
        <div className="relative z-[10]">
          {children}
        </div>
      </body>
    </html>
  );
}
