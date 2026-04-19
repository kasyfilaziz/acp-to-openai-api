import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { translateMessagesToContentBlocks, translateResponseToOpenAI } from '../../src/services/translator.js';
import type { ContentBlock } from '@agentclientprotocol/sdk';

describe('Completions API', () => {
  describe('translateMessagesToContentBlocks', () => {
    it('should convert a simple user message to ContentBlock', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const blocks = translateMessagesToContentBlocks(messages);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
      expect((blocks[0] as any).text).toBe('Hello');
    });

    it('should handle multiple messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      const blocks = translateMessagesToContentBlocks(messages);
      
      expect(blocks).toHaveLength(2);
    });

    it('should handle empty content', () => {
      const messages = [{ role: 'user', content: null }];
      const blocks = translateMessagesToContentBlocks(messages);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('text');
      expect((blocks[0] as any).text).toBe('');
    });
  });

  describe('translateResponseToOpenAI', () => {
    it('should convert ACP response to OpenAI format', () => {
      const response = translateResponseToOpenAI('Hello world', 'end_turn', 'gemini', 'session-123');
      
      expect(response.id).toMatch(/^chatcmpl-/);
      expect(response.object).toBe('chat.completion');
      expect(response.model).toBe('gemini');
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.choices[0].message.content).toBe('Hello world');
      expect(response.choices[0].finish_reason).toBe('stop');
      expect(response.session_id).toBe('session-123');
    });

    it('should map max_tokens to length finish_reason', () => {
      const response = translateResponseToOpenAI('Hello', 'max_tokens', 'gemini', 'session-123');
      
      expect(response.choices[0].finish_reason).toBe('length');
    });

    it('should map unknown stop reasons to stop', () => {
      const response = translateResponseToOpenAI('Hello', 'cancelled', 'gemini', 'session-123');
      
      expect(response.choices[0].finish_reason).toBe('stop');
    });
  });
});