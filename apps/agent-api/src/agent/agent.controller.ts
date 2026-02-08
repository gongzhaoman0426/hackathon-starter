import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async findAll() {
    return this.agentService.findAll();
  }

  // 会话端点（必须在 :id 路由之前注册，避免路由冲突）
  @Get('sessions/all')
  async getAllSessions() {
    return this.agentService.getAllSessions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Post()
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentService.create(createAgentDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentService.update(id, updateAgentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }

  @Post(':id/chat')
  async chat(
    @Param('id') id: string,
    @Body() chatDto: ChatWithAgentDto,
  ) {
    return this.agentService.chatWithAgent(id, chatDto);
  }

  @Post(':id/chat/stream')
  async chatStream(
    @Param('id') id: string,
    @Body() chatDto: ChatWithAgentDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.agentService.chatWithAgentStream(id, chatDto)) {
        res.write(`event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`);
      }
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`);
    }
    res.end();
  }

  @Get(':id/toolkits')
  async getAgentToolkits(@Param('id') id: string) {
    return this.agentService.getAgentToolkits(id);
  }

  @Get(':id/sessions')
  async getAgentSessions(@Param('id') id: string) {
    return this.agentService.getAgentSessions(id);
  }

  @Get(':id/sessions/:sessionId')
  async getSessionDetail(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.agentService.getSessionDetail(id, sessionId);
  }

  @Delete(':id/sessions/:sessionId')
  async deleteSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.agentService.deleteSession(id, sessionId);
  }
}
