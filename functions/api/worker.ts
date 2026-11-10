import {
  calculateAuditTotals,
  calculateLineVariance
} from './calculations.ts';
import type {
  AuditLineCalculation,
  AuditTotals
} from './calculations.ts';
import {
  generateAuditCode,
  generatePin,
  hashPassword,
  hashPin,
  hashString,
  randomToken,
  verifyPassword,
  verifyPin
} from './crypto.ts';
import {
  checkBusinessRole,
  getCurrentUser,
  getEmployeeSession
} from './db.ts';
import type {
  D1Database,
  AuthenticatedUser,
  EmployeeSession
} from './db.ts';

export interface Env {
  DB: D1Database;
}

type Ctx = {
  request: Request;
  env: Env;
  params: Record<string, string>;
  url: URL;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, X-Employee-Token'
    }
  });

const id = () => crypto.randomUUID();

async function parseBody(req: Request): Promise<Record<string, any>> {
  try {
    return (await req.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

// Route matching utility supporting /:param syntax
type RouteHandler = (c: Ctx) => Promise<Response>;
interface RouteEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

const routes: RouteEntry[] = [];

function registerRoute(method: string, path: string, handler: RouteHandler) {
  const paramNames: string[] = [];
  const regexStr =
    '^' +
    path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) +
    '$';
  routes.push({
    method,
    pattern: new RegExp(regexStr),
    paramNames,
    handler
  });
}

/* ==========================================================================
   1. AUTHENTICATION & BUSINESS MEMBERSHIPS
   ========================================================================== */

registerRoute('POST', '/api/auth/register', async ({ request, env }) => {
  const b = await parseBody(request);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const displayName = String(b.displayName || b.name || 'Owner').trim();
  const businessName = String(b.businessName || '').trim();
  const businessType = String(b.businessType || 'General Retail').trim();
  const branchName = String(b.branchName || 'Main Store').trim();

  if (!email || !email.includes('@')) {
    return json({ error: 'A valid email is required.' }, 400);
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters long.' }, 400);
  }
  if (!businessName) {
    return json({ error: 'Business name is required.' }, 400);
  }

  // Check if email already registered
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();
  if (existing) {
    return json({ error: 'An account with this email already exists.' }, 409);
  }

  const userId = id();
  const businessId = id();
  const branchId = id();
  const passwordHash = await hashPassword(password);
  const token = randomToken(32);
  const tokenHash = await hashString(token);
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).bind(userId, email, passwordHash, displayName),
    env.DB.prepare(
      'INSERT INTO businesses (id, name, business_type) VALUES (?, ?, ?)'
    ).bind(businessId, businessName, businessType),
    env.DB.prepare(
      'INSERT INTO branches (id, business_id, name, is_default) VALUES (?, ?, ?, 1)'
    ).bind(branchId, businessId, branchName),
    env.DB.prepare(
      "INSERT INTO business_users (business_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(businessId, userId),
    env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(id(), userId, tokenHash, expiresAt),
    // Standard default categories
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
      .bind(id(), businessId, 'General'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
      .bind(id(), businessId, 'Apparel'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
      .bind(id(), businessId, 'Footwear'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
      .bind(id(), businessId, 'Electronics'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
      .bind(id(), businessId, 'Groceries')
  ]);

  return json(
    {
      token,
      expiresAt,
      user: {
        id: userId,
        email,
        displayName,
        businesses: [{ id: businessId, name: businessName, role: 'owner', branchId }]
      }
    },
    201
  );
});

registerRoute('POST', '/api/auth/login', async ({ request, env }) => {
  const b = await parseBody(request);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; display_name: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'Invalid email or password.' }, 401);
  }

  const token = randomToken(32);
  const tokenHash = await hashString(token);
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id(), user.id, tokenHash, expiresAt)
    .run();

  const { results: memberships } = await env.DB.prepare(
    `SELECT b.id, b.name, bu.role, br.id as branch_id
     FROM businesses b
     JOIN business_users bu ON bu.business_id = b.id
     LEFT JOIN branches br ON br.business_id = b.id AND br.is_default = 1
     WHERE bu.user_id = ?`
  )
    .bind(user.id)
    .all<{ id: string; name: string; role: 'owner' | 'manager'; branch_id?: string }>();

  return json({
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      businesses: memberships.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        branchId: m.branch_id
      }))
    }
  });
});

registerRoute('POST', '/api/auth/logout', async ({ request, env }) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const tokenHash = await hashString(token);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return json({ success: true });
});

registerRoute('GET', '/api/auth/me', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return json({ user });
});

/* ==========================================================================
   2. BUSINESSES & BRANCHES
   ========================================================================== */

registerRoute('GET', '/api/businesses', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  return json({ businesses: user.businesses });
});

registerRoute('GET', '/api/branches', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results } = await env.DB.prepare(
    'SELECT * FROM branches WHERE business_id = ? ORDER BY is_default DESC, name ASC'
  )
    .bind(businessId)
    .all();

  return json({ branches: results });
});

registerRoute('POST', '/api/branches', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB, ['owner']))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const branchName = String(b.name || '').trim();
  if (!branchName) return json({ error: 'Branch name is required' }, 400);

  const branchId = id();
  await env.DB.prepare('INSERT INTO branches (id, business_id, name, is_default) VALUES (?, ?, ?, 0)')
    .bind(branchId, businessId, branchName)
    .run();

  return json({ branch: { id: branchId, business_id: businessId, name: branchName, is_default: 0 } }, 201);
});

/* ==========================================================================
   3. CATEGORIES
   ========================================================================== */

registerRoute('GET', '/api/categories', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results } = await env.DB.prepare(
    'SELECT * FROM categories WHERE business_id = ? ORDER BY name ASC'
  )
    .bind(businessId)
    .all();

  return json({ categories: results });
});

registerRoute('POST', '/api/categories', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const name = String(b.name || '').trim();
  if (!name) return json({ error: 'Category name is required' }, 400);

  const categoryId = id();
  try {
    await env.DB.prepare('INSERT INTO categories (id, business_id, name, parent_id) VALUES (?, ?, ?, ?)')
      .bind(categoryId, businessId, name, b.parentId || null)
      .run();
    return json({ category: { id: categoryId, business_id: businessId, name, parent_id: b.parentId || null } }, 201);
  } catch {
    return json({ error: 'A category with this name already exists' }, 409);
  }
});

/* ==========================================================================
   4. PRODUCTS & VARIANTS
   ========================================================================== */

