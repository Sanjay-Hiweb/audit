import type { Product, Audit } from './types';

export const demoProducts: Product[] = [
  {
    id: 'p1',
    business_id: 'demo',
    sku: 'SH-001',
    name: 'Classic Cotton Shirt',
    category_name: 'Clothing',
    brand: 'Northline',
    unit: 'pcs',
    active: 1,
    variants: [{ id: 'v1', business_id: 'demo', product_id: 'p1', variant_label: 'Blue / M', expected_quantity: 42 }]
  },
  {
    id: 'p2',
    business_id: 'demo',
    sku: 'SH-002',
    name: 'Classic Cotton Shirt',
    category_name: 'Clothing',
    brand: 'Northline',
    unit: 'pcs',
    active: 1,
    variants: [{ id: 'v2', business_id: 'demo', product_id: 'p2', variant_label: 'White / L', expected_quantity: 28 }]
  }
];

export const getProducts = () => demoProducts;
export const saveProducts = (_v: Product[]) => {};
export const getAudits = (): Audit[] => [];
export const saveAudits = (_v: Audit[]) => {};
