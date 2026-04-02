# Agent 模型配置指南

## 📝 配置文件位置

**`~/.openclaw/workspace/oh-my-openclaw/plugin/config/agent-models.json`**

修改此文件后**无需重新编译**，重启 OpenClaw Gateway 即可生效！

---

## 🎯 当前配置（Bailian 模型）

```json
{
  "agents": {
    "omoc_prometheus": {
      "primary": "bailian/qwen3-max-2026-01-23",
      "fallbacks": ["bailian/qwen3.5-plus"]
    },
    "omoc_atlas": {
      "primary": "bailian/qwen3.5-plus",
      "fallbacks": ["bailian/glm-5"]
    },
    "omoc_sisyphus": {
      "primary": "bailian/qwen3-coder-plus",
      "fallbacks": ["bailian/qwen3-coder-next"]
    },
    "omoc_hephaestus": {
      "primary": "bailian/qwen3-coder-plus",
      "fallbacks": ["bailian/MiniMax-M2.5"]
    },
    "omoc_oracle": {
      "primary": "bailian/qwen3-max-2026-01-23",
      "fallbacks": ["bailian/qwen3.5-plus"]
    },
    "omoc_explore": {
      "primary": "bailian/qwen3-coder-next"
    },
    "omoc_librarian": {
      "primary": "bailian/qwen3.5-plus"
    },
    "omoc_metis": {
      "primary": "bailian/qwen3-max-2026-01-23",
      "fallbacks": ["bailian/qwen3.5-plus"]
    },
    "omoc_momus": {
      "primary": "bailian/qwen3-max-2026-01-23",
      "fallbacks": ["bailian/qwen3.5-plus"]
    },
    "omoc_looker": {
      "primary": "bailian/kimi-k2.5",
      "fallbacks": ["bailian/qwen3.5-plus"]
    },
    "omoc_frontend": {
      "primary": "bailian/kimi-k2.5",
      "fallbacks": ["bailian/qwen3-coder-plus"]
    }
  }
}
```

---

## ✏️ 如何修改模型

### 格式 1：带备用模型
```json
"omoc_prometheus": {
  "primary": "bailian/qwen3-max-2026-01-23",
  "fallbacks": ["bailian/qwen3.5-plus"]
}
```

### 格式 2：单一模型
```json
"omoc_explore": {
  "primary": "bailian/qwen3-coder-next"
}
```

---

## 🔄 生效步骤

1. 编辑 `config/agent-models.json`
2. 保存文件
3. 重启 OpenClaw Gateway：
   ```bash
   openclaw gateway restart
   ```
4. 完成！新模型立即生效

---

## 📋 可用 Bailian 模型

从 `~/.openclaw/agents/main/agent/models.json` 查看：

- `bailian/qwen3.5-plus` - 通用，1M 上下文，支持图像
- `bailian/qwen3-max-2026-01-23` - 高端推理，256K 上下文
- `bailian/qwen3-coder-next` - 编码快速，256K 上下文
- `bailian/qwen3-coder-plus` - 编码增强，1M 上下文
- `bailian/MiniMax-M2.5` - 推理模型，1M 上下文
- `bailian/glm-5` - GLM 模型，200K 上下文
- `bailian/glm-4.7` - GLM 旧版，200K 上下文
- `bailian/kimi-k2.5` - Moonshot，256K 上下文，支持图像

---

## 🎭 Agent 职责说明

| Agent | 职责 | 推荐模型类型 |
|-------|------|-------------|
| 🔥 Prometheus | 战略规划 | 高端推理 |
| 🗺️ Atlas | 任务编排 | 平衡型 |
| 🪨 Sisyphus-Junior | 主要编码 | 编码专用 |
| 🔨 Hephaestus | 深度编码 | 编码专用 |
| 🏛️ Oracle | 架构顾问 | 高端推理 |
| 🔍 Explore | 代码搜索 | 快速编码 |
| 📚 Librarian | 文档研究 | 大上下文 |
| 🧠 Metis | 预规划分析 | 高端推理 |
| 🎭 Momus | 计划审查 | 高端推理 |
| 👁️ Multimodal Looker | 视觉分析 | 多模态（支持图像） |
| 🎨 Frontend | 前端工程 | 多模态 + 编码 |

---

## ⚠️ 注意事项

1. **JSON 格式必须正确** - 使用 JSON 验证器检查语法
2. **Agent ID 必须匹配** - 使用完整的 `omoc_xxx` 格式
3. **模型名称必须存在** - 确保模型在 `models.json` 中定义
4. **修改后必须重启 Gateway** - 配置在插件加载时读取

---

## 🐛 故障排查

如果修改后未生效：

1. 检查 JSON 语法：
   ```bash
   cat config/agent-models.json | jq .
   ```

2. 查看 Gateway 日志：
   ```bash
   tail -f ~/.openclaw/openclaw-*.log | grep omoc
   ```

3. 确认模型名称正确：
   ```bash
   cat ~/.openclaw/agents/main/agent/models.json | jq '.providers.bailian.models[].id'
   ```

---

**最后更新**: 2026-04-02
**版本**: Oh-My-OpenClaw v0.21.3
