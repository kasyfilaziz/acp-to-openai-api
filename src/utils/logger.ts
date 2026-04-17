import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || '/tmp/acp-middleware';
const LOG_FILE = path.join(LOG_DIR, 'acp-middleware.log');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

function writeLog(level: string, message: string, meta?: Record<string, unknown>): void {
  ensureLogDir();
  const formatted = formatMessage(level, message, meta);
  
  if (level === 'error') {
    console.error(formatted.trim());
  } else {
    console.log(formatted.trim());
  }
  
  try {
    fs.appendFileSync(LOG_FILE, formatted);
  } catch (err) {
    console.error(`Failed to write to log file: ${err}`);
  }
}

function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['api_key', 'token', 'secret', 'password', 'credential', 'key'];
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key] as Record<string, unknown>);
    }
  }
  
  return redacted;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    writeLog('debug', message, meta ? redactSensitiveData(meta) : undefined);
  },
  
  info(message: string, meta?: Record<string, unknown>): void {
    writeLog('info', message, meta ? redactSensitiveData(meta) : undefined);
  },
  
  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog('warn', message, meta ? redactSensitiveData(meta) : undefined);
  },
  
  error(message: string, meta?: Record<string, unknown>): void {
    writeLog('error', message, meta ? redactSensitiveData(meta) : undefined);
  },
  
  logToolCall(toolName: string, args: Record<string, unknown>): void {
    writeLog('info', `[TOOL_CALL] ${toolName}`, { args: redactSensitiveData(args) });
  },
  
  logToolResult(toolName: string, result: unknown): void {
    writeLog('info', `[TOOL_RESULT] ${toolName}`, { result: redactSensitiveData(result as Record<string, unknown>) });
  }
};

export default logger;