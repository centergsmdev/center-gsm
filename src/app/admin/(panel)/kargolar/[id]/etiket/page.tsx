import{ShipmentLabel}from"@/components/admin/shipment-label";export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ShipmentLabel id={id}/>}
