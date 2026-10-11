// Frontend Structured Logger with remote shipping to backend storage
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const DEFAULT_PROD_URL = 'https://sixcardgame.onrender.com';
const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_URL : 'http://localhost:3001');

class ClientLogger {
  private isShipping = false;
  private pendingShipQueue: Array<{ level: LogLevel; category: string; message: string; metadata?: any }> = [];

  constructor() {
    // Attach global unhandled error handlers once in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('UNCAUGHT', event.message || 'Window error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        this.error('UNHANDLED_PROMISE', reason?.message || String(reason), {
          stack: reason?.stack,
        });
      });
    }
  }

  private formatConsole(level: LogLevel, category: string, message: string, metadata?: any) {
    const time = new Date().toLocaleTimeString();
    const prefix = `[SixCards ${time}] [${level}] [${category.toUpperCase()}]`;

    if (level === 'ERROR') {
      console.error(`%c${prefix} ${message}`, 'color: #f87171; font-weight: bold;', metadata || '');
    } else if (level === 'WARN') {
      console.warn(`%c${prefix} ${message}`, 'color: #fbbf24; font-weight: bold;', metadata || '');
    } else if (level === 'DEBUG') {
      console.debug(`%c${prefix} ${message}`, 'color: #94a3b8;', metadata || '');
    } else {
      console.log(`%c${prefix} ${message}`, 'color: #38bdf8; font-weight: bold;', metadata || '');
    }
  }

  public log(level: LogLevel, category: string, message: string, metadata?: any) {
    this.formatConsole(level, category, message, metadata);

    // Only forward WARN and ERROR (and key lifecycle INFO) to remote storage to preserve bandwidth
    if (level === 'ERROR' || level === 'WARN') {
      this.shipRemote(level, category, message, metadata);
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

  private shipRemote(level: LogLevel, category: string, message: string, metadata?: any) {
    this.pendingShipQueue.push({ level, category, message, metadata });
    if (this.pendingShipQueue.length > 20) {
      this.pendingShipQueue.shift(); // Drop oldest to avoid client memory buildup
    }

    if (this.isShipping) return;
    this.isShipping = true;

    setTimeout(async () => {
      const itemsToShip = [...this.pendingShipQueue];
      this.pendingShipQueue = [];

      for (const item of itemsToShip) {
        try {
          const body = JSON.stringify({
            level: item.level,
            category: item.category,
            message: item.message,
            metadata: {
              ...item.metadata,
              userAgent: navigator.userAgent.substring(0, 100),
              url: window.location.href,
            },
          });

          if (navigator.sendBeacon) {
            navigator.sendBeacon(`${SERVER_URL}/api/logs`, new Blob([body], { type: 'application/json' }));
          } else {
            await fetch(`${SERVER_URL}/api/logs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
              keepalive: true,
            });
          }
        } catch {
          // Never throw from remote logger
        }
      }
      this.isShipping = false;
    }, 1000);
  }
}

export const logger = new ClientLogger();