registerRoute('GET', '/api/products', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  const branchId = url.searchParams.get('branchId');
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Fetch products with their categories
  const { results: products } = await env.DB.prepare(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.business_id = ? AND p.active = 1
     ORDER BY p.name ASC`
  )
    .bind(businessId)
    .all<any>();

  // Fetch variants with current inventory balances
  const { results: variants } = await env.DB.prepare(
    `SELECT v.*, COALESCE(ib.quantity, 0) as expected_quantity
     FROM product_variants v
     LEFT JOIN inventory_balances ib ON ib.variant_id = v.id ${branchId ? 'AND ib.branch_id = ?' : ''}
     WHERE v.business_id = ?
     ORDER BY v.variant_label ASC`
  )
    .bind(...(branchId ? [branchId, businessId] : [businessId]))
    .all<any>();

  // Map variants under their respective products
  const productsWithVariants = products.map(p => ({
    ...p,
    attributes: JSON.parse(p.attributes_json || '{}'),
    variants: variants
      .filter(v => v.product_id === p.id)
      .map(v => ({
        ...v,
        attributes: JSON.parse(v.attributes_json || '{}')
      }))
  }));

  return json({ products: productsWithVariants });
});

registerRoute('POST', '/api/products', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const branchId = b.branchId || user.businesses[0]?.branchId;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const name = String(b.name || '').trim();
  if (!name) return json({ error: 'Product name is required' }, 400);

  const productId = id();
  const sku = b.sku ? String(b.sku).trim() : null;
  const brand = b.brand ? String(b.brand).trim() : null;
  const categoryId = b.categoryId || null;
  const unit = b.unit || 'pcs';
  const attributes = b.attributes || {};

  const stmts = [
    env.DB.prepare(
      `INSERT INTO products (id, business_id, category_id, sku, name, brand, unit, attributes_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(productId, businessId, categoryId, sku, name, brand, unit, JSON.stringify(attributes))
  ];

  // If variants provided, create them; otherwise create one default variant
  const incomingVariants = Array.isArray(b.variants) && b.variants.length > 0
    ? b.variants
    : [{ label: b.variant || 'Standard', sku: sku, barcode: b.barcode || null, expected: Number(b.expected) || 0 }];

  for (const v of incomingVariants) {
    const variantId = id();
    const vLabel = String(v.label || v.variant_label || 'Standard').trim();
    const vSku = v.sku || sku;
    const vBarcode = v.barcode || null;
    const vExpected = Number(v.expected || v.expected_quantity || 0);

    stmts.push(
      env.DB.prepare(
        `INSERT INTO product_variants (id, business_id, product_id, variant_label, sku, barcode, attributes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(variantId, businessId, productId, vLabel, vSku, vBarcode, JSON.stringify(v.attributes || {}))
    );

    if (branchId) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO inventory_balances (id, business_id, branch_id, variant_id, quantity)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(business_id, branch_id, variant_id) DO UPDATE SET quantity = excluded.quantity`
        ).bind(id(), businessId, branchId, variantId, Math.max(0, vExpected))
      );
    }
  }

  await env.DB.batch(stmts);
  return json({ id: productId, success: true }, 201);
});

registerRoute('PUT', '/api/products/:id', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const productId = params.id;
  const name = String(b.name || '').trim();
  if (!name) return json({ error: 'Product name is required' }, 400);

  await env.DB.prepare(
    `UPDATE products
     SET name = ?, sku = ?, brand = ?, category_id = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND business_id = ?`
  )
    .bind(name, b.sku || null, b.brand || null, b.categoryId || null, b.unit || 'pcs', productId, businessId)
    .run();

  return json({ success: true });
});

