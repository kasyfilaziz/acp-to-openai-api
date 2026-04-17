import type { ACPSessionId, SessionState } from '../agents/types.js';
import logger from '../utils/logger.js';

export interface SessionRegistry {
  create(acpSessionId: string): string;
  get(internalSessionId: string): SessionState | undefined;
  getByAcpId(acpSessionId: string): SessionState | undefined;
  lock(internalSessionId: string): boolean;
  unlock(internalSessionId: string): void;
  delete(internalSessionId: string): void;
}

class InMemorySessionRegistry implements SessionRegistry {
  private sessions: Map<string, SessionState> = new Map();
  private acpToInternal: Map<ACPSessionId, string> = new Map();
  private nextInternalId = 1;

  create(acpSessionId: ACPSessionId): string {
    const internalId = `session-${this.nextInternalId++}`;
    const session: SessionState = {
      sessionId: acpSessionId,
      lastAccessed: Date.now(),
      isBusy: false
    };
    
    this.sessions.set(internalId, session);
    this.acpToInternal.set(acpSessionId, internalId);
    
    logger.debug('Session created', { internalId, acpSessionId });
    return internalId;
  }

  get(internalSessionId: string): SessionState | undefined {
    const session = this.sessions.get(internalSessionId);
    if (session) {
      session.lastAccessed = Date.now();
    }
    return session;
  }

  getByAcpId(acpSessionId: ACPSessionId): SessionState | undefined {
    const internalId = this.acpToInternal.get(acpSessionId);
    if (internalId) {
      return this.get(internalId);
    }
    return undefined;
  }

  lock(internalSessionId: string): boolean {
    const session = this.sessions.get(internalSessionId);
    if (!session) {
      return false;
    }
    
    if (session.isBusy) {
      logger.warn('Session is busy, cannot lock', { internalSessionId });
      return false;
    }
    
    session.isBusy = true;
    return true;
  }

  unlock(internalSessionId: string): void {
    const session = this.sessions.get(internalSessionId);
    if (session) {
      session.isBusy = false;
      session.lastAccessed = Date.now();
      logger.debug('Session unlocked', { internalSessionId });
    }
  }

  delete(internalSessionId: string): void {
    const session = this.sessions.get(internalSessionId);
    if (session) {
      this.acpToInternal.delete(session.sessionId);
      this.sessions.delete(internalSessionId);
      logger.debug('Session deleted', { internalSessionId });
    }
  }
}

export const sessionRegistry = new InMemorySessionRegistry();

export default sessionRegistry;