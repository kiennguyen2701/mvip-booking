import "./globals.css";
import type { Metadata, Viewport } from "next";
import Header from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Mvip Booking",
  description: "Premium booking platform",

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className="overflow-x-hidden">
      <body className="min-h-screen overflow-x-hidden bg-[#080704] text-white antialiased">
        <div className="relative w-full max-w-full overflow-x-hidden">
          <Header />

          <main className="relative w-full max-w-full overflow-x-hidden">
            {children}
          </main>

          <Footer />
        </div>
      </body>
    </html>
  );
}