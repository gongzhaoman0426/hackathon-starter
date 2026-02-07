import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Bot, Plus, MessageSquare, Trash2, Wrench, BookOpen, Sparkles } from 'lucide-react'
import { useAgents, useCreateAgent, useDeleteAgent } from '../services/agent.service'
import { useToolkits } from '../services/toolkit.service'
import { useKnowledgeBases } from '../services/knowledge-base.service'
import type { CreateAgentDto } from '../types'

export function Agents() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const { data: toolkits = [], isLoading: toolkitsLoading } = useToolkits()
  const { data: knowledgeBases = [], isLoading: kbLoading } = useKnowledgeBases()
  const createAgentMutation = useCreateAgent()
  const deleteAgentMutation = useDeleteAgent()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateAgentDto>({
    name: '',
    description: '',
    prompt: '',
    options: {},
    toolkits: [],
    knowledgeBases: []
  })

  const loading = agentsLoading || toolkitsLoading || kbLoading

  const handleCreate = async () => {
    if (!formData.name || !formData.prompt) return

    try {
      await createAgentMutation.mutateAsync(formData)
      setCreateDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        prompt: '',
        options: {},
        toolkits: [],
        knowledgeBases: []
      })
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个智能体吗？')) return

    try {
      console.log('开始删除智能体:', id)
      await deleteAgentMutation.mutateAsync(id)
      console.log('删除智能体成功:', id)
    } catch (error) {
      console.error('删除智能体失败:', error)
      alert('删除失败: ' + (error as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">智能体管理</h1>
              <p className="text-sm text-muted-foreground">创建和管理您的AI智能体</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          创建智能体
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Bot className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-muted-foreground">智能体总数</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Wrench className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{toolkits.length}</p>
              <p className="text-xs text-muted-foreground">可用工具包</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <BookOpen className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{knowledgeBases.length}</p>
              <p className="text-xs text-muted-foreground">知识库数量</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <Card key={agent.id} className="group relative overflow-hidden border transition-all hover:shadow-md hover:border-primary/20">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5 line-clamp-1">
                        {agent.description || '暂无描述'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Prompt Preview */}
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">提示词</p>
                  <p className="text-xs leading-relaxed line-clamp-2">
                    {agent.prompt.length > 100
                      ? `${agent.prompt.substring(0, 100)}...`
                      : agent.prompt
                    }
                  </p>
                </div>

                {/* Toolkits & Knowledge Bases */}
                <div className="space-y-2">
                  {agent.agentToolkits && agent.agentToolkits.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                      {agent.agentToolkits.map((at: any) => (
                        <Badge key={at.id} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          {at.toolkit.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {agent.agentKnowledgeBases && agent.agentKnowledgeBases.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      {agent.agentKnowledgeBases.map((akb: any) => (
                        <Badge key={akb.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                          {akb.knowledgeBase.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Link to={`/?agent=${agent.id}`} className="flex-1">
                    <Button className="w-full gap-1.5" size="sm" variant="default">
                      <MessageSquare className="h-3.5 w-3.5" />
                      对话测试
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(agent.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无智能体</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              创建您的第一个智能体，配置工具包和知识库，开始智能对话
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              创建智能体
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>创建智能体</DialogTitle>
                <DialogDescription>
                  配置您的AI智能体的基本信息和能力
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入智能体名称"
                  />
                </div>

                <div>
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入智能体描述"
                  />
                </div>

                <div>
                  <Label htmlFor="prompt">系统提示词 *</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="输入智能体的系统提示词，定义其行为和能力"
                    rows={6}
                  />
                </div>
              </div>

              <Separator />

              {/* 能力配置 */}
              <Tabs defaultValue="toolkits" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="toolkits" className="gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    工具包配置
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    知识库配置
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="toolkits" className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">选择工具包</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      为智能体选择所需的工具包，提供不同的功能能力
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {toolkits.map((toolkit) => (
                        <div key={toolkit.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <input
                            type="checkbox"
                            id={`toolkit-${toolkit.id}`}
                            checked={formData.toolkits?.some((t: any) => t.toolkitId === toolkit.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  toolkits: [...(formData.toolkits || []), { toolkitId: toolkit.id }]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  toolkits: formData.toolkits?.filter((t: any) => t.toolkitId !== toolkit.id) || []
                                })
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`toolkit-${toolkit.id}`} className="font-medium cursor-pointer">
                              {toolkit.name}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {toolkit.description}
                            </p>
                            {toolkit.tools && toolkit.tools.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {toolkit.tools.slice(0, 3).map((tool: any) => (
                                  <Badge key={tool.id} variant="outline" className="text-xs">
                                    {tool.name}
                                  </Badge>
                                ))}
                                {toolkit.tools.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{toolkit.tools.length - 3} 更多
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="knowledge" className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">选择知识库</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      为智能体选择相关的知识库，提供专业领域知识支持
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {knowledgeBases.map((kb: any) => (
                        <div key={kb.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <input
                            type="checkbox"
                            id={`kb-${kb.id}`}
                            checked={formData.knowledgeBases?.includes(kb.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  knowledgeBases: [...(formData.knowledgeBases || []), kb.id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  knowledgeBases: formData.knowledgeBases?.filter((id: string) => id !== kb.id) || []
                                })
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`kb-${kb.id}`} className="font-medium cursor-pointer">
                              {kb.name}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {kb.description || '暂无描述'}
                            </p>
                            {kb.files && kb.files.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {kb.files.filter((f: any) => f.status === 'PROCESSED').length} 个已训练文件
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  共 {kb.files.length} 个文件
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {knowledgeBases.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>暂无可用的知识库</p>
                          <p className="text-sm mt-1">
                            您可以先到 <Link to="/manage/knowledge-bases" className="text-primary hover:underline">知识库管理</Link> 创建知识库
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createAgentMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createAgentMutation.isPending || !formData.name || !formData.prompt}
            >
              {createAgentMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