registerRoute('DELETE', '/api/products/:id', async ({ request, env, params, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Soft archive to protect historical audit records
  await env.DB.prepare('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?')
    .bind(params.id, businessId)
    .run();

  return json({ success: true, message: 'Product archived successfully' });
});

// CSV / Excel bulk product import
registerRoute('POST', '/api/products/import', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const branchId = b.branchId || user.businesses[0]?.branchId;
  const items = Array.isArray(b.items) ? b.items : [];

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  if (items.length === 0) {
    return json({ error: 'No items provided for import' }, 400);
  }

  let importedCount = 0;
  for (const row of items) {
    const name = String(row.name || row.Product || row.product || '').trim();
    if (!name) continue;

    const sku = String(row.sku || row.SKU || `SKU-${Date.now()}-${importedCount + 1}`);
    const categoryName = String(row.category || row.Category || 'General').trim();
    const brand = String(row.brand || row.Brand || '').trim() || null;
    const variantLabel = String(row.variant || row.Variant || 'Standard').trim();
    const unit = String(row.unit || row.Unit || 'pcs').trim();
    const expected = Math.max(0, Number(row.expected || row.Expected || row.quantity || 0));

    // Ensure category exists
    let cat = await env.DB.prepare('SELECT id FROM categories WHERE business_id = ? AND name = ?')
      .bind(businessId, categoryName)
      .first<{ id: string }>();

    if (!cat) {
      const catId = id();
      await env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)')
        .bind(catId, businessId, categoryName)
        .run();
      cat = { id: catId };
    }

    // Insert or find product
    let prod = await env.DB.prepare('SELECT id FROM products WHERE business_id = ? AND (sku = ? OR name = ?)')
      .bind(businessId, sku, name)
      .first<{ id: string }>();

    let prodId = prod?.id;
    if (!prodId) {
      prodId = id();
      await env.DB.prepare(
        'INSERT INTO products (id, business_id, category_id, sku, name, brand, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(prodId, businessId, cat.id, sku, name, brand, unit)
        .run();
    }

    // Insert or update variant
    let variant = await env.DB.prepare(
      'SELECT id FROM product_variants WHERE business_id = ? AND product_id = ? AND variant_label = ?'
    )
      .bind(businessId, prodId, variantLabel)
      .first<{ id: string }>();

    let variantId = variant?.id;
    if (!variantId) {
      variantId = id();
      await env.DB.prepare(
        'INSERT INTO product_variants (id, business_id, product_id, variant_label, sku) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(variantId, businessId, prodId, variantLabel, sku)
        .run();
    }

    // Record inventory balance if branch provided
    if (branchId) {
      await env.DB.prepare(
        `INSERT INTO inventory_balances (id, business_id, branch_id, variant_id, quantity)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(business_id, branch_id, variant_id) DO UPDATE SET quantity = excluded.quantity`
      )
        .bind(id(), businessId, branchId, variantId, expected)
        .run();
    }

    importedCount++;
  }

  return json({ success: true, count: importedCount }, 201);
});

/* ==========================================================================
   5. INVENTORY BALANCES & MOVEMENTS
   ========================================================================== */

registerRoute('GET', '/api/inventory', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  const branchId = url.searchParams.get('branchId');
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT ib.id, ib.quantity, ib.updated_at,
            v.id as variant_id, v.variant_label, v.sku as variant_sku,
            p.id as product_id, p.name as product_name, p.unit, p.brand,
            c.name as category_name,
            br.name as branch_name
     FROM inventory_balances ib
     JOIN product_variants v ON v.id = ib.variant_id
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     JOIN branches br ON br.id = ib.branch_id
     WHERE ib.business_id = ? ${branchId ? 'AND ib.branch_id = ?' : ''}
     ORDER BY p.name ASC`
  )
    .bind(...(branchId ? [businessId, branchId] : [businessId]))
    .all();

  return json({ balances: results });
});

registerRoute('POST', '/api/inventory/adjust', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const branchId = b.branchId;
  const variantId = b.variantId;
  const newQuantity = Number(b.quantity);
  const reason = String(b.reason || 'Manual stock adjustment');

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (!branchId || !variantId || isNaN(newQuantity) || newQuantity < 0) {
    return json({ error: 'Valid branch, variant, and non-negative quantity required' }, 400);
  }

  // Get current balance
  const current = await env.DB.prepare(
    'SELECT quantity FROM inventory_balances WHERE business_id = ? AND branch_id = ? AND variant_id = ?'
  )
    .bind(businessId, branchId, variantId)
    .first<{ quantity: number }>();

  const beforeQuantity = current ? current.quantity : 0;
  const changeQuantity = Math.round((newQuantity - beforeQuantity) * 1000) / 1000;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO inventory_balances (id, business_id, branch_id, variant_id, quantity, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(business_id, branch_id, variant_id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP`
    ).bind(id(), businessId, branchId, variantId, newQuantity),
    env.DB.prepare(
      `INSERT INTO inventory_movements (id, business_id, branch_id, variant_id, before_quantity, after_quantity, change_quantity, reason, adjusted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id(), businessId, branchId, variantId, beforeQuantity, newQuantity, changeQuantity, reason, user.displayName)
  ]);

  return json({ success: true, before: beforeQuantity, after: newQuantity });
});

/* ==========================================================================
   6. STOCK AUDIT MANAGEMENT & SNAPSHOTS
   ========================================================================== */

registerRoute('GET', '/api/audits', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results: audits } = await env.DB.prepare(
    `SELECT a.*, br.name as branch_name, u.display_name as creator_name,
            (SELECT COUNT(*) FROM audit_expected_snapshots WHERE audit_id = a.id) as total_products,
            (SELECT COUNT(DISTINCT variant_id) FROM audit_count_entries WHERE audit_id = a.id) as counted_products,
            (SELECT COUNT(*) FROM audit_assignments WHERE audit_id = a.id AND status = 'active') as active_employees
     FROM audits a
     JOIN branches br ON br.id = a.branch_id
     JOIN users u ON u.id = a.created_by
     WHERE a.business_id = ?
     ORDER BY a.created_at DESC`
  )
    .bind(businessId)
    .all();

  return json({ audits });
});

registerRoute('POST', '/api/audits', async ({ request, env }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const branchId = b.branchId || user.businesses[0]?.branchId;
  const name = String(b.name || '').trim();

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (!name || !branchId) {
    return json({ error: 'Audit name and branch are required' }, 400);
  }

  const auditId = id();
  const joinCode = generateAuditCode();
  const joinCodeHash = await hashString(joinCode);

  // CRITICAL REQUIREMENT: Capture immutable expected stock snapshot at audit creation!
  // Read all active variants and their current balance in this branch
  const { results: variants } = await env.DB.prepare(
    `SELECT v.id as variant_id, ib.quantity as current_quantity
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN inventory_balances ib ON ib.variant_id = v.id AND ib.branch_id = ?
     WHERE v.business_id = ? AND p.active = 1`
  )
    .bind(branchId, businessId)
    .all<{ variant_id: string; current_quantity: number | null }>();

  const stmts = [
    env.DB.prepare(
      `INSERT INTO audits (id, business_id, branch_id, name, description, join_code, join_code_hash, status, created_by, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(auditId, businessId, branchId, name, b.description || null, joinCode, joinCodeHash, user.id, b.deadline || null)
  ];

  // Freeze the snapshot for every variant
  for (const v of variants) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO audit_expected_snapshots (id, audit_id, business_id, variant_id, expected_quantity)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(id(), auditId, businessId, v.variant_id, v.current_quantity)
    );
  }

  // Log activity
  stmts.push(
    env.DB.prepare(
      `INSERT INTO audit_activity_logs (id, business_id, audit_id, actor, action, details_json)
       VALUES (?, ?, ?, ?, 'audit_created', ?)`
    ).bind(id(), businessId, auditId, user.displayName, JSON.stringify({ name, joinCode, lineCount: variants.length }))
  );

  await env.DB.batch(stmts);

  return json(
    {
      auditId,
      joinCode,
      lineCount: variants.length,
      success: true
    },
    201
  );
});

