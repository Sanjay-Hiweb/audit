import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeD1Database } from './functions/api/db.ts';
import worker from './functions/api/worker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function countlyApiPlugin(): Plugin {
  return {
    name: 'countly-api-plugin',
    async configureServer(server) {
      const dataDir = path.resolve(__dirname, '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const dbPath = path.resolve(dataDir, 'countly.sqlite');
      const d1 = new NodeD1Database(dbPath);

      // Apply initial migration if needed
      const migrationFile = path.resolve(__dirname, 'migrations/0001_initial.sql');
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf-8');
        await d1.exec(sql);
      }

      // Safe schema patches for existing databases
      try { await d1.exec('ALTER TABLE audits ADD COLUMN reconciled_at TEXT;'); } catch {}
      try {
        await d1.exec(`
          CREATE TABLE IF NOT EXISTS security_rate_limits (
            key TEXT PRIMARY KEY,
            attempts INTEGER NOT NULL DEFAULT 1,
            locked_until TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch {}

      // Automatically seed demo data if no businesses exist
      const checkBiz = await d1.prepare('SELECT COUNT(*) as cnt FROM businesses').first<{ cnt: number }>();
      if (!checkBiz || checkBiz.cnt === 0) {
        console.log('[Countly] Initializing local database with demo business data...');
        const seedReq = new Request('http://localhost:5173/api/demo/seed', { method: 'POST' });
        await worker.fetch(seedReq, { DB: d1 });
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        try {
          const url = `http://${req.headers.host || 'localhost:5173'}${req.url}`;
          const method = req.method || 'GET';

          // Read body for POST/PUT/DELETE
          let bodyBuffer: Buffer | null = null;
          if (method !== 'GET' && method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            bodyBuffer = Buffer.concat(chunks);
          }

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) {
              if (Array.isArray(val)) {
                val.forEach(v => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          const webReq = new Request(url, {
            method,
            headers,
            body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined
          });

          const webRes = await worker.fetch(webReq, { DB: d1 });

          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          const resBuffer = await webRes.arrayBuffer();
          res.end(Buffer.from(resBuffer));
        } catch (err: any) {
          console.error('[Countly API Middleware Error]', err);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
        }
      });
    }
  };
}

