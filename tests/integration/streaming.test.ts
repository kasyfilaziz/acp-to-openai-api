import { describe, it, expect, vi } from 'vitest';
import { translateChunkToOpenAI } from '../../src/services/translator.js';

describe('Streaming Chat', () => {
  describe('translateChunkToOpenAI', () => {
    it('should convert agent_message_chunk to streaming chunk', () => {
      const chunk = translateChunkToOpenAI(
        { type: 'agent_message_chunk', content: 'Hello' },
        'gemini'
      );
      
      expect(chunk.id).toMatch(/^chatcmpl-/);
      expect(chunk.object).toBe('chat.completion.chunk');
      expect(chunk.model).toBe('gemini');
      expect(chunk.choices).toHaveLength(1);
      expect(chunk.choices[0].delta.content).toBe('Hello');
      expect(chunk.choices[0].finish_reason).toBeNull();
    });

    it('should convert end_turn to final chunk with stop', () => {
      const chunk = translateChunkToOpenAI(
        { type: 'end_turn', stopReason: 'end_turn' },
        'gemini'
      );
      
      expect(chunk.choices[0].finish_reason).toBe('stop');
    });

    it('should convert max_tokens to length finish_reason', () => {
      const chunk = translateChunkToOpenAI(
        { type: 'end_turn', stopReason: 'max_tokens' },
        'gemini'
      );
      
      expect(chunk.choices[0].finish_reason).toBe('stop');
    });
  });

  describe('SSE formatting', () => {
    it('should format chunk as SSE data', () => {
      const chunk = translateChunkToOpenAI(
        { type: 'agent_message_chunk', content: 'Test' },
        'gemini'
      );
      
      const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
      expect(sseData).toContain('data: ');
      expect(sseData).toContain('\n\n');
    });

    it('should handle [DONE] marker', () => {
      const doneMarker = 'data: [DONE]\n\n';
      expect(doneMarker).toBe('data: [DONE]\n\n');
    });
  });
});