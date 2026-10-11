import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogSource = 'backend' | 'frontend';

export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  category: string;
  message: string;
  metadata?: any;
  timestamp?: string;
}

class SystemLogger {
  private logQueue: LogEntry[] = [];
  private isFlushing = false;
  private flushTimer: any = null;

  constructor() {
    // Periodically flush queued logs to persistent database (every 3 seconds)
    this.flushTimer = setInterval(() => {
      this.flushQueue().catch(() => {});
    }, 3000);

    // Initial log retention cleanup
    setTimeout(() => {
      this.cleanupOldLogs().catch(() => {});
    }, 5000);

    // Daily retention cleanup
    setInterval(() => {
      this.cleanupOldLogs().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  }

  private formatConsole(level: LogLevel, category: string, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata && Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] [${category.toUpperCase()}] ${message}${metaStr}`;
  }

  public log(level: LogLevel, category: string, message: string, metadata?: any, source: LogSource = 'backend') {
    const formatted = this.formatConsole(level, category, message, metadata);

    // Stream directly to stdout / stderr for Render / Vercel log ingestion
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Queue for persistent PostgreSQL storage (avoids in-memory bloat or server disk usage)
    if (this.logQueue.length < 500) {
      this.logQueue.push({
        level,
        source,
        category,
        message,
        metadata: metadata ? (typeof metadata === 'object' ? metadata : { data: metadata }) : {},
        timestamp: new Date().toISOString(),
      });
    }

    if (this.logQueue.length >= 25) {
      this.flushQueue().catch(() => {});
    }
  }

  public info(category: string, message: string, metadata?: any) {
    this.log('INFO', category, message, metadata);
  }

  public warn(category: string, message: string, metadata?: any) {
    this.log('WARN', category, message, metadata);
  }

  public error(category: string, message: string, metadata?: any) {
    this.log('ERROR', category, message, metadata);
  }

  public debug(category: string, message: string, metadata?: any) {
    this.log('DEBUG', category, message, metadata);
  }

  public recordClientLog(entry: { level: LogLevel; category?: string; message: string; metadata?: any }) {
    this.log(entry.level || 'INFO', entry.category || 'CLIENT', entry.message, entry.metadata, 'frontend');
  }

  private async flushQueue() {
    if (this.isFlushing || this.logQueue.length === 0) return;
    this.isFlushing = true;
    const batch = [...this.logQueue];
    this.logQueue = [];

    try {
      const db = await getDatabase();
      for (const item of batch) {
        await db.query(
          `INSERT INTO app_logs (level, source, category, message, metadata, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [item.level, item.source, item.category, item.message, JSON.stringify(item.metadata || {}), item.timestamp || new Date().toISOString()]
        ).catch(() => {});
      }
    } catch {
      // In-memory or database transient error fallback: do not crash application
    } finally {
      this.isFlushing = false;
    }
  }

  public async getRecentLogs(limit = 100, level?: string, source?: string) {
    try {
      const db = await getDatabase();
      let query = 'SELECT * FROM app_logs';
      const params: any[] = [];
      const conditions: string[] = [];

      if (level) {
        params.push(level.toUpperCase());
        conditions.push(`level = $${params.length}`);
      }
      if (source) {
        params.push(source.toLowerCase());
        conditions.push(`source = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      params.push(Math.min(limit, 500));
      query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

      const res = await db.query(query, params);
      return res.rows;
    } catch {
      return [];
    }
  }

  public async cleanupOldLogs() {
    try {
      const db = await getDatabase();
      // Keep only logs from the last 7 days to preserve Supabase storage
      await db.query(`DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '7 days'`).catch(() => {});
      // Also cap to newest 5,000 entries max
      await db.query(`
        DELETE FROM app_logs
        WHERE id NOT IN (
          SELECT id FROM app_logs ORDER BY timestamp DESC LIMIT 5000
        )
      `).catch(() => {});
    } catch {
      // Non-critical cleanup
    }
  }

  /**
   * Express HTTP Request Logging Middleware (Formatted for Render / Vercel)
   */
  public httpMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const origin = req.headers.origin || req.ip || 'internal';
      const userAgent = req.headers['user-agent'] || 'unknown';

      res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

        // Filter out routine health checks from polluting logs if status is 200
        if (req.path === '/api/health' && statusCode === 200) {
          return;
        }

        this.log(
          level,
          'HTTP',
          `${req.method} ${req.originalUrl || req.url} - ${statusCode} (${duration}ms)`,
          {
            origin,
            ip: req.ip,
            status: statusCode,
            durationMs: duration,
            userAgent: userAgent.substring(0, 80),
          }
        );
      });

      next();
    };
  }
}

export const logger = new SystemLogger();
