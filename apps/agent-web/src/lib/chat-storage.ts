import type { ChatMessage, ChatSession } from '../types'

const STORAGE_KEY = 'chat-sessions'
const LAST_AGENT_KEY = 'last-agent-id'

let listeners: Array<() => void> = []
let cachedSessions: ChatSession[] | null = null

function readSessions(): ChatSession[] {
  if (cachedSessions !== null) return cachedSessions
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cachedSessions = raw ? JSON.parse(raw) : []
  } catch {
    cachedSessions = []
  }
  return cachedSessions!
}

function writeSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  cachedSessions = sessions
  for (const listener of listeners) {
    listener()
  }
}

export const chatStorage = {
  subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },

  getSnapshot(): ChatSession[] {
    return readSessions()
  },

  getSession(id: string): ChatSession | undefined {
    return readSessions().find((s) => s.id === id)
  },

  createSession(agentId: string, agentName: string): ChatSession {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: '新对话',
      agentId,
      agentName,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const sessions = readSessions()
    writeSessions([session, ...sessions])
    return session
  },

  addMessage(sessionId: string, message: ChatMessage) {
    const sessions = [...readSessions()]
    const idx = sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return
    const session = { ...sessions[idx]!, messages: [...sessions[idx]!.messages, message] }
    session.updatedAt = new Date().toISOString()
    sessions[idx] = session
    writeSessions(sessions)
  },

  updateSessionTitle(sessionId: string, title: string) {
    const sessions = [...readSessions()]
    const idx = sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return
    sessions[idx] = { ...sessions[idx]!, title, updatedAt: new Date().toISOString() }
    writeSessions(sessions)
  },

  deleteSession(id: string) {
    const sessions = readSessions().filter((s) => s.id !== id)
    writeSessions(sessions)
  },

  getLastAgentId(): string | null {
    return localStorage.getItem(LAST_AGENT_KEY)
  },

  setLastAgentId(id: string) {
    localStorage.setItem(LAST_AGENT_KEY, id)
  },
}
