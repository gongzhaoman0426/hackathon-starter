import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useChatSession } from '../../hooks/use-chat-sessions'
import { useAgents } from '../../services/agent.service'
import { apiClient } from '../../lib/api'
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
  const { data: agents = [] } = useAgents()
  const [isStreaming, setIsStreaming] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const assistantMsgIdRef = useRef<string>('')

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

      const assistantMsgId = crypto.randomUUID()
      assistantMsgIdRef.current = assistantMsgId
      let assistantCreated = false

      setIsStreaming(true)
      setIsBusy(true)

      try {
        await apiClient.streamChatWithAgent(
          currentAgentId,
          {
            message: content,
            sessionId: activeSessionId,
            context: {},
            generateTitle: isFirstMessage,
          },
          (delta) => {
            if (!assistantCreated) {
              // 第一个 delta 到达：创建助手消息，关闭 ThinkingIndicator
              assistantCreated = true
              const assistantMessage: ChatMessage = {
                id: assistantMsgId,
                role: 'assistant',
                content: delta,
                sessionId: activeSessionId!,
                createdAt: new Date().toISOString(),
              }
              queryClient.setQueryData(sessionQueryKey, (old: any) => {
                if (!old) return old
                return { ...old, messages: [...old.messages, assistantMessage] }
              })
              setIsStreaming(false)
            } else {
              // 后续 delta：追加内容
              queryClient.setQueryData(sessionQueryKey, (old: any) => {
                if (!old) return old
                const msgs = old.messages.map((m: ChatMessage) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + delta }
                    : m
                )
                return { ...old, messages: msgs }
              })
            }
          },
        )

        // 首次消息后刷新侧边栏会话列表（标题已生成）
        if (isFirstMessage) {
          queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions() })
        }
      } catch {
        // 错误时：如果助手消息还没创建，先创建一条
        if (!assistantCreated) {
          const errorMsg: ChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            content: '抱歉，发生了错误，请稍后重试。',
            sessionId: activeSessionId!,
            createdAt: new Date().toISOString(),
          }
          queryClient.setQueryData(sessionQueryKey, (old: any) => {
            if (!old) return old
            return { ...old, messages: [...old.messages, errorMsg] }
          })
        } else {
          queryClient.setQueryData(sessionQueryKey, (old: any) => {
            if (!old) return old
            const msgs = old.messages.map((m: ChatMessage) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content || '抱歉，发生了错误，请稍后重试。' }
                : m
            )
            return { ...old, messages: msgs }
          })
        }
      } finally {
        setIsStreaming(false)
        setIsBusy(false)
      }
    },
    [currentAgentId, sessionId, currentAgent, navigate, queryClient]
  )

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader />
      <ChatMessages
        messages={messages}
        isLoading={isStreaming}
      />
      <ChatInput
        onSend={handleSend}
        disabled={!currentAgentId || isBusy}
        isLoading={isBusy}
        agentId={currentAgentId}
        onAgentChange={handleAgentChange}
        agentLocked={!!session}
      />
    </div>
  )
}
