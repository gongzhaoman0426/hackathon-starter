import { Routes, Route } from 'react-router-dom'
import { ChatLayout } from './components/chat/ChatLayout'
import { ChatPage } from './components/chat/ChatPage'
import { ManageLayout } from './components/manage/ManageLayout'
import { Agents } from './pages/Agents'
import { Toolkits } from './pages/Toolkits'
import { Workflows } from './pages/Workflows'
import { KnowledgeBases } from './pages/KnowledgeBases'

function App() {
  return (
    <Routes>
      <Route element={<ChatLayout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat/:sessionId" element={<ChatPage />} />
      </Route>
      <Route element={<ManageLayout />}>
        <Route path="/manage/agents" element={<Agents />} />
        <Route path="/manage/toolkits" element={<Toolkits />} />
        <Route path="/manage/workflows" element={<Workflows />} />
        <Route path="/manage/knowledge-bases" element={<KnowledgeBases />} />
      </Route>
    </Routes>
  )
}

export default App
