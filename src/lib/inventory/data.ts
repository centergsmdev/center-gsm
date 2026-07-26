import { createClient } from "@/lib/supabase/client";
export async function getProductAvailableStock(productId:string){const client=createClient();if(!client)return{data:null,error:false};const result=await client.from("product_available_stock").select("*").eq("product_id",productId).maybeSingle();return result.error?{data:null,error:true}:{data:result.data?.available_stock??0,error:false};}
