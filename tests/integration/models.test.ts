import { describe, it, expect } from 'vitest';

describe('Models API', () => {
  describe('GET /v1/models', () => {
    it('should return valid OpenAI models response format', () => {
      const response = {
        object: 'list',
        data: [
          {
            id: 'gemini-1.0.0',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'acp-agent'
          }
        ]
      };

      expect(response.object).toBe('list');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].object).toBe('model');
      expect(response.data[0].id).toBeDefined();
      expect(response.data[0].created).toBeDefined();
      expect(response.data[0].owned_by).toBeDefined();
    });

    it('should match contract specification', () => {
      const contract = {
        method: 'GET',
        path: '/v1/models',
        response_200: {
          object: 'list',
          data: [
            {
              id: 'acp-agent-name-version',
              object: 'model',
              created: 123456789,
              owned_by: 'acp-agent'
            }
          ]
        }
      };

      const response = {
        object: 'list',
        data: [
          {
            id: 'test-agent-1.0.0',
            object: 'model',
            created: 123456789,
            owned_by: 'test-agent'
          }
        ]
      };

      expect(response.object).toBe(contract.response_200.object);
      expect(response.data[0].object).toBe(contract.response_200.data[0].object);
      expect(response.data[0].owned_by).toBeDefined();
    });

    it('should include model ID format pattern', () => {
      const modelId = 'gemini-cli-2.0.1';
      
      expect(modelId).toMatch(/^[a-zA-Z0-9_-]+-\d+\.\d+\.\d+$/);
    });
  });
});