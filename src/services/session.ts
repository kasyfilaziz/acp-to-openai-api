import type { ACPSessionId, SessionState } from '../agents/types.js';
import logger from '../utils/logger.js';
import fs from 'node:fs';

export interface SessionRegistry {
  create(acpSessionId: string): string;
  get(internalSessionId: string): SessionState | undefined;
  getByAcpId(acpSessionId: string): SessionState | undefined;
  getInternalIdByAcpId(acpSessionId: string): string | undefined;
  lock(internalSessionId: string): boolean;
  unlock(internalSessionId: string): void;
  delete(internalSessionId: string): void;
  getPersistentSessionId(): string | undefined;
  setPersistentSessionId(acpSessionId: string): void;
}

const PERSISTENT_SESSION_FILE = '.acp_session';

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

  getInternalIdByAcpId(acpSessionId: ACPSessionId): string | undefined {
    return this.acpToInternal.get(acpSessionId);
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

  getPersistentSessionId(): string | undefined {
    try {
      if (fs.existsSync(PERSISTENT_SESSION_FILE)) {
        return fs.readFileSync(PERSISTENT_SESSION_FILE, 'utf-8').trim();
      }
    } catch (err) {
      logger.warn('Failed to read persistent session file', { error: String(err) });
    }
    return undefined;
  }

  setPersistentSessionId(acpSessionId: string): void {
    try {
      fs.writeFileSync(PERSISTENT_SESSION_FILE, acpSessionId, 'utf-8');
      logger.info('Persistent session ID saved', { acpSessionId });
    } catch (err) {
      logger.warn('Failed to write persistent session file', { error: String(err) });
    }
  }
}

export const sessionRegistry = new InMemorySessionRegistry();

export default sessionRegistry;