import type { Audit, Product } from './types';
const read = <T,>(key:string, fallback:T):T => { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } };
export const demoProducts:Product[] = [
 {id:'p1',sku:'SH-001',name:'Classic Cotton Shirt',category:'Clothing',brand:'Northline',variant:'Blue / M',expected:42,unit:'pcs'},
 {id:'p2',sku:'SH-002',name:'Classic Cotton Shirt',category:'Clothing',brand:'Northline',variant:'White / L',expected:28,unit:'pcs'},
 {id:'p3',sku:'PT-001',name:'Slim Fit Trousers',category:'Clothing',brand:'Urban Form',variant:'Black / 32',expected:31,unit:'pcs'},
 {id:'p4',sku:'SN-010',name:'Everyday Sneakers',category:'Footwear',brand:'Stride',variant:'White / 8',expected:16,unit:'pairs'},
 {id:'p5',sku:'BT-004',name:'Leather Belt',category:'Accessories',brand:'Urban Form',variant:'Brown / M',expected:20,unit:'pcs'},
];
export const getProducts=()=>read<Product[]>('rsa_products',demoProducts);
export const saveProducts=(v:Product[])=>localStorage.setItem('rsa_products',JSON.stringify(v));
export const getAudits=()=>read<Audit[]>('rsa_audits',[]);
export const saveAudits=(v:Audit[])=>localStorage.setItem('rsa_audits',JSON.stringify(v));
