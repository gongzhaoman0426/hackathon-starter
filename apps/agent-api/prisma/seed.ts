import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种数据...');

  // 清理现有数据（按外键依赖顺序删除）
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.agentTool.deleteMany();
  await prisma.agentToolkit.deleteMany();
  await prisma.agentKnowledgeBase.deleteMany();
  await prisma.agentWorkflow.deleteMany();
  await prisma.workflowAgent.deleteMany();
  await prisma.file.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.workFlow.deleteMany();
  // 不清理 tool / toolkit —— 它们由代码在 NestJS 启动时自动同步
  await prisma.user.deleteMany();

  console.log('清理完成');

  // ========== 创建种子用户 ==========
  // 智能体、知识库、工作流等业务数据由用户登录后通过前端页面创建。
  // 工具包和工具由代码中的 @toolkitId 装饰器定义，NestJS 启动时自动同步到数据库。
  // 因此 seed 只负责创建可登录的用户账号。

  const hashedPassword = await bcrypt.hash('123456', 10);

  await prisma.user.create({
    data: {
      username: 'demo',
      password: hashedPassword,
    },
  });

  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  console.log('');
  console.log('数据播种完成！');
  console.log('创建的用户:');
  console.log('   - demo  / 123456');
  console.log('   - admin / 123456');
}

main()
  .catch((e) => {
    console.error('播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
