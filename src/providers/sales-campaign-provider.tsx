"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  campaignMatchesProduct,
  isCampaignCurrent,
} from "@/lib/sales-campaigns";
import type { CatalogProduct } from "@/types/product";
import type { SalesCampaign } from "@/types/sales-campaign";

type ContextValue = { campaigns: SalesCampaign[]; now: number };
const SalesCampaignContext = createContext<ContextValue>({
  campaigns: [],
  now: 0,
});

export function SalesCampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const client = createClient();
    void client
      ?.from("sales_campaigns")
      .select("*")
      .then(({ data }) => setCampaigns(data ?? []));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = useMemo(
    () => campaigns.filter((campaign) => isCampaignCurrent(campaign, now)),
    [campaigns, now],
  );
  return (
    <SalesCampaignContext.Provider value={{ campaigns: current, now }}>
      {children}
    </SalesCampaignContext.Provider>
  );
}

export function useSalesCampaigns() {
  return useContext(SalesCampaignContext);
}

export function useProductSalesCampaign(product: CatalogProduct) {
  const { campaigns, now } = useSalesCampaigns();
  return {
    campaign: campaigns.find((item) => campaignMatchesProduct(item, product)),
    now,
  };
}
