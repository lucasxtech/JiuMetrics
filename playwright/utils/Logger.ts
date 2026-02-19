/**
 * Logger - Sistema de logging para testes
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

class TestLogger {
  private logs: LogEntry[] = [];
  private enabled: boolean = true;

  /**
   * Habilita/desabilita logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log de debug
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Log de info
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log de warning
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Log de erro
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Log interno
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    this.logs.push(entry);

    if (this.enabled) {
      const prefix = this.getPrefix(level);
      console.log(`${prefix} [${entry.timestamp.toISOString()}] ${message}`, data || '');
    }
  }

  /**
   * Prefixo colorido por nível
   */
  private getPrefix(level: LogLevel): string {
    const prefixes: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return prefixes[level];
  }

  /**
   * Retorna todos os logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Limpa os logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Formata logs para relatório
   */
  getReport(): string {
    return this.logs
      .map(log => `[${log.level.toUpperCase()}] ${log.timestamp.toISOString()} - ${log.message}`)
      .join('\n');
  }
}

export const Logger = new TestLogger();
