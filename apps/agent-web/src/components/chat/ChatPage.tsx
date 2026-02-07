import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useChatSessions, useChatSession } from '../../hooks/use-chat-sessions'
import { useChatWithAgent, useAgents } from '../../services/agent.service'
import { chatStorage } from '../../lib/chat-storage'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '../../types'

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { createSession, addMessage } = useChatSessions()
  const session = useChatSession(sessionId)
  const chatMutation = useChatWithAgent()
  const { data: agents = [] } = useAgents()

  const agentFromUrl = searchParams.get('agent') || ''
  const lastAgentId = chatStorage.getLastAgentId()
  const [selectedAgentId, setSelectedAgentId] = useState(
    () => session?.agentId || agentFromUrl || lastAgentId || ''
  )

  const currentAgentId = session?.agentId || selectedAgentId
  const currentAgent = agents.find((a) => a.id === currentAgentId)
  const messages = session?.messages || []

  const handleAgentChange = useCallback(
    (agentId: string) => {
      setSelectedAgentId(agentId)
      chatStorage.setLastAgentId(agentId)
    },
    []
  )

  const handleSend = useCallback(
    async (content: string) => {
      if (!currentAgentId) return

      let activeSessionId = sessionId

      // Create session on first message
      if (!activeSessionId) {
        const agentName = currentAgent?.name || '智能体'
        const newSession = createSession(currentAgentId, agentName)
        activeSessionId = newSession.id
        navigate(`/chat/${newSession.id}`, { replace: true })
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      addMessage(activeSessionId, userMessage)

      try {
        const response = await chatMutation.mutateAsync({
          id: currentAgentId,
          data: { message: content, context: {} },
        })

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        }
        addMessage(activeSessionId, assistantMessage)
      } catch {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，发生了错误，请稍后重试。',
          timestamp: new Date().toISOString(),
        }
        addMessage(activeSessionId, errorMessage)
      }
    },
    [currentAgentId, sessionId, currentAgent, createSession, addMessage, navigate, chatMutation]
  )

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader />
      <ChatMessages
        messages={messages}
        isLoading={chatMutation.isPending}
      />
      <ChatInput
        onSend={handleSend}
        disabled={!currentAgentId || chatMutation.isPending}
        isLoading={chatMutation.isPending}
        agentId={currentAgentId}
        onAgentChange={handleAgentChange}
        agentLocked={!!session}
      />
    </div>
  )
}