// Full Audit Details: reconciles snapshot vs count entries, computes all 6 cases, detects duplicate conflicts
registerRoute('GET', '/api/audits/:id', async ({ request, env, params, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  const auditId = params.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const audit = await env.DB.prepare(
    `SELECT a.*, br.name as branch_name, u.display_name as creator_name, app.display_name as approver_name
     FROM audits a
     JOIN branches br ON br.id = a.branch_id
     JOIN users u ON u.id = a.created_by
     LEFT JOIN users app ON app.id = a.approved_by
     WHERE a.id = ? AND a.business_id = ?`
  )
    .bind(auditId, businessId)
    .first<any>();

  if (!audit) return json({ error: 'Audit not found' }, 404);

  // Fetch frozen expected snapshot with product details
  const { results: snapshotLines } = await env.DB.prepare(
    `SELECT s.id as snapshot_id, s.variant_id, s.expected_quantity,
            v.variant_label, v.sku as variant_sku, v.barcode,
            p.id as product_id, p.name as product_name, p.unit, p.brand,
            c.name as category_name
     FROM audit_expected_snapshots s
     JOIN product_variants v ON v.id = s.variant_id
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE s.audit_id = ?
     ORDER BY p.name ASC, v.variant_label ASC`
  )
    .bind(auditId)
    .all<any>();

  // Fetch count entries submitted for this audit
  const { results: countEntries } = await env.DB.prepare(
    `SELECT ce.*, aa.employee_name as assigned_employee
     FROM audit_count_entries ce
     LEFT JOIN audit_assignments aa ON aa.id = ce.assignment_id
     WHERE ce.audit_id = ?
     ORDER BY ce.counted_at DESC`
  )
    .bind(auditId)
    .all<any>();

  // Group entries by variant to check for DUPLICATE COUNT CONFLICTS
  const entriesByVariant = new Map<string, any[]>();
  for (const entry of countEntries) {
    const list = entriesByVariant.get(entry.variant_id) || [];
    list.push(entry);
    entriesByVariant.set(entry.variant_id, list);
  }

  // Calculate line items and determine conflicts
  const calculatedLines: (AuditLineCalculation & {
    snapshotId: string;
    productId: string;
    productName: string;
    variantLabel: string;
    sku: string;
    barcode: string | null;
    unit: string;
    category: string;
    entries: any[];
    recountRequested: boolean;
  })[] = [];

  for (const snap of snapshotLines) {
    const entries = entriesByVariant.get(snap.variant_id) || [];
    const isResolved = entries.some(e => e.status === 'resolved');
    const isRecount = entries.some(e => e.status === 'recount_requested');
    const hasMultipleSubmitted = entries.length > 1 && !isResolved;

    let actualQty: number | null = null;
    if (isResolved) {
      const resolvedEntry = entries.find(e => e.status === 'resolved');
      actualQty = resolvedEntry.resolved_quantity ?? resolvedEntry.quantity;
    } else if (entries.length === 1) {
      actualQty = entries[0].quantity;
    } else if (entries.length > 1) {
      actualQty = null; // Unresolved duplicate conflict! Do NOT sum!
    }

    const calc = calculateLineVariance(snap.expected_quantity, actualQty, hasMultipleSubmitted);

    calculatedLines.push({
      ...calc,
      variantId: snap.variant_id,
      snapshotId: snap.snapshot_id,
      productId: snap.product_id,
      productName: snap.product_name,
      variantLabel: snap.variant_label,
      sku: snap.variant_sku || '',
      barcode: snap.barcode,
      unit: snap.unit,
      category: snap.category_name || 'General',
      entries,
      recountRequested: isRecount
    });
  }

  const totals = calculateAuditTotals(calculatedLines);

  // Fetch audit assignments
  const { results: assignments } = await env.DB.prepare(
    `SELECT aa.*,
            (SELECT COUNT(*) FROM audit_count_entries WHERE assignment_id = aa.id) as count_count
     FROM audit_assignments aa
     WHERE aa.audit_id = ?
     ORDER BY aa.created_at ASC`
  )
    .bind(auditId)
    .all<any>();

  return json({
    audit,
    lines: calculatedLines,
    totals,
    assignments
  });
});

// Update audit status (Draft -> Active -> Review -> Approved)
registerRoute('PUT', '/api/audits/:id/status', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const newStatus = b.status;
  const auditId = params.id;

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB, ['owner']))) {
    return json({ error: 'Forbidden. Owner approval required.' }, 403);
  }

  const validStatuses = ['draft', 'active', 'review', 'approved', 'archived'];
  if (!validStatuses.includes(newStatus)) {
    return json({ error: 'Invalid status' }, 400);
  }

  // If approving: verify that NO unresolved duplicate conflicts exist
  if (newStatus === 'approved') {
    // Check conflicts
    const { results: duplicateGroups } = await env.DB.prepare(
      `SELECT variant_id, COUNT(*) as cnt
       FROM audit_count_entries
       WHERE audit_id = ? AND status != 'resolved'
       GROUP BY variant_id
       HAVING cnt > 1`
    )
      .bind(auditId)
      .all();

    if (duplicateGroups && duplicateGroups.length > 0) {
      return json(
        { error: 'Cannot approve audit: Unresolved duplicate count conflicts exist. Please resolve all conflicts first.' },
        400
      );
    }

    await env.DB.prepare(
      `UPDATE audits
       SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ? AND business_id = ?`
    )
      .bind(user.id, auditId, businessId)
      .run();

    await env.DB.prepare(
      `INSERT INTO audit_activity_logs (id, business_id, audit_id, actor, action, details_json)
       VALUES (?, ?, ?, ?, 'audit_approved', ?)`
    ).bind(id(), businessId, auditId, user.displayName, JSON.stringify({ approvedBy: user.displayName }));

    return json({ success: true, status: 'approved' });
  }

  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ? AND business_id = ?')
    .bind(newStatus, auditId, businessId)
    .run();

  return json({ success: true, status: newStatus });
});

// Resolve duplicate count conflict
registerRoute('POST', '/api/audits/:id/duplicate-resolve', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const auditId = params.id;
  const variantId = b.variantId;
  const resolvedQuantity = Number(b.resolvedQuantity);
  const reason = String(b.reason || 'Owner selected authoritative count').trim();

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (!variantId || isNaN(resolvedQuantity) || resolvedQuantity < 0) {
    return json({ error: 'Valid variant ID and non-negative resolved quantity required' }, 400);
  }

  // Update count entries for this variant in this audit to resolved
  await env.DB.prepare(
    `UPDATE audit_count_entries
     SET status = 'resolved', resolved_quantity = ?, resolved_by = ?, resolution_reason = ?, updated_at = CURRENT_TIMESTAMP
     WHERE audit_id = ? AND variant_id = ?`
  )
    .bind(resolvedQuantity, user.displayName, reason, auditId, variantId)
    .run();

  // Log activity
  await env.DB.prepare(
    `INSERT INTO audit_activity_logs (id, business_id, audit_id, actor, action, details_json)
     VALUES (?, ?, ?, ?, 'duplicate_resolved', ?)`
  ).bind(id(), businessId, auditId, user.displayName, JSON.stringify({ variantId, resolvedQuantity, reason }));

  return json({ success: true });
});

// Request a recount for an audit line
registerRoute('POST', '/api/audits/:id/recount-request', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const auditId = params.id;
  const variantId = b.variantId;
  const reason = String(b.reason || 'Recount requested by reviewer').trim();

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  await env.DB.prepare(
    `UPDATE audit_count_entries
     SET status = 'recount_requested', note = COALESCE(note || ' | ', '') || 'Recount requested: ' || ?
     WHERE audit_id = ? AND variant_id = ?`
  )
    .bind(reason, auditId, variantId)
    .run();

  await env.DB.prepare(
    `INSERT INTO audit_activity_logs (id, business_id, audit_id, actor, action, details_json)
     VALUES (?, ?, ?, ?, 'recount_requested', ?)`
  ).bind(id(), businessId, auditId, user.displayName, JSON.stringify({ variantId, reason }));

  return json({ success: true });
});

