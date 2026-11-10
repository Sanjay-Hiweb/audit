import { hashString } from './crypto.ts';

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number | bigint } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

// In Node environment, load DatabaseSync dynamically
let nodeDatabaseSync: any = null;
try {
  // @ts-ignore
  const sqlite = await import('node:sqlite');
  nodeDatabaseSync = sqlite.DatabaseSync;
} catch {
  // Not in Node or not supported
}

class NodeD1PreparedStatement implements D1PreparedStatement {
  private db: any;
  private sql: string;
  private params: unknown[];

  constructor(db: any, sql: string, params: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params: unknown[]): D1PreparedStatement {
    return new NodeD1PreparedStatement(this.db, this.sql, params);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...this.params);
      if (!rows || rows.length === 0) return null;
      const first = rows[0];
      return colName ? first[colName] : first;
    } catch (err) {
      console.error('SQL Error in first():', this.sql, this.params, err);
      throw err;
    }
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const results = stmt.all(...this.params) as T[];
      return { results, success: true, meta: {} };
    } catch (err) {
      console.error('SQL Error in all():', this.sql, this.params, err);
      throw err;
    }
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number | bigint } }> {
    try {
      const stmt = this.db.prepare(this.sql);
      const info = stmt.run(...this.params);
      return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
    } catch (err) {
      console.error('SQL Error in run():', this.sql, this.params, err);
      throw err;
    }
  }
}

export class NodeD1Database implements D1Database {
  private db: any;

  constructor(filePath: string) {
    if (!nodeDatabaseSync) {
      throw new Error('node:sqlite DatabaseSync is not available in this environment');
    }
    this.db = new nodeDatabaseSync(filePath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  }

  prepare(query: string): D1PreparedStatement {
    return new NodeD1PreparedStatement(this.db, query);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        const res = await stmt.all<T>();
        results.push(res);
      }
      this.db.exec('COMMIT;');
      return results;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  businesses: { id: string; name: string; role: 'owner' | 'manager'; branchId?: string }[];
}

export interface EmployeeSession {
  assignmentId: string;
  auditId: string;
  businessId: string;
  employeeName: string;
  auditName: string;
  branchId: string;
}

export async function getCurrentUser(request: Request, db: D1Database): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const tokenHash = await hashString(token);
  const user = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
    .first<{ id: string; email: string; display_name: string }>();

  if (!user) return null;

  // Retrieve user businesses and roles
  const { results: memberships } = await db
    .prepare(
      `SELECT b.id, b.name, bu.role, br.id as branch_id
       FROM businesses b
       JOIN business_users bu ON bu.business_id = b.id
       LEFT JOIN branches br ON br.business_id = b.id AND br.is_default = 1
       WHERE bu.user_id = ?`
    )
    .bind(user.id)
    .all<{ id: string; name: string; role: 'owner' | 'manager'; branch_id?: string }>();

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    businesses: memberships.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      branchId: m.branch_id
    }))
  };
}

export async function getEmployeeSession(request: Request, db: D1Database): Promise<EmployeeSession | null> {
  const tokenHeader = request.headers.get('x-employee-token') || '';
  const token = tokenHeader.trim();
  if (!token) return null;

  const tokenHash = await hashString(token);
  const session = await db
    .prepare(
      `SELECT aa.id as assignment_id, aa.audit_id, aa.business_id, aa.employee_name,
              a.name as audit_name, a.branch_id, a.status as audit_status
       FROM audit_assignments aa
       JOIN audits a ON a.id = aa.audit_id
       WHERE aa.access_token_hash = ? AND aa.status = 'active' AND aa.revoked_at IS NULL`
    )
    .bind(tokenHash)
    .first<{
      assignment_id: string;
      audit_id: string;
      business_id: string;
      employee_name: string;
      audit_name: string;
      branch_id: string;
      audit_status: string;
    }>();

  if (!session || session.audit_status === 'approved' || session.audit_status === 'archived') {
    return null;
  }

  return {
    assignmentId: session.assignment_id,
    auditId: session.audit_id,
    businessId: session.business_id,
    employeeName: session.employee_name,
    auditName: session.audit_name,
    branchId: session.branch_id
  };
}

export async function checkBusinessRole(
  userId: string,
  businessId: string,
  db: D1Database,
  allowedRoles: ('owner' | 'manager')[] = ['owner', 'manager']
): Promise<boolean> {
  const row = await db
    .prepare('SELECT role FROM business_users WHERE user_id = ? AND business_id = ?')
    .bind(userId, businessId)
    .first<{ role: 'owner' | 'manager' }>();

  if (!row) return false;
  return allowedRoles.includes(row.role);
}

