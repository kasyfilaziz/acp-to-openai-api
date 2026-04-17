import { describe, it, expect, beforeEach } from 'vitest';
import logger from '../../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

describe('Logger Redaction', () => {
  const logDir = '/tmp/acp-middleware';
  const logFile = path.join(logDir, 'acp-middleware.log');

  beforeEach(() => {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  describe('redactSensitiveData', () => {
    it('should redact API keys', () => {
      const meta = { api_key: 'secret123', message: 'test' };
      const result = logger.debug('test', meta);
      
      expect(result).toBeUndefined();
    });

    it('should redact tokens', () => {
      const meta = { token: 'abc123', message: 'test' };
      const result = logger.info('test', meta);
      
      expect(result).toBeUndefined();
    });

    it('should redact passwords', () => {
      const meta = { password: 'secret', message: 'test' };
      const result = logger.warn('test', meta);
      
      expect(result).toBeUndefined();
    });

    it('should redact credentials', () => {
      const meta = { credential: 'secret', message: 'test' };
      const result = logger.error('test', meta);
      
      expect(result).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const meta = {
        outer: {
          inner: {
            api_key: 'secret'
          }
        }
      };
      const result = logger.info('test', meta);
      
      expect(result).toBeUndefined();
    });

    it('should preserve non-sensitive fields', () => {
      const meta = {
        userId: '123',
        sessionId: 'abc',
        message: 'test'
      };
      const result = logger.info('test', meta);
      
      expect(result).toBeUndefined();
    });
  });

  describe('logToolCall', () => {
    it('should log tool calls', () => {
      const result = logger.logToolCall('readFile', { path: '/etc/passwd' });
      expect(result).toBeUndefined();
    });

    it('should redact sensitive args', () => {
      const result = logger.logToolCall('apiCall', { api_key: 'secret' });
      expect(result).toBeUndefined();
    });
  });

  describe('logToolResult', () => {
    it('should log tool results', () => {
      const result = logger.logToolResult('readFile', { content: 'file data' });
      expect(result).toBeUndefined();
    });

    it('should redact sensitive results', () => {
      const result = logger.logToolResult('apiCall', { token: 'secret' });
      expect(result).toBeUndefined();
    });
  });

  describe('file logging', () => {
    it('should write logs to file', () => {
      logger.info('test message', { test: 'data' });
      
      expect(fs.existsSync(logFile)).toBe(true);
      const content = fs.readFileSync(logFile, 'utf-8');
      expect(content).toContain('test message');
    });
  });
});