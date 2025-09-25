/**
 * Centralized logging utility
 * Only logs in development mode (NODE_ENV === 'development')
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface LogData {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: string, component: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
  }

  private shouldLog(): boolean {
    return isDevelopment;
  }

  private shouldLogError(): boolean {
    // Errors and warnings should always be logged, even in production
    return true;
  }

  private log(level: string, component: string, message: string, data?: LogData): void {
    if (!this.shouldLog()) return;

    const formattedMessage = this.formatMessage(level, component, message);
    
    if (data) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  }

  debug(component: string, message: string, data?: LogData): void {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: LogData): void {
    this.log('info', component, message, data);
  }

  warn(component: string, message: string, data?: LogData): void {
    if (!this.shouldLogError()) return;

    const formattedMessage = this.formatMessage('warn', component, message);
    
    if (data) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }

  error(component: string, message: string, data?: LogData): void {
    if (!this.shouldLogError()) return;

    const formattedMessage = this.formatMessage('error', component, message);
    
    if (data) {
      console.error(formattedMessage, data);
    } else {
      console.error(formattedMessage);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for convenience
export default logger;
