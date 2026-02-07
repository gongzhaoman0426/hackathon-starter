import { useSyncExternalStore, useCallback } from 'react'
import { chatStorage } from '../lib/chat-storage'
import type { ChatMessage, ChatSession } from '../types'

export function useChatSessions() {
  const sessions = useSyncExternalStore(
    chatStorage.subscribe,
    chatStorage.getSnapshot,
    chatStorage.getSnapshot,
  )

  const getSession = useCallback((id: string) => {
    return chatStorage.getSession(id)
  }, [])

  const createSession = useCallback((agentId: string, agentName: string) => {
    return chatStorage.createSession(agentId, agentName)
  }, [])

  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    chatStorage.addMessage(sessionId, message)
  }, [])

  const deleteSession = useCallback((id: string) => {
    chatStorage.deleteSession(id)
  }, [])

  return { sessions, getSession, createSession, addMessage, deleteSession }
}

export function useChatSession(id: string | undefined): ChatSession | undefined {
  const sessions = useSyncExternalStore(
    chatStorage.subscribe,
    chatStorage.getSnapshot,
    chatStorage.getSnapshot,
  )
  return id ? sessions.find((s) => s.id === id) : undefined
}
