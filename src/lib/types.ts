export interface Business {
  id: string;
  name: string;
  business_type?: string;
  role: 'owner' | 'manager';
  branchId?: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  is_default: number;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  parent_id?: string | null;
}

export interface ProductVariant {
  id: string;
  business_id: string;
  product_id: string;
  variant_label: string;
  sku?: string;
  barcode?: string;
  expected_quantity?: number;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  category_name?: string;
  sku?: string;
  name: string;
  brand?: string;
  unit: string;
  active: number;
  variants: ProductVariant[];
}

export interface Audit {
  id: string;
  business_id: string;
  branch_id: string;
  branch_name: string;
  name: string;
  description?: string;
  join_code: string;
  status: 'draft' | 'active' | 'review' | 'approved' | 'archived';
  created_by: string;
  creator_name: string;
  approved_by?: string;
  approver_name?: string;
  approved_at?: string;
  total_products?: number;
  counted_products?: number;
  active_employees?: number;
  created_at: string;
}
