import { Suspense, type ReactNode } from "react";
import { CartProvider } from "@/providers/cart-provider";
import { ComparisonProvider } from "@/providers/comparison-provider";
import { FavoritesProvider } from "@/providers/favorites-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { generateSeoMetadata } from "@/lib/seo/seo";
import { applyCoreResourceHints } from "@/lib/performance/resource-hints";
import { DeferredLiveChat } from "@/components/live-chat/deferred-live-chat";
import { MetaPixel } from "@/components/meta/meta-pixel";
import "./globals.css";
export const metadata = generateSeoMetadata({ canonical: "/" });
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  applyCoreResourceHints();
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <ComparisonProvider>
              <CartProvider>
                {children}
                <DeferredLiveChat />
                <Suspense fallback={null}>
                  <MetaPixel />
                </Suspense>
              </CartProvider>
            </ComparisonProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
