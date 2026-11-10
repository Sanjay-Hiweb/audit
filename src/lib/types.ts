export type Product = { id:string; sku:string; name:string; category:string; brand:string; variant:string; expected:number; unit:string };
export type Count = { productId:string; quantity:number; countedBy:string; countedAt:string; note?:string };
export type Audit = { id:string; name:string; code:string; status:'In progress'|'Review'|'Approved'; createdAt:string; counts:Count[] };
