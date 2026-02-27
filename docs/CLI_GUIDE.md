# CLI 使用指南

本指南介绍如何使用 Figma-to-Code Agent 的命令行界面（CLI）。

## 目录

- [安装](#安装)
- [基本用法](#基本用法)
- [交互式模式](#交互式模式)
- [批处理模式](#批处理模式)
- [配置选项](#配置选项)
- [高级功能](#高级功能)

## 安装

### 全局安装

```bash
npm install -g figma-to-code-agent
```

### 本地安装

```bash
npm install figma-to-code-agent
```

### 使用 npx（无需安装）

```bash
npx figma-to-code-agent [options]
```

## 基本用法

### 生成 React 组件

```bash
figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework react \
  --output ./output
```

### 生成 Vue 组件

```bash
figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework vue \
  --output ./output
```

## 交互式模式

交互式模式提供对话式用户体验，Agent 会引导您完成整个流程。

### 启动交互式模式

```bash
figma-to-code-agent --interactive
```

### 交互式命令

在交互式模式中，您可以使用以下命令：

- **生成代码**：直接输入 Figma URL 或描述您的需求
- **help**：显示帮助信息
- **history**：查看对话历史
- **status**：查看当前状态
- **save <filename>**：保存对话上下文
- **load <filename>**：加载对话上下文
- **exit** 或 **quit**：退出程序

### 示例对话

```
> 我想从 Figma 生成一个导航栏组件

Agent: 好的，我需要一些信息：
1. Figma 文件的 URL 或 File Key
2. 目标框架（React 或 Vue）
3. 样式模式（CSS Modules、Tailwind 或 CSS）

> https://www.figma.com/file/abc123/MyDesign?node-id=1:2

Agent: 检测到 Figma URL
- File Key: abc123
- Node ID: 1:2

请选择目标框架：
1. React
2. Vue

> React

Agent: 请选择样式模式：
1. CSS Modules
2. Tailwind CSS
3. Plain CSS

> Tailwind CSS

Agent: 开始生成代码...
✓ 提取设计数据
✓ 转换为 AST
✓ 优化布局
✓ 生成 React 组件
✓ 应用 Tailwind 样式

代码生成成功！
生成的文件:
  - ./output/NavigationBar.tsx (1234 字符)
  - ./output/NavigationBar.module.css (567 字符)

是否需要改进？
```

## 批处理模式

批处理模式适合自动化脚本和 CI/CD 流程。

### 基本批处理

```bash
figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework react \
  --style-mode tailwind \
  --output ./output \
  --batch
```

### 批量生成多个组件

创建配置文件 `batch-config.json`：

```json
{
  "token": "YOUR_FIGMA_TOKEN",
  "components": [
    {
      "file": "FILE_KEY_1",
      "node": "NODE_ID_1",
      "name": "Header",
      "framework": "react",
      "output": "./output/Header"
    },
    {
      "file": "FILE_KEY_1",
      "node": "NODE_ID_2",
      "name": "Footer",
      "framework": "react",
      "output": "./output/Footer"
    }
  ]
}
```

运行批处理：

```bash
figma-to-code-agent --config batch-config.json
```

## 配置选项

### 必需选项

| 选项 | 描述 | 示例 |
|------|------|------|
| `--token` | Figma 访问令牌 | `--token figd_xxx` |
| `--file` | Figma 文件 Key | `--file abc123def456` |
| `--node` | 节点 ID | `--node 1:2` |

### 框架选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--framework` | 目标框架 (react/vue) | `react` |
| `--style-mode` | 样式模式 (css-modules/tailwind/css) | `css-modules` |
| `--typescript` | 使用 TypeScript | `true` |

### 输出选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--output` | 输出目录 | `./output` |
| `--naming` | 命名约定 (PascalCase/kebab-case) | `PascalCase` |
| `--preview` | 生成后在浏览器中预览 | `false` |

### 优化选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--optimize` | 启用性能优化 | `true` |
| `--accessibility` | 启用无障碍增强 | `true` |
| `--responsive` | 生成响应式代码 | `true` |
| `--split-components` | 自动拆分大型组件 | `true` |

### AI 增强选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--ai-naming` | 使用 AI 进行语义命名 | `false` |
| `--ai-optimize` | 使用 AI 优化代码 | `false` |
| `--llm-provider` | LLM 提供商 (openai/anthropic/ollama) | `openai` |
| `--llm-model` | LLM 模型名称 | `gpt-4` |

### 其他选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--interactive` | 启动交互式模式 | `false` |
| `--batch` | 批处理模式（非交互） | `false` |
| `--verbose` | 详细输出 | `false` |
| `--quiet` | 静默模式 | `false` |
| `--config` | 配置文件路径 | - |

## 高级功能

### 1. 设计一致性检查

检查设计令牌的一致性：

```bash
figma-to-code-agent \
  --token YOUR_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --check-consistency \
  --output ./report.json
```

输出示例：

```json
{
  "isConsistent": false,
  "score": 75,
  "inconsistencies": [
    {
      "type": "color",
      "severity": "medium",
      "description": "发现 3 个相似但不完全相同的 background 颜色",
      "suggestions": [
        "统一使用最常用的颜色值：rgb(255, 255, 255)",
        "创建设计令牌来管理这些颜色"
      ]
    }
  ]
}
```

### 2. 交互原型生成

生成带有状态管理和事件处理的交互原型：

```bash
figma-to-code-agent \
  --token YOUR_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework react \
  --interactive-prototype \
  --include-animations \
  --include-validation
```

### 3. 自定义模板

使用自定义模板生成代码：

```bash
figma-to-code-agent \
  --token YOUR_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --template ./templates/my-template.json \
  --output ./output
```

模板文件示例 (`my-template.json`)：

```json
{
  "id": "custom-button",
  "name": "Custom Button Template",
  "category": "component",
  "framework": "react",
  "content": "import React from 'react';\n\nexport const {{componentName}} = () => {\n  return <button>{{buttonText}}</button>;\n};",
  "variables": [
    {
      "name": "componentName",
      "type": "string",
      "required": true,
      "description": "组件名称"
    },
    {
      "name": "buttonText",
      "type": "string",
      "required": false,
      "default": "Click me",
      "description": "按钮文本"
    }
  ]
}
```

### 4. 增量更新

更新现有组件而不覆盖业务逻辑：

```bash
figma-to-code-agent \
  --token YOUR_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --update ./src/components/MyComponent.tsx \
  --preserve-logic
```

### 5. 版本管理

创建和管理代码版本：

```bash
# 创建新版本
figma-to-code-agent \
  --token YOUR_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --output ./output \
  --create-version "v1.0.0"

# 列出所有版本
figma-to-code-agent --list-versions ./output

# 回滚到特定版本
figma-to-code-agent --rollback ./output --version "v1.0.0"
```

## 环境变量

您可以使用环境变量来配置常用选项：

```bash
# Figma 访问令牌
export FIGMA_TOKEN="figd_xxx"

# 默认框架
export FIGMA_TO_CODE_FRAMEWORK="react"

# 默认样式模式
export FIGMA_TO_CODE_STYLE_MODE="tailwind"

# LLM 配置
export OPENAI_API_KEY="sk-xxx"
export LLM_PROVIDER="openai"
export LLM_MODEL="gpt-4"
```

## 故障排除

### 常见问题

**1. 认证失败**

```
Error: Authentication failed (403)
```

解决方案：
- 检查 Figma 访问令牌是否正确
- 确保令牌有访问该文件的权限
- 在 Figma 中重新生成访问令牌

**2. 节点未找到**

```
Error: Node not found (404)
```

解决方案：
- 检查节点 ID 是否正确
- 确保节点在 Figma 文件中存在
- 尝试使用完整的 Figma URL

**3. 速率限制**

```
Error: Rate limit exceeded (429)
```

解决方案：
- 等待几分钟后重试
- 使用 `--cache` 选项启用缓存
- 减少并发请求数量

**4. 内存不足**

```
Error: JavaScript heap out of memory
```

解决方案：
- 增加 Node.js 内存限制：`NODE_OPTIONS="--max-old-space-size=4096" figma-to-code-agent ...`
- 使用 `--split-components` 拆分大型设计
- 减少并行处理的组件数量

## 最佳实践

1. **使用环境变量**：将敏感信息（如 API 令牌）存储在环境变量中
2. **启用缓存**：使用 `--cache` 选项减少 API 调用
3. **增量更新**：使用 `--update` 而不是完全重新生成
4. **版本控制**：为重要更改创建版本
5. **一致性检查**：定期运行一致性检查以维护设计系统
6. **自动化**：在 CI/CD 流程中集成批处理模式

## 更多资源

- [MCP 服务配置指南](./MCP_GUIDE.md)
- [Kiro Skill 使用指南](./KIRO_SKILL_GUIDE.md)