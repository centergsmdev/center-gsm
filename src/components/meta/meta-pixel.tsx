"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { trackMetaEvent } from "@/lib/meta/browser";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
const validPixelId = /^\d{5,30}$/.test(pixelId);

export function MetaPixel() {
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previous = useRef("");
  const route = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (!validPixelId || !loaded || previous.current === route) return;
    previous.current = route;
    trackMetaEvent("PageView");
  }, [loaded, route]);

  if (!validPixelId) return null;
  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      onLoad={() => setLoaded(true)}
    >
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`}
    </Script>
  );
}
