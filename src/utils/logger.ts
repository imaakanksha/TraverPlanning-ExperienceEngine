/**
 * Client-Side Structured Logger.
 * Formats payloads to match Google Cloud Logging / Operations Suite schemas
 * for seamless ingestion.
 */

export type LogSeverity = 'DEFAULT' | 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT';

export interface LogEntry {
  message: string;
  severity: LogSeverity;
  timestamp: string;
  metadata?: Record<string, any>;
  serviceContext?: {
    service: string;
    version: string;
  };
}

class CloudLogger {
  private serviceName = 'travel-planning-experience-engine';
  private version = '1.2.0';

  private write(severity: LogSeverity, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      message,
      severity,
      timestamp: new Date().toISOString(),
      metadata,
      serviceContext: {
        service: this.serviceName,
        version: this.version
      }
    };

    // Print JSON output formatted for cloud logs ingestion
    const logString = JSON.stringify(entry);

    switch (severity) {
      case 'DEBUG':
        console.debug(logString);
        break;
      case 'INFO':
      case 'NOTICE':
        console.info(logString);
        break;
      case 'WARNING':
        console.warn(logString);
        break;
      case 'ERROR':
      case 'CRITICAL':
      case 'ALERT':
        console.error(logString);
        break;
      default:
        console.log(logString);
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.write('DEBUG', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.write('INFO', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.write('WARNING', message, metadata);
  }

  error(message: string, error?: Error | string, metadata?: Record<string, any>) {
    const errorMsg = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.write('ERROR', message, {
      ...metadata,
      errorMessage: errorMsg,
      stack: errorStack
    });
  }

  critical(message: string, error?: Error | string, metadata?: Record<string, any>) {
    const errorMsg = error instanceof Error ? error.message : error;
    this.write('CRITICAL', message, {
      ...metadata,
      errorMessage: errorMsg
    });
  }
}

export const logger = new CloudLogger();
export default logger;
