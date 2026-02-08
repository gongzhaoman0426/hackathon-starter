import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { ToolsType } from '../interface/toolkit';
import { PrismaService } from 'src/prisma/prisma.service';

@toolkitId('workflow-toolkit-01')
export class WorkflowToolkit extends BaseToolkit {
  name = 'Workflow Toolkit';
  description = '工作流工具包，允许智能体发现和执行工作流';
  tools: ToolsType[] = [];
  settings = {};
  private readonly logger = new Logger(WorkflowToolkit.name);
  private lastAgentId: string | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  private async getWorkflowService() {
    // Dynamic import to avoid circular dependency (WorkflowModule -> ToolsModule)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WorkflowService } = require('../../workflow/workflow.service');
    return this.moduleRef.get(WorkflowService, { strict: false });
  }

  private extractInputSchema(dsl: any): Record<string, string> {
    try {
      const startEvent = dsl?.events?.find(
        (e: any) => e.type === 'WORKFLOW_START',
      );
      return startEvent?.data || {};
    } catch {
      return {};
    }
  }

  private dslDataToJsonSchema(data: Record<string, string>) {
    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      const type = typeof value === 'string' ? value : 'string';
      properties[key] = { type, description: key };
      required.push(key);
    }

    return {
      type: 'object' as const,
      properties,
      required,
    };
  }

  private sanitizeToolName(dslId: string): string {
    return 'workflow_' + dslId.replace(/[^a-zA-Z0-9]/g, '_');
  }

  async getTools(): Promise<ToolsType[]> {
    const agentId = this.agentId as string;

    if (this.lastAgentId === agentId && this.tools.length > 0) {
      return this.tools;
    }

    this.logger.log(`[WorkflowToolkit] Generating tools for agentId=${agentId}`);

    const agentWorkflows = await this.prismaService.agentWorkflow.findMany({
      where: { agentId },
      include: { workflow: true },
    });

    const workflows = agentWorkflows
      .map((aw: any) => aw.workflow)
      .filter((wf: any) => !wf.deleted);

    if (workflows.length === 0) {
      this.tools = [];
      this.lastAgentId = agentId;
      return this.tools;
    }

    const llamaindexModules = await this.llamaindexService.getLlamaindexModules();
    const FunctionTool = llamaindexModules.FunctionTool;

    this.tools = workflows.map((wf: any) => {
      const dslId = wf.DSL?.id || wf.id;
      const toolName = this.sanitizeToolName(dslId);
      const inputData = this.extractInputSchema(wf.DSL);
      const parametersSchema = this.dslDataToJsonSchema(inputData);
      const workflowId = wf.id;

      return FunctionTool.from(
        async (input: Record<string, any>) => {
          const startTime = Date.now();
          this.logger.log(
            `[Tool:${toolName}] Called, workflowId=${workflowId}, agentId=${agentId}`,
          );
          try {
            const workflowService = await this.getWorkflowService();
            const result = await workflowService.executeWorkflow(
              workflowId,
              input,
            );
            const elapsed = Date.now() - startTime;
            this.logger.log(`[Tool:${toolName}] Completed (${elapsed}ms)`);
            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            this.logger.error(
              `[Tool:${toolName}] Error: ${error.message}`,
              error.stack,
            );
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: toolName,
          description: wf.description || wf.name || toolName,
          parameters: parametersSchema,
        },
      );
    });

    this.lastAgentId = agentId;
    this.logger.log(
      `[WorkflowToolkit] Generated ${this.tools.length} workflow tools: ${this.tools.map((t: any) => t.metadata?.name).join(', ')}`,
    );

    return this.tools;
  }

  validateSettings(): void {
    // agentId 由 setAgentContext 设置，不再通过 settings 校验
  }
}
