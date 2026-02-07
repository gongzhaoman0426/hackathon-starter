import { Outlet } from 'react-router-dom'
import { ChatSidebar } from './ChatSidebar'

export function ChatLayout() {
  return (
    <div className="flex min-h-svh w-full">
      <ChatSidebar />
      <main className="relative flex w-full flex-1 flex-col bg-background">
        <Outlet />
      </main>
    </div>
  )
}
