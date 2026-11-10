import path from 'node:path';
import fs from 'node:fs';
import { NodeD1Database } from '../functions/api/db.ts';
import worker from '../functions/api/worker.ts';

async function testPostSnapshotMovement() {
  console.log('--- TESTING POST-SNAPSHOT STOCK MOVEMENT PRESERVATION ---');

  const testDbPath = path.resolve('test-delta.sqlite');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const d1 = new NodeD1Database(testDbPath);
  const migrationSql = fs.readFileSync('migrations/0001_initial.sql', 'utf-8');
  await d1.exec(migrationSql);

  const env = { DB: d1 };

  async function api(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
    const method = options.method || 'GET';
    const headers = new Headers(options.headers || {});
    if (options.body && typeof options.body === 'object') {
      headers.set('content-type', 'application/json');
    }
    const req = new Request(`http://localhost:5173${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const res = await worker.fetch(req, env);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  // 1. Seed
  const seedRes = await api('/api/demo/seed', { method: 'POST' });
  const ownerToken = seedRes.data.credentials.ownerToken;

  // 2. Create Audit: snapshot captures CLO-001 at expected 50
  const auditRes = await api('/api/audits', {
    method: 'POST',
    headers: { authorization: `Bearer ${ownerToken}` },
    body: { name: 'Delta Test Audit', branchId: 'demo-branch-main' }
  });
  const auditId = auditRes.data.auditId;
  const joinCode = auditRes.data.joinCode;

  // Add assignment
  await api(`/api/audits/${auditId}/assignments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${ownerToken}` },
    body: { employeeName: 'Auditor One', pin: '5555' }
  });

  // Employee joins and counts CLO-001 (variant CLO-001-M has initial 50 in demo)
  const empJoin = await api('/api/employee/join', {
    method: 'POST',
    body: { code: joinCode, pin: '5555', employeeName: 'Auditor One' }
  });
  const empToken = empJoin.data.employeeToken;

  const empAudit = await api('/api/employee/audit', {
    headers: { 'x-employee-token': empToken }
  });
  const clo001Item = empAudit.data.items.find((i: any) => i.variant_sku === 'CLO-001');

  // Employee enters count of 48 (expected was 50 -> shortage of -2)
  await api('/api/employee/count', {
    method: 'POST',
    headers: { 'x-employee-token': empToken },
    body: { variantId: clo001Item.variant_id, quantity: 48, note: 'Floor count' }
  });

  // 3. LEGITIMATE POST-SNAPSHOT STOCK MOVEMENT:
  // A sale happens between counting and reconciliation: 5 units sold!
  // Current inventory drops from 50 to 45
  console.log('Simulating sale of 5 units after count was submitted (current balance: 50 -> 45)...');
  const adjRes = await api('/api/inventory/adjust', {
    method: 'POST',
    headers: { authorization: `Bearer ${ownerToken}` },
    body: {
      businessId: 'demo-business-countly',
      branchId: 'demo-branch-main',
      variantId: clo001Item.variant_id,
      quantity: 45,
      reason: 'Sale of 5 units before reconciliation'
    }
  });
  if (adjRes.status !== 200) throw new Error('Adjust failed: ' + JSON.stringify(adjRes));

  // Verify inventory is indeed 45
  const invBefore = await api('/api/inventory?businessId=demo-business-countly&branchId=demo-branch-main', {
    headers: { authorization: `Bearer ${ownerToken}` }
  });
  console.log('invBefore response:', JSON.stringify(invBefore));
  const invItemBefore = invBefore.data.balances.find((i: any) => i.variant_id === clo001Item.variant_id);
  console.log(`Inventory balance before reconciliation: ${invItemBefore.quantity}`);
  if (invItemBefore.quantity !== 45) throw new Error('Inventory adjustment failed: ' + JSON.stringify(invItemBefore));

  // 4. Owner approves audit
  await api(`/api/audits/${auditId}/status`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${ownerToken}` },
    body: { businessId: 'demo-business-countly', status: 'approved' }
  });

  // 5. Owner reconciles inventory
  const reconcileRes = await api(`/api/audits/${auditId}/reconcile`, {
    method: 'POST',
    headers: { authorization: `Bearer ${ownerToken}` },
    body: { businessId: 'demo-business-countly' }
  });
  if (reconcileRes.status !== 200) throw new Error('Reconciliation failed: ' + JSON.stringify(reconcileRes));

  // 6. Check final inventory:
  // If naive absolute count: balance would be 48 (erasing the 5 units sold!).
  // With delta reconciliation: balance = 45 + (-2) = 43!
  const invAfter = await api('/api/inventory?businessId=demo-business-countly&branchId=demo-branch-main', {
    headers: { authorization: `Bearer ${ownerToken}` }
  });
  const invItemAfter = invAfter.data.balances.find((i: any) => i.variant_id === clo001Item.variant_id);
  console.log(`Inventory balance after reconciliation: ${invItemAfter.quantity}`);

  if (invItemAfter.quantity === 48) {
    throw new Error('FAILED: Naive overwrite detected! The 5 units sold after snapshot were erased!');
  }
  if (invItemAfter.quantity !== 43) {
    throw new Error(`FAILED: Expected 43 (45 + (-2) variance), but got ${invItemAfter.quantity}`);
  }

  console.log('✓ SUCCESS: Delta reconciliation preserved legitimate intervening stock sale! (45 - 2 = 43)');

  // Clean up
  try { if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch {}
}

testPostSnapshotMovement().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
