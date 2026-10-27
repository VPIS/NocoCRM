# NocoCRM

[English](README.MD) | 中文

**给你的销售，配一支 7×24 的 Agent 团队。**

NocoCRM 是基于 [NocoBase 3](https://www.nocobase.com) 的开源 B2B 销售 CRM。它内置 6 个销售 Agent，并集成邮箱与 WhatsApp：自动跟进线索与商机，即时回复来信，审批时帮你分析。Agent 给建议，人来拍板。

https://github.com/user-attachments/assets/00beda1b-878e-42d8-8bf6-d986831a0a23

[在线体验](https://solutions-cn.nocobase.com/crm/) · [官网介绍](https://www.nocobase.com/zh-CN/solution-crm/)

## 能做什么

- **不用靠人惦记。** 新线索、新商机、客户回信、任务完成、每天早晨的巡检，Agent 都会自动触发，读完上下文后把下一步建议送进收件箱，写明结论、把握和依据。只有你采纳后才修改记录。
- **全渠道归到一条时间线。** 每个人连接自己的邮箱，公司连接 WhatsApp Business 号码。来信自动匹配到线索和联系人，回复起草好，由你的账号发出。
- **一支销售 Agent 团队。** 可以对话的销售专家，加上线索跟进、商机跟进、审批助手、任务助手和公司情报，各有触发条件、技能和运行记录。
- **审批不再卡壳。** 审批助手对照你的规则和历史同类，核算折扣和条款，给审批人起草建议和审批意见。
- **规矩你定，代码你有。** 用几句话把价格、折扣上限和跟进节奏写进业务指导，每个 Agent 都照着做；让编程 Agent 直接改 CRM 的源码。开源、可私有部署，完全属于你。
- **从线索到成交。** 线索、公司、联系人、商机、任务、审批和报表，按角色由服务端逐条控制记录权限，界面支持 12 种语言。

## 快速开始

### 1. 安装

**用编程 Agent 安装。** 最简单的方式。在要放 NocoCRM 的目录里打开 Claude Code、Codex 或 Cursor，告诉它：

```text
从 https://github.com/nocobase/NocoCRM 安装 NocoCRM 并启动，按仓库的 AGENTS.md 和 README 操作。
```

**手动安装。** 需要 Node.js 24 或更高版本和 pnpm 11（`corepack enable`）。数据默认存在一个 SQLite 文件里，也可以用 PostgreSQL 和 MySQL。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. 登录

打开 `pnpm dev` 打印的 `Local:` 地址（通常是 `http://127.0.0.1:13000/main/`），用 `nocobase` 和密码 `admin123` 登录。

### 3. 导入演示数据

页面顶部的横幅会提示导入，也可以打开 **设置 → 演示数据**。它会加入一个销售团队，带有客户、商机、任务、审批、邮件和对话；正式使用前在同一页移除。

### 4. 配置 AI 模型

在 **Agent 团队 → 模型** 里添加一个模型服务并填入密钥，比如 DeepSeek、OpenAI、Claude、Gemini 或通义千问。助手和各个 Agent 需要它，其他功能都不需要。

[使用指南](docs/guide.zh-CN.md)介绍上手步骤、演示账号、角色、配置（AI、邮件、WhatsApp、数据库）、部署和开发。

## 许可证

[Apache License 2.0](LICENSE)
