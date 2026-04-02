<div align="center">

# Oh-My-OpenClaw (OmOC)

[![GitHub Stars](https://img.shields.io/github/stars/lileilei-camera/oh-my-openclaw?color=ffcb47&labelColor=black&style=flat-square)](https://github.com/lileilei-camera/oh-my-openclaw/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/lileilei-camera/oh-my-openclaw?color=ff80eb&labelColor=black&style=flat-square)](https://github.com/lileilei-camera/oh-my-openclaw/issues)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](https://github.com/lileilei-camera/oh-my-openclaw/blob/master/LICENSE)

**OmO，但运行在 Discord 和 Telegram 上。不是你的终端。**

[OpenClaw](https://openclaw.ai) 的智能体编排 —— 让 [OmO](https://github.com/code-yeongyu/oh-my-opencode) 不可阻挡的模式，现在在你聊天的每个地方运行。

[English](#installation) | [中文](#中文安装指南)

</div>

---

## 跳过这个 README

适合急性子：

```bash
openclaw plugins install @happycastle/oh-my-openclaw
openclaw omoc-setup
```

现在打开你的消息频道，输入 `/omoc`。完成。

---

## 这是什么？

OmO 风格的多智能体编排，用于 OpenClaw。你的 AI 智能体获得 11 个专业化角色、基于类别的路由，以及自我纠正的执行循环 —— 全部通过 Discord、Telegram 或 OpenClaw 支持的任何消息频道。

---

## 特性

| 特性 | 功能 |
|------|------|
| **3 层架构** | 规划 → 编排 → 执行 → 验证。没有捷径。 |
| **类别路由** | 自动为每个任务选择最佳模型 —— quick、deep、ultrabrain 或 visual。 |
| **Ultrawork 模式** | 一个命令。完整的规划到验证流程。`/ultrawork` 然后走开。 |
| **Ralph Loop** | 自我纠正的执行。从不停止在半途。硬上限 100 次迭代。 |
| **Todo Enforcer** | 强制任务完成。没有"我完成了"的谎言。每个步骤都跟踪。 |
| **Comment Checker** | 11 个正则表达式模式，检测并消灭 AI 废话注释。 |
| **Gemini CLI** | 原生多模态 —— PDF、图片、视频分析通过 tmux 集成。 |
| **OmO Delegation** | 通过 ACP 会话将编码任务路由到 OpenCode。完整的 OmO 能力。 |
| **Checkpoints** | 保存/加载执行状态。崩溃恢复。从离开的地方继续。 |
| **11 个智能体** | 专业化团队：规划者、工作者、审查者。每个都有工作。 |
| **智能体设置 CLI** | `omoc-setup` 将智能体配置注入 `openclaw.json5` 用于子智能体生成。 |
| **13 个技能文档** | 核心技能 + 工作流/参考技能捆绑在 `plugin/skills/` 中。 |
| **2 个健康命令** | `/omoc_health` 用于插件检查，`/omoc_config` 用于掩码配置检查。 |
| **4 个工作流命令** | `/omoc`、`/ultrawork`、`/plan`、`/start_work` —— 角色激活 + 可执行管道。 |
| **5 个操作技能** | opencode-controller、tmux、tmux-agents、workflow-auto-rescue、workflow-tool-patterns —— tmux/OmO 委派 + 恢复。 |

---

## 智能体角色

这些不是通用的"助手"提示。每个智能体都有个性和任务。

| 智能体 | 个性 |
|-------|------|
| **Atlas** | 指挥家。不演奏乐器。确保完美和谐。 |
| **Prometheus** | 面试官。在你开始之前不会让你知道你想要什么。 |
| **Sisyphus-Junior** | 工作马。专注。自律。不完成不停止。 |
| **Oracle** | 架构师。只读。昂贵。值得每个 token。 |
| **Hephaestus** | 工匠。给他一个难题，一小时后回来。 |
| **Metis** | 差距发现者。发现其他人都错过的东西。 |
| **Momus** | 评论家。你的计划有漏洞 —— Momus 会发现它们。 |
| **Explore** | 侦察兵。知道代码库中的一切在哪里。 |
| **Librarian** | 研究员。文档、知识、上下文 —— 按需。 |
| **Multimodal Looker** | 眼睛。截图、PDF、UI 审查 —— 看到文本看不到的。 |
| **Frontend** | 设计师。像素完美的 UI，不需要模型图。 |

---

## 前置条件

- [OpenClaw](https://openclaw.ai) 已安装并运行（gateway 模式）
- 配置了消息频道（Discord、Telegram 等）
- *（可选）* [OpenCode](https://opencode.ai) —— 用于编码委派
- *（可选）* [Gemini CLI](https://ai.google.dev/) —— 用于多模态分析

---

## 中文安装指南

### 安装

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

一个命令。技能、钩子、工具 —— 全部自动注册。

### 智能体设置

注册 11 个内置智能体角色为 OpenClaw 子智能体：

```bash
openclaw omoc-setup
```

交互式向导带你完成提供者选择。使用 `--force` 覆盖现有配置，`--dry-run` 预览更改。

### 验证

发送这个给你的 OpenClaw 智能体：

> "阅读 oh-my-openclaw 技能并告诉我它是做什么的"

如果它回复了描述，你就好了。

---

## 配置

一切都在 `config/categories.json` 中。一个文件。所有旋钮。

### 模型路由

每个类别映射到一个模型。随时更换：

```json
{
  "categories": {
    "quick": {
      "model": "claude-sonnet-4-6",
      "alternatives": ["gpt-5.3-codex-spark", "gemini-3-flash"]
    },
    "deep": {
      "model": "claude-opus-4-6-thinking",
      "alternatives": ["gpt-5.3-codex", "gemini-3.1-pro"]
    },
    "ultrabrain": {
      "model": "gpt-5.3-codex",
      "alternatives": ["claude-opus-4-6-thinking"]
    },
    "visual-engineering": {
      "model": "gemini-3.1-pro",
      "alternatives": ["claude-opus-4-6-thinking"]
    }
  }
}
```

编辑 `"model"` 字段。完成。`"alternatives"` 显示还有什么可用。

---

## 架构

```
┌──────────────────────────────────────────────────────────┐
│                      OpenClaw Agent                       │
│                    (Main Orchestrator)                     │
├──────────┬───────────┬────────────────┬──────────────────┤
│  Discord │ Telegram  │    Browser     │  Node Devices    │
│  Channel │   Bot     │   Control      │  (Camera, etc.)  │
└────┬─────┴─────┬─────┴────────┬───────┴──────┬───────────┘
     │           │              │              │
     ▼           ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              oh-my-openclaw Skill Layer                   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Layer 1: PLANNING                          │ │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │ Prometheus  │ │  Metis   │ │  Momus   │          │ │
│  │  │ (Planner)   │ │ (Gaps)   │ │ (Review) │          │ │
│  │  └─────┬──────┘ └────┬─────┘ └────┬─────┘          │ │
│  ├────────┼─────────────┼────────────┼─────────────────┤ │
│  │        ▼             ▼            ▼                  │ │
│  │           Layer 2: ORCHESTRATION                     │ │
│  │  ┌──────────────────────────────────────────┐       │ │
│  │  │              Atlas                        │       │ │
│  │  │   (Task Distribution + Verification)      │       │ │
│  │  └────┬────┬────┬────┬────┬────┬────────────┘       │ │
│  ├───────┼────┼────┼────┼────┼────┼────────────────────┤ │
│  │       ▼    ▼    ▼    ▼    ▼    ▼                     │ │
│  │           Layer 3: WORKERS                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │ │
│  │  │Sissy │ │Hepha │ │Oracle│ │Explo │ │Librarian │ │ │
│  │  │Junior│ │estus │ │      │ │re    │ │          │ │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘ │ │
│  │                    ┌──────────────┐                  │ │
│  │                    │ Multimodal   │                  │ │
│  │                    │ Looker       │                  │ │
│  │                    └──────────────┘                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │  ACP: opencode   │    │  tmux: gemini               │  │
│  │  (OmO Coding)    │    │  (Multimodal Analysis)      │  │
│  └─────────────────┘    └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 类别 → 模型映射

| 类别 | 默认模型 | 替代模型 | 用例 |
|------|---------|---------|------|
| `quick` | Claude Sonnet 4.6 | GPT 5.3 Spark, Gemini 3 Flash | 简单修复、搜索 |
| `deep` | Claude Opus 4.6 | GPT 5.3 Codex, Gemini 3.1 Pro | 复杂重构 |
| `ultrabrain` | GPT 5.3 Codex | Claude Opus 4.6, Gemini 3.1 Pro High | 架构决策 |
| `visual-engineering` | Gemini 3.1 Pro | Claude Opus 4.6 | UI/UX、视觉分析 |
| `multimodal` | Gemini 2.5 Flash | Gemini 3.1 Pro | PDF/图片/视频通过 CLI |

### 智能体角色

| 层 | 智能体 | 角色 | 类别 |
|----|-------|------|------|
| **规划** | **Prometheus** | 战略规划师 —— 访谈、创建分阶段计划 | ultrabrain |
| | **Metis** | 差距分析师 —— 在执行前发现缺失的上下文 | deep |
| | **Momus** | 计划审查者 —— 批评并发现阻碍 | deep |
| **编排** | **Atlas** | 任务分发器 —— 将计划分解为单元、验证 | ultrabrain |
| **工作者** | **Sisyphus-Junior** | 主要编码者 —— 快速实现、bug 修复 | quick |
| | **Hephaestus** | 深度工作者 —— 复杂重构、架构 | deep |
| | **Oracle** | 架构师 —— 设计决策、根本原因分析 | ultrabrain |
| | **Explore** | 搜索专家 —— 代码库探索 | quick |
| | **Librarian** | 文档和研究 —— 知识检索 | quick |
| | **Multimodal Looker** | 视觉分析师 —— 截图、UI、PDF 审查 | visual-engineering |

### 技能

| 技能 | 触发词 | 描述 |
|------|--------|------|
| `git-master` | commit, rebase, squash, blame | 原子提交、rebase 手术 |
| `frontend-ui-ux` | UI, UX, frontend, design, CSS | 设计优先的 UI 开发 |
| `comment-checker` | comment check, AI slop | 反 AI 废话质量守卫 |
| `gemini-look-at` | look at, PDF, screenshot | Gemini CLI 多模态分析 |
| `steering-words` | ultrawork, search, analyze | 关键词检测、模式路由 |
| `delegation-prompt` | delegate, sub-agent | 7 元素委派提示指南 |
| `multimodal-analysis` | multimodal, image analysis | 分析模式模板 |
| `web-search` | web search, exa, context7 | OmO websearch MCP 集成（Exa + Context7 + grep.app） |

### 工作流命令

| 工作流 | 命令 | 发生什么 |
|--------|------|---------|
| `omoc` | `/omoc` | 激活 OmOC 模式（角色注入）。`/omoc list` 查看全部，`/omoc <name>` 切换 |
| `ultrawork` | `/ultrawork` | 完整规划 → 执行 → 验证 |
| `plan` | `/plan` | 仅规划（Prometheus + Momus） |
| `start_work` | `/start_work` | 执行现有计划 |

> **注意：** Discord 斜杠命令由 OpenClaw 核心注册，目前只注册内置命令。插件命令在 Discord 中作为基于文本的 `/commands` 工作，但不会出现在斜杠命令自动完成菜单中。这是 OpenClaw 核心限制，不是 OmOC 问题。

### 操作技能

这些告知智能体 tmux 委派和恢复的行为。

| 技能 | 目的 |
|------|------|
| `opencode-controller` | 通过 ACP 会话将编码任务委派给 OpenCode/OmO |
| `tmux` | 多会话 tmux 编排（并行编码 + 验证） |
| `tmux-agents` | 生成/监控编码智能体（Claude、Codex、Gemini、Ollama）在 tmux 中 |
| `workflow-tool-patterns` | OmO 工具 → OpenClaw 工具映射参考 |
| `workflow-auto-rescue` | 基于检查点的失败恢复 |

---

## OmO vs Oh-My-OpenClaw

相同的 DNA。不同的运行时。

| 方面 | OmO (Oh-My-OpenCode) | Oh-My-OpenClaw |
|------|---------------------|----------------|
| **平台** | OpenCode 插件（终端） | OpenClaw 技能（消息 + Web） |
| **格式** | TypeScript 运行时钩子 | Markdown 提示 + **TypeScript 插件** |
| **智能体** | 11 个（TypeScript） | 11 个（TypeScript AgentConfig + Markdown） |
| **钩子** | 55+ 运行时拦截器 | 5 个插件钩子 + 基于工作流 |
| **工具** | 17 个自定义工具 | 3 个插件工具 + OpenClaw 原生 |
| **技能** | 4 个内置 | 7 个技能文档 |
| **频道** | 仅终端 | Discord、Telegram、Web 等 |
| **记忆** | 会话范围 | Graphiti 知识图谱 |
| **设备** | 本地机器 | 多节点（手机、IoT 等） |

---

## 插件（`@happycastle/oh-my-openclaw`）

TypeScript 插件。通过 OpenClaw 插件 API 在代码级别强制执行编排模式。

### 安装

```bash
cd plugin
npm install && npm run build
```

### 提供什么

| 类型 | 名称 | 描述 |
|------|------|------|
| 钩子 | `todo-enforcer` | 在 `agent:bootstrap` 上注入 TODO 继续 |
| 钩子 | `comment-checker` | 11 个正则表达式模式在 `tool_result_persist` 上消灭 AI 废话 |
| 钩子 | `message-monitor` | 审计日志 + 消息计数器在 `message:sent` 上 |
| 钩子 | `message-received-monitor` | 入站消息审计在 `message:received` 上 |
| 钩子 | `gateway-startup` | 插件激活日志在 `gateway:startup` 上 |
| CLI | `omoc-setup` | 注入 11 个智能体配置到 `openclaw.json5` |
| 工具 | `omoc_delegate` | 基于类别的任务委派与模型路由（原生子智能体） |
| 工具 | `omo_delegate` | 通过 ACP 会话将编码任务委派给 OmO（OpenCode） |
| 工具 | `omoc_look_at` | 通过 Gemini CLI + tmux 进行多模态分析 |
| 工具 | `omoc_checkpoint` | 保存/加载/列出执行检查点 |
| 命令 | `/omoc` | 激活/切换/列出 OmOC 角色 |
| 命令 | `/ultrawork` | 完整规划 → 执行 → 验证 |
| 命令 | `/plan` | 规划工作流 |
| 命令 | `/start_work` | 执行现有计划 |
| 命令 | `/ralph_loop` | 启动自我纠正执行循环 |
| 命令 | `/ralph_stop` | 停止 ralph 循环 |
| 命令 | `/omoc_status` | 插件状态摘要 |
| 命令 | `/omoc_health` | 插件健康检查（自动回复） |
| 命令 | `/omoc_config` | 显示配置与掩码敏感值 |
| 服务 | `ralph-loop` | 后台循环 —— 硬上限 100 次迭代 |

### 脚本

```bash
npm run build      # 编译 TypeScript
npm run typecheck  # 类型检查不输出
npm run test       # 运行 vitest（167 个测试）
```

### 发布

```bash
git tag v0.1.0
git push origin v0.1.0  # 触发 .github/workflows/publish.yml
```

需要在 GitHub 仓库设置中配置 `NPM_TOKEN` 密钥。

---

## 文档

| 文档 | 内容 |
|------|------|
| [概览](docs/guide/overview.md) | 大图 —— OmOC 是什么以及为什么 |
| [安装](docs/guide/installation.md) | 逐步设置指南 |
| [编排](docs/guide/orchestration.md) | 3 层系统如何工作 |
| [特性参考](docs/reference/features.md) | 每个特性，解释 |
| [配置](docs/reference/configuration.md) | 所有配置选项 |
| [相似性分析](docs/SIMILARITY.md) | OmO → OmOC 移植分析 |

---

## 致谢

- [Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode) 由 [@code-yeongyu](https://github.com/code-yeongyu) —— 原创。模式。哲学。
- [OpenClaw](https://openclaw.ai) —— 使消息频道编排成为可能的运行时。

---

## Star History

<a href="https://star-history.com/#lileilei-camera/oh-my-openclaw&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=lileilei-camera/oh-my-openclaw&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=lileilei-camera/oh-my-openclaw&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=lileilei-camera/oh-my-openclaw&type=Date" />
 </picture>
</a>

---

## 许可证

MIT — [@lileilei-camera](https://github.com/lileilei-camera)