// Reconcile approved audit with current inventory balances
registerRoute('POST', '/api/audits/:id/reconcile', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const auditId = params.id;

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB, ['owner']))) {
    return json({ error: 'Forbidden. Owner approval required for reconciliation.' }, 403);
  }

  const audit = await env.DB.prepare('SELECT * FROM audits WHERE id = ? AND business_id = ?')
    .bind(auditId, businessId)
    .first<any>();

  if (!audit) return json({ error: 'Audit not found' }, 404);
  if (audit.status !== 'approved') {
    return json({ error: 'Audit must be approved before reconciling inventory' }, 400);
  }

  // Get all count entries
  const { results: counts } = await env.DB.prepare(
    `SELECT variant_id, COALESCE(resolved_quantity, quantity) as final_quantity
     FROM audit_count_entries
     WHERE audit_id = ?`
  )
    .bind(auditId)
    .all<{ variant_id: string; final_quantity: number }>();

  let adjustedCount = 0;
  for (const c of counts) {
    const cur = await env.DB.prepare(
      'SELECT quantity FROM inventory_balances WHERE business_id = ? AND branch_id = ? AND variant_id = ?'
    )
      .bind(businessId, audit.branch_id, c.variant_id)
      .first<{ quantity: number }>();

    const before = cur ? cur.quantity : 0;
    const after = c.final_quantity;
    const diff = Math.round((after - before) * 1000) / 1000;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO inventory_balances (id, business_id, branch_id, variant_id, quantity, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(business_id, branch_id, variant_id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP`
      ).bind(id(), businessId, audit.branch_id, c.variant_id, after),
      env.DB.prepare(
        `INSERT INTO inventory_movements (id, business_id, branch_id, variant_id, audit_id, before_quantity, after_quantity, change_quantity, reason, adjusted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id(), businessId, audit.branch_id, c.variant_id, auditId, before, after, diff, `Reconciled from Audit ${audit.name}`, user.displayName)
    ]);
    adjustedCount++;
  }

  return json({ success: true, count: adjustedCount });
});

/* ==========================================================================
   7. EMPLOYEE INVITATIONS & ASSIGNMENTS
   ========================================================================== */

registerRoute('GET', '/api/audits/:id/assignments', async ({ request, env, params, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  const auditId = params.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT aa.*,
            (SELECT COUNT(*) FROM audit_count_entries WHERE assignment_id = aa.id) as counted_items
     FROM audit_assignments aa
     WHERE aa.audit_id = ?
     ORDER BY aa.created_at ASC`
  )
    .bind(auditId)
    .all();

  return json({ assignments: results });
});

registerRoute('POST', '/api/audits/:id/assignments', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const auditId = params.id;
  const employeeName = String(b.employeeName || '').trim();
  const rawPin = b.pin ? String(b.pin).trim() : generatePin();

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (!employeeName) {
    return json({ error: 'Employee name is required' }, 400);
  }

  const assignmentId = id();
  const pinHash = await hashPin(rawPin);

  await env.DB.prepare(
    `INSERT INTO audit_assignments (id, audit_id, business_id, employee_name, pin_hash, status)
     VALUES (?, ?, ?, ?, ?, 'active')`
  )
    .bind(assignmentId, auditId, businessId, employeeName, pinHash)
    .run();

  return json({
    assignmentId,
    employeeName,
    pin: rawPin, // Return in clear text ONCE to the owner so they can share it with the employee
    success: true
  }, 201);
});

registerRoute('DELETE', '/api/audits/:id/assignments/:assignmentId', async ({ request, env, params, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  const assignmentId = params.assignmentId;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  await env.DB.prepare(
    "UPDATE audit_assignments SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?"
  )
    .bind(assignmentId, businessId)
    .run();

  return json({ success: true, message: 'Assignment revoked' });
});

/* ==========================================================================
   8. EMPLOYEE MOBILE WORKSPACE APIS
   ========================================================================== */

// Employee join with Audit Code + Employee PIN
registerRoute('POST', '/api/employee/join', async ({ request, env }) => {
  const b = await parseBody(request);
  const code = String(b.code || '').trim().toUpperCase();
  const pin = String(b.pin || '').trim();
  const employeeName = String(b.employeeName || '').trim();

  if (!code || !pin) {
    return json({ error: 'Both Audit Code and 4-digit PIN are required.' }, 400);
  }

  const codeHash = await hashString(code);
  const audit = await env.DB.prepare(
    "SELECT id, business_id, name, branch_id, status FROM audits WHERE join_code_hash = ?"
  )
    .bind(codeHash)
    .first<any>();

  if (!audit) {
    return json({ error: 'Invalid audit code.' }, 404);
  }
  if (audit.status === 'approved' || audit.status === 'archived') {
    return json({ error: 'This audit is no longer accepting submissions.' }, 403);
  }

  // Find assignment matching this audit
  const { results: assignments } = await env.DB.prepare(
    `SELECT * FROM audit_assignments
     WHERE audit_id = ? AND status = 'active' AND revoked_at IS NULL`
  )
    .bind(audit.id)
    .all<any>();

  let matchingAssignment: any = null;
  for (const a of assignments) {
    if (await verifyPin(pin, a.pin_hash)) {
      if (!employeeName || a.employee_name.toLowerCase() === employeeName.toLowerCase()) {
        matchingAssignment = a;
        break;
      }
    }
  }

  if (!matchingAssignment) {
    return json({ error: 'Invalid PIN or employee assignment not found.' }, 401);
  }

  // Generate an employee session access token
  const employeeToken = randomToken(32);
  const tokenHash = await hashString(employeeToken);

  await env.DB.prepare('UPDATE audit_assignments SET access_token_hash = ? WHERE id = ?')
    .bind(tokenHash, matchingAssignment.id)
    .run();

  return json({
    employeeToken,
    assignment: {
      id: matchingAssignment.id,
      employeeName: matchingAssignment.employee_name,
      auditId: audit.id,
      auditName: audit.name
    }
  });
});

// Employee retrieves assigned audit, products & their current saved counts
registerRoute('GET', '/api/employee/audit', async ({ request, env }) => {
  const emp = await getEmployeeSession(request, env.DB);
  if (!emp) return json({ error: 'Invalid or expired employee session' }, 401);

  // Get frozen products in this audit
  const { results: items } = await env.DB.prepare(
    `SELECT s.id as snapshot_id, s.variant_id, s.expected_quantity,
            v.variant_label, v.sku as variant_sku, v.barcode,
            p.id as product_id, p.name as product_name, p.unit, p.brand,
            c.name as category_name,
            (SELECT quantity FROM audit_count_entries WHERE audit_id = ? AND variant_id = s.variant_id AND assignment_id = ?) as my_count,
            (SELECT note FROM audit_count_entries WHERE audit_id = ? AND variant_id = s.variant_id AND assignment_id = ?) as my_note,
            (SELECT status FROM audit_count_entries WHERE audit_id = ? AND variant_id = s.variant_id AND assignment_id = ?) as entry_status
     FROM audit_expected_snapshots s
     JOIN product_variants v ON v.id = s.variant_id
     JOIN products p ON p.id = v.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE s.audit_id = ?
     ORDER BY p.name ASC, v.variant_label ASC`
  )
    .bind(emp.auditId, emp.assignmentId, emp.auditId, emp.assignmentId, emp.auditId, emp.assignmentId, emp.auditId)
    .all<any>();

  return json({
    audit: {
      id: emp.auditId,
      name: emp.auditName,
      employeeName: emp.employeeName
    },
    items
  });
});

// Employee submits or updates a count (supports 0, notes, revision history)
registerRoute('POST', '/api/employee/count', async ({ request, env }) => {
  const emp = await getEmployeeSession(request, env.DB);
  if (!emp) return json({ error: 'Invalid or expired employee session' }, 401);

  const b = await parseBody(request);
  const variantId = b.variantId;
  const quantity = Number(b.quantity);
  const note = b.note ? String(b.note).trim() : null;

  if (!variantId || isNaN(quantity) || quantity < 0) {
    return json({ error: 'Valid variant ID and non-negative quantity required. 0 is valid.' }, 400);
  }

  // Check if entry already exists
  const existing = await env.DB.prepare(
    'SELECT id, quantity FROM audit_count_entries WHERE audit_id = ? AND variant_id = ? AND assignment_id = ?'
  )
    .bind(emp.auditId, variantId, emp.assignmentId)
    .first<{ id: string; quantity: number }>();

  if (existing) {
    // Record revision if quantity changed
    if (existing.quantity !== quantity) {
      await env.DB.prepare(
        `INSERT INTO audit_count_revisions (id, count_entry_id, audit_id, old_quantity, new_quantity, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id(), existing.id, emp.auditId, existing.quantity, quantity, emp.employeeName, note || 'Updated during count')
        .run();
    }

    await env.DB.prepare(
      `UPDATE audit_count_entries
       SET quantity = ?, note = ?, updated_at = CURRENT_TIMESTAMP, status = 'submitted'
       WHERE id = ?`
    )
      .bind(quantity, note, existing.id)
      .run();

    return json({ success: true, entryId: existing.id, updated: true });
  }

  // Create new entry
  const entryId = id();
  await env.DB.prepare(
    `INSERT INTO audit_count_entries (id, audit_id, business_id, variant_id, assignment_id, quantity, counted_by, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`
  )
    .bind(entryId, emp.auditId, emp.businessId, variantId, emp.assignmentId, quantity, emp.employeeName, note)
    .run();

  return json({ success: true, entryId, updated: false }, 201);
});

