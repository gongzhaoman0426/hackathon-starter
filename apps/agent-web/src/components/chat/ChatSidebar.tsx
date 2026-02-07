import { Link, useLocation } from 'react-router-dom'
import { Plus, Bot, Wrench, GitBranch, BookOpen } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { useSidebar } from '../../hooks/use-sidebar'
import { ChatSidebarHistory } from './ChatSidebarHistory'

const manageNav = [
  { name: '智能体管理', href: '/manage/agents', icon: Bot },
  { name: '工具包', href: '/manage/toolkits', icon: Wrench },
  { name: '工作流', href: '/manage/workflows', icon: GitBranch },
  { name: '知识库', href: '/manage/knowledge-bases', icon: BookOpen },
]

export function ChatSidebar() {
  const { open, setOpen, closeMobile } = useSidebar()
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Desktop: in-flow wrapper that reserves space when open */}
      <div
        className={cn(
          'hidden lg:block shrink-0 transition-[width] duration-200 ease-linear',
          open ? 'w-[16rem]' : 'w-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-svh w-[16rem] flex-col bg-sidebar transition-transform duration-200 ease-linear',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 shrink-0">
          <Link
            to="/"
            className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted"
            onClick={closeMobile}
          >
            Chatbot
          </Link>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/" onClick={closeMobile}>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Plus size={16} />
                    <span className="sr-only">新建聊天</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>新建聊天</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          <ChatSidebarHistory />
        </div>

        {/* Manage navigation */}
        <div className="shrink-0">
          <Separator />
          <div className="px-2 py-2">
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">管理</div>
            {manageNav.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon size={16} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3">
          <p className="text-xs text-sidebar-foreground/50 text-center">
            智能体平台 v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
