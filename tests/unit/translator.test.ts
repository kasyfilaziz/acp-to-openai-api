import { describe, it, expect } from 'vitest';
import { translateMessagesToContentBlocks } from '../../src/services/translator.js';

describe('translator', () => {
  describe('translateMessagesToContentBlocks', () => {
    it('should handle string content', () => {
      const messages = [
        { role: 'user', content: 'hello' }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: 'hello' }]);
    });

    it('should handle array content blocks', () => {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'part 1' },
            { type: 'text', text: 'part 2' }
          ]
        }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: 'part 1\npart 2' }]);
    });

    it('should handle object content with numeric keys', () => {
      const messages = [
        {
          role: 'user',
          content: {
            '0': { type: 'text', text: 'part 1' },
            '1': { type: 'text', text: 'part 2' }
          }
        }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: 'part 1\npart 2' }]);
    });

    it('should handle mixed roles and pick the last user message', () => {
      const messages = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'second' }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: 'second' }]);
    });

    it('should fallback to last message if no user role is present', () => {
      const messages = [
        { role: 'system', content: 'sys' },
        { role: 'assistant', content: 'assistant' }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: 'assistant' }]);
    });

    it('should handle null content', () => {
      const messages = [
        { role: 'user', content: null }
      ];
      const result = translateMessagesToContentBlocks(messages);
      expect(result).toEqual([{ type: 'text', text: '' }]);
    });
  });
});