// Employee submits assignment
registerRoute('POST', '/api/employee/submit', async ({ request, env }) => {
  const emp = await getEmployeeSession(request, env.DB);
  if (!emp) return json({ error: 'Invalid or expired employee session' }, 401);

  await env.DB.prepare(
    `INSERT INTO audit_activity_logs (id, business_id, audit_id, actor, action, details_json)
     VALUES (?, ?, ?, ?, 'employee_submission', ?)`
  ).bind(id(), emp.businessId, emp.auditId, emp.employeeName, JSON.stringify({ assignmentId: emp.assignmentId }));

  return json({ success: true, message: 'All counts submitted successfully.' });
});

// Employee requests missing product
registerRoute('POST', '/api/employee/request-product', async ({ request, env }) => {
  const emp = await getEmployeeSession(request, env.DB);
  if (!emp) return json({ error: 'Invalid or expired employee session' }, 401);

  const b = await parseBody(request);
  const name = String(b.name || '').trim();
  if (!name) return json({ error: 'Product name is required' }, 400);

  const reqId = id();
  const proposed = {
    name,
    sku: b.sku || null,
    barcode: b.barcode || null,
    category: b.category || 'General',
    variant: b.variant || 'Standard',
    countedQuantity: Number(b.quantity) || 0,
    note: b.note || null
  };

  await env.DB.prepare(
    `INSERT INTO product_requests (id, business_id, audit_id, requested_by, proposed_product_json, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  )
    .bind(reqId, emp.businessId, emp.auditId, emp.employeeName, JSON.stringify(proposed))
    .run();

  return json({ success: true, requestId: reqId }, 201);
});

/* ==========================================================================
   9. OWNER PRODUCT REQUESTS APPROVAL QUEUE
   ========================================================================== */

registerRoute('GET', '/api/product-requests', async ({ request, env, url }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const businessId = url.searchParams.get('businessId') || user.businesses[0]?.id;
  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT pr.*, a.name as audit_name
     FROM product_requests pr
     JOIN audits a ON a.id = pr.audit_id
     WHERE pr.business_id = ?
     ORDER BY pr.created_at DESC`
  )
    .bind(businessId)
    .all<any>();

  const requests = results.map(r => ({
    ...r,
    proposed: JSON.parse(r.proposed_product_json || '{}')
  }));

  return json({ requests });
});

registerRoute('POST', '/api/product-requests/:id/review', async ({ request, env, params }) => {
  const user = await getCurrentUser(request, env.DB);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const b = await parseBody(request);
  const businessId = b.businessId || user.businesses[0]?.id;
  const requestId = params.id;
  const action = b.action; // 'approve' or 'reject'
  const reviewNote = b.reviewNote || '';

  if (!businessId || !(await checkBusinessRole(user.id, businessId, env.DB))) {
    return json({ error: 'Forbidden' }, 403);
  }

  const req = await env.DB.prepare('SELECT * FROM product_requests WHERE id = ? AND business_id = ?')
    .bind(requestId, businessId)
    .first<any>();

  if (!req) return json({ error: 'Request not found' }, 404);

  const proposed = JSON.parse(req.proposed_product_json || '{}');

  if (action === 'approve') {
    // Optionally create the product in catalogue & add to current audit snapshot
    const prodId = id();
    const varId = id();

    // Check category
    let cat = await env.DB.prepare('SELECT id FROM categories WHERE business_id = ? AND name = ?')
      .bind(businessId, proposed.category || 'General')
      .first<{ id: string }>();

    const catId = cat ? cat.id : null;

    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO products (id, business_id, category_id, sku, name, unit) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(prodId, businessId, catId, proposed.sku || null, proposed.name, 'pcs'),
      env.DB.prepare(
        'INSERT INTO product_variants (id, business_id, product_id, variant_label, sku, barcode) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(varId, businessId, prodId, proposed.variant || 'Standard', proposed.sku || null, proposed.barcode || null),
      // Add snapshot into the audit line
      env.DB.prepare(
        'INSERT INTO audit_expected_snapshots (id, audit_id, business_id, variant_id, expected_quantity) VALUES (?, ?, ?, ?, NULL)'
      ).bind(id(), req.audit_id, businessId, varId),
      // Add count entry if quantity was reported
      env.DB.prepare(
        `INSERT INTO audit_count_entries (id, audit_id, business_id, variant_id, quantity, counted_by, note, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`
      ).bind(id(), req.audit_id, businessId, varId, proposed.countedQuantity || 0, req.requested_by, 'Added from approved product request'),
      // Update request status
      env.DB.prepare(
        `UPDATE product_requests
         SET status = 'approved', review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(reviewNote, user.id, requestId)
    ]);

    return json({ success: true, message: 'Product request approved and catalog item created' });
  } else {
    await env.DB.prepare(
      `UPDATE product_requests
       SET status = 'rejected', review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(reviewNote, user.id, requestId)
      .run();

    return json({ success: true, message: 'Product request rejected' });
  }
});

/* ==========================================================================
   10. DEMO STORE SEEDER & DEMO FAST LOGIN
   ========================================================================== */

registerRoute('POST', '/api/demo/seed', async ({ env }) => {
  const demoBusinessId = 'demo-business-countly';
  const demoUserId = 'demo-user-owner';
  const demoBranchId = 'demo-branch-main';

  // Clear previous demo records if any
  await env.DB.exec(`
    DELETE FROM businesses WHERE id = '${demoBusinessId}';
    DELETE FROM users WHERE id = '${demoUserId}';
  `);

  const ownerPasswordHash = await hashPassword('DemoPass123!');
  const token = 'demo-owner-token';
  const tokenHash = await hashString(token);
  const expires = new Date(Date.now() + 365 * 86400000).toISOString();

  // Create demo business & user
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).bind(demoUserId, 'demo@countly.internal', ownerPasswordHash, 'Store Owner'),
    env.DB.prepare(
      'INSERT INTO businesses (id, name, business_type) VALUES (?, ?, ?)'
    ).bind(demoBusinessId, 'Countly Demo Store', 'Multi-Category Retail'),
    env.DB.prepare(
      'INSERT INTO branches (id, business_id, name, is_default) VALUES (?, ?, ?, 1)'
    ).bind(demoBranchId, demoBusinessId, 'Central Store'),
    env.DB.prepare(
      "INSERT INTO business_users (business_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(demoBusinessId, demoUserId),
    env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(id(), demoUserId, tokenHash, expires)
  ]);

  // Categories across industries
  const catClothing = id(),
    catFootwear = id(),
    catElectronics = id(),
    catGrocery = id(),
    catCosmetics = id();

  await env.DB.batch([
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)').bind(catClothing, demoBusinessId, 'Clothing'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)').bind(catFootwear, demoBusinessId, 'Footwear'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)').bind(catElectronics, demoBusinessId, 'Electronics'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)').bind(catGrocery, demoBusinessId, 'Grocery & Pantry'),
    env.DB.prepare('INSERT INTO categories (id, business_id, name) VALUES (?, ?, ?)').bind(catCosmetics, demoBusinessId, 'Cosmetics & Personal Care')
  ]);

  // Demonstration Products covering ALL 6 MANDATORY CASES and DUPLICATE CONFLICT
  interface DemoItem {
    name: string;
    catId: string;
    brand: string;
    unit: string;
    variants: { label: string; sku: string; expected: number | null; count?: number; countB?: number; duplicate?: boolean }[];
  }

  const demoItems: DemoItem[] = [
    // Case 1: Shortage (Expected 50, Counted 44 -> Variance -6)
    {
      name: 'Oxford Cotton Shirt',
      catId: catClothing,
      brand: 'Northline',
      unit: 'pcs',
      variants: [{ label: 'Blue / L', sku: 'CLO-001', expected: 50, count: 44 }]
    },
    // Case 2: Excess (Expected 30, Counted 35 -> Variance +5)
    {
      name: 'Everyday Running Sneakers',
      catId: catFootwear,
      brand: 'Stride',
      unit: 'pairs',
      variants: [{ label: 'White / 9', sku: 'FTW-002', expected: 30, count: 35 }]
    },
    // Case 3: Matched (Expected 20, Counted 20 -> Variance 0)
    {
      name: 'Noise Cancelling Headphones',
      catId: catElectronics,
      brand: 'AuraSound',
      unit: 'pcs',
      variants: [{ label: 'Midnight Black', sku: 'ELE-003', expected: 20, count: 20 }]
    },
    // Case 4: Expected Unavailable (Expected NULL, Counted 12 -> Status: Variance Unavailable)
    {
      name: 'Basmati Rice Premium (1kg)',
      catId: catGrocery,
      brand: 'HarvestGold',
      unit: 'kg',
      variants: [{ label: '1kg Pouch', sku: 'GRO-004', expected: null, count: 12 }]
    },
    // Case 5: Not Counted (Expected 15, Counted NULL -> Status: Not Counted)
    {
      name: 'Hydrating Face Cream',
      catId: catCosmetics,
      brand: 'LuxeGlow',
      unit: 'units',
      variants: [{ label: '50ml Jar', sku: 'COS-005', expected: 15, count: undefined }]
    },
    // Case 6: Actual Physical Zero (Expected 15, Counted 0 -> Variance -15, Status: Shortage)
    {
      name: 'Classic Leather Belt',
      catId: catClothing,
      brand: 'UrbanCraft',
      unit: 'pcs',
      variants: [{ label: 'Brown / 34', sku: 'CLO-006', expected: 15, count: 0 }]
    },
    // Duplicate Conflict Case: Employee A counted 10, Employee B counted 12
    {
      name: 'USB-C Fast Charging Cable',
      catId: catElectronics,
      brand: 'VoltTech',
      unit: 'pcs',
      variants: [{ label: '2 Meter / Braided', sku: 'ELE-007', expected: 25, count: 10, countB: 12, duplicate: true }]
    },
    // Additional realistic inventory
    {
      name: 'Extra Virgin Olive Oil (500ml)',
      catId: catGrocery,
      brand: 'Mediterraneo',
      unit: 'litres',
      variants: [{ label: '500ml Glass', sku: 'GRO-008', expected: 24, count: 24 }]
    },
    {
      name: 'Wireless Ergonomic Mouse',
      catId: catElectronics,
      brand: 'LogiDesk',
      unit: 'pcs',
      variants: [{ label: 'Matte Grey', sku: 'ELE-009', expected: 18, count: 17 }]
    },
    {
      name: 'Slim Fit Denim Jeans',
      catId: catClothing,
      brand: 'DenimCo',
      unit: 'pairs',
      variants: [{ label: 'Indigo / 32', sku: 'CLO-010', expected: 36, count: 34 }]
    }
  ];

  const demoAuditId = 'demo-audit-nov-2026';
  const joinCode = 'DEMO26';
  const joinCodeHash = await hashString(joinCode);

  await env.DB.prepare(
    `INSERT INTO audits (id, business_id, branch_id, name, description, join_code, join_code_hash, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  )
    .bind(demoAuditId, demoBusinessId, demoBranchId, 'November Full Store Stock Audit', 'Monthly physical stock reconciliation', joinCode, joinCodeHash, demoUserId)
    .run();

  // Create two demo employee assignments
  const empAId = id();
  const empBId = id();
  const pinA = '1234';
  const pinB = '5678';

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO audit_assignments (id, audit_id, business_id, employee_name, pin_hash, status)
       VALUES (?, ?, ?, 'Alex Rivera', ?, 'active')`
    ).bind(empAId, demoAuditId, demoBusinessId, await hashPin(pinA)),
    env.DB.prepare(
      `INSERT INTO audit_assignments (id, audit_id, business_id, employee_name, pin_hash, status)
       VALUES (?, ?, ?, 'Jordan Chen', ?, 'active')`
    ).bind(empBId, demoAuditId, demoBusinessId, await hashPin(pinB))
  ]);

  // Insert products, variants, snapshots, and counts
  for (const item of demoItems) {
    const pId = id();
    await env.DB.prepare(
      'INSERT INTO products (id, business_id, category_id, sku, name, brand, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(pId, demoBusinessId, item.catId, item.variants[0]?.sku || null, item.name, item.brand, item.unit)
      .run();

    for (const v of item.variants) {
      const vId = id();
      await env.DB.prepare(
        'INSERT INTO product_variants (id, business_id, product_id, variant_label, sku) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(vId, demoBusinessId, pId, v.label, v.sku)
        .run();

      // Inventory balance
      if (v.expected !== null) {
        await env.DB.prepare(
          'INSERT INTO inventory_balances (id, business_id, branch_id, variant_id, quantity) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(id(), demoBusinessId, demoBranchId, vId, v.expected)
          .run();
      }

      // Audit snapshot
      await env.DB.prepare(
        'INSERT INTO audit_expected_snapshots (id, audit_id, business_id, variant_id, expected_quantity) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(id(), demoAuditId, demoBusinessId, vId, v.expected)
        .run();

      // Count entries
      if (v.count !== undefined) {
        await env.DB.prepare(
          `INSERT INTO audit_count_entries (id, audit_id, business_id, variant_id, assignment_id, quantity, counted_by, note, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`
        )
          .bind(id(), demoAuditId, demoBusinessId, vId, empAId, v.count, 'Alex Rivera', 'Counted shelf stock')
          .run();
      }

      // Duplicate count conflict
      if (v.duplicate && v.countB !== undefined) {
        await env.DB.prepare(
          `INSERT INTO audit_count_entries (id, audit_id, business_id, variant_id, assignment_id, quantity, counted_by, note, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`
        )
          .bind(id(), demoAuditId, demoBusinessId, vId, empBId, v.countB, 'Jordan Chen', 'Counted backroom stock')
          .run();
      }
    }
  }

  return json({
    success: true,
    message: 'Demo store initialized with all 6 calculation cases and duplicate conflict',
    credentials: {
      ownerToken: token,
      auditCode: joinCode,
      employees: [
        { name: 'Alex Rivera', pin: pinA },
        { name: 'Jordan Chen', pin: pinB }
      ]
    }
  });
});

// Fast demo login for immediate interactive evaluation
registerRoute('POST', '/api/demo/login', async ({ request, env }) => {
  const b = await parseBody(request);
  const role = b.role || 'owner'; // 'owner' or 'employee'

  if (role === 'employee') {
    return json({
      auditCode: 'DEMO26',
      pin: '1234',
      employeeName: 'Alex Rivera'
    });
  }

  const user = await env.DB.prepare('SELECT id, email, display_name FROM users WHERE id = ?')
    .bind('demo-user-owner')
    .first<any>();

  if (!user) {
    // If demo not seeded yet, seed it automatically
    // @ts-ignore
    await routes.find(r => r.method === 'POST' && r.pattern.test('/api/demo/seed'))?.handler({ request, env, params: {}, url: new URL(request.url) });
  }

  return json({
    token: 'demo-owner-token',
    user: {
      id: 'demo-user-owner',
      email: 'demo@countly.internal',
      displayName: 'Store Owner',
      businesses: [{ id: 'demo-business-countly', name: 'Countly Demo Store', role: 'owner', branchId: 'demo-branch-main' }]
    }
  });
});

/* ==========================================================================
   WORKER ENTRYPOINT & CORS DISPATCH
   ========================================================================== */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'Content-Type, Authorization, X-Employee-Token'
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    for (const r of routes) {
      if (r.method === request.method) {
        const match = path.match(r.pattern);
        if (match) {
          const params: Record<string, string> = {};
          r.paramNames.forEach((name, index) => {
            params[name] = decodeURIComponent(match[index + 1]);
          });
          try {
            return await r.handler({ request, env, params, url });
          } catch (err: any) {
            console.error(`API Error in ${request.method} ${path}:`, err);
            return json({ error: err?.message || 'Internal server error' }, 500);
          }
        }
      }
    }

    return json({ error: `Not found: ${request.method} ${path}` }, 404);
  }
};
