import type { ReactNode } from "react";
import { CartProvider } from "@/providers/cart-provider";
import { ComparisonProvider } from "@/providers/comparison-provider";
import { FavoritesProvider } from "@/providers/favorites-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { generateSeoMetadata } from "@/lib/seo/seo";
import { applyCoreResourceHints } from "@/lib/performance/resource-hints";
import "./globals.css";
export const metadata = generateSeoMetadata({ canonical: "/" });
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  applyCoreResourceHints();
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <ComparisonProvider>
              <CartProvider>{children}</CartProvider>
            </ComparisonProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
