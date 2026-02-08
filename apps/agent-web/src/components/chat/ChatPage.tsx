import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useChatSession } from '../../hooks/use-chat-sessions'
import { useChatWithAgent, useAgents } from '../../services/agent.service'
import { queryKeys } from '../../lib/query-keys'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '../../types'

const LAST_AGENT_KEY = 'last-agent-id'

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const chatMutation = useChatWithAgent()
  const { data: agents = [] } = useAgents()

  const agentFromUrl = searchParams.get('agent') || ''
  const lastAgentId = localStorage.getItem(LAST_AGENT_KEY)
  const [selectedAgentId, setSelectedAgentId] = useState(
    () => agentFromUrl || lastAgentId || ''
  )

  const { data: session } = useChatSession(
    agentFromUrl || selectedAgentId || undefined,
    sessionId,
  )

  const currentAgentId = session?.agentId || selectedAgentId
  const currentAgent = agents.find((a) => a.id === currentAgentId)
  const messages = session?.messages || []

  const handleAgentChange = useCallback(
    (agentId: string) => {
      setSelectedAgentId(agentId)
      localStorage.setItem(LAST_AGENT_KEY, agentId)
    },
    []
  )

  const handleSend = useCallback(
    async (content: string) => {
      if (!currentAgentId) return

      let activeSessionId = sessionId
      const isFirstMessage = !sessionId

      // 首次消息：前端生成 sessionId，导航到新会话
      if (!activeSessionId) {
        activeSessionId = crypto.randomUUID()
        navigate(`/chat/${activeSessionId}?agent=${currentAgentId}`, { replace: true })
      }

      // 乐观更新：立即显示用户消息
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        sessionId: activeSessionId,
        createdAt: new Date().toISOString(),
      }

      const sessionQueryKey = queryKeys.chatSession(currentAgentId, activeSessionId)
      queryClient.setQueryData(sessionQueryKey, (old: any) => {
        if (!old) {
          return {
            id: activeSessionId,
            title: '新对话',
            agentId: currentAgentId,
            agentName: currentAgent?.name || '智能体',
            messages: [userMessage],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
        return { ...old, messages: [...old.messages, userMessage] }
      })

      try {
        const response = await chatMutation.mutateAsync({
          id: currentAgentId,
          data: {
            message: content,
            sessionId: activeSessionId,
            context: {},
            generateTitle: isFirstMessage,
          },
        })

        // 乐观更新：追加助手回复
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.response,
          sessionId: activeSessionId,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData(sessionQueryKey, (old: any) => {
          if (!old) return old
          return { ...old, messages: [...old.messages, assistantMessage] }
        })

        // 首次消息后刷新侧边栏会话列表（标题已生成）
        if (isFirstMessage) {
          queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions() })
        }
      } catch {
        // 乐观更新：追加错误消息
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '抱歉，发生了错误，请稍后重试。',
          sessionId: activeSessionId,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData(sessionQueryKey, (old: any) => {
          if (!old) return old
          return { ...old, messages: [...old.messages, errorMessage] }
        })
      }
    },
    [currentAgentId, sessionId, currentAgent, navigate, chatMutation, queryClient]
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
