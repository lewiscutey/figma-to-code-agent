# MCP 服务配置指南

本指南介绍如何配置和使用 Figma-to-Code Agent 作为 Model Context Protocol (MCP) 服务。

## 目录

- [什么是 MCP](#什么是-mcp)
- [安装配置](#安装配置)
- [可用工具](#可用工具)
- [使用示例](#使用示例)
- [高级配置](#高级配置)
- [故障排除](#故障排除)

## 什么是 MCP

Model Context Protocol (MCP) 是一个标准化协议，允许 AI 助手（如 Claude、ChatGPT）通过工具调用与外部服务交互。

Figma-to-Code Agent 实现了 MCP 服务器，提供以下功能：
- 从 Figma 提取设计并生成代码
- 分析设计并提供改进建议
- 更新现有组件
- 检查设计一致性

## 安装配置

### 1. 安装 Figma-to-Code Agent

```bash
npm install -g figma-to-code-agent
```

### 2. 配置 MCP 客户端

#### 在 Claude Desktop 中配置

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

添加以下配置：

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": ["--mcp"],
      "env": {
        "FIGMA_TOKEN": "your_figma_token_here"
      }
    }
  }
}
```

#### 在 Kiro 中配置

编辑 Kiro MCP 配置文件：

**工作区配置**: `.kiro/settings/mcp.json`
**用户配置**: `~/.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": ["--mcp"],
      "env": {
        "FIGMA_TOKEN": "your_figma_token_here",
        "OPENAI_API_KEY": "your_openai_key_here"
      },
      "disabled": false,
      "autoApprove": ["figma_to_code", "analyze_design"]
    }
  }
}
```

### 3. 获取 Figma 访问令牌

1. 登录 [Figma](https://www.figma.com/)
2. 进入 **Settings** → **Account** → **Personal Access Tokens**
3. 点击 **Generate new token**
4. 复制生成的令牌并保存到配置文件中

### 4. 重启 MCP 客户端

配置完成后，重启 Claude Desktop 或 Kiro 以加载新的 MCP 服务。

## 可用工具

### 1. figma_to_code

从 Figma 设计生成代码。

**参数**：

```typescript
{
  figmaUrl: string;          // Figma 文件 URL 或 File Key
  nodeId?: string;           // 节点 ID（可选）
  framework: 'react' | 'vue'; // 目标框架
  styleMode?: 'css-modules' | 'tailwind' | 'css'; // 样式模式
  outputPath?: string;       // 输出路径
  options?: {
    typescript?: boolean;    // 使用 TypeScript
    optimize?: boolean;      // 启用优化
    accessibility?: boolean; // 启用无障碍
    responsive?: boolean;    // 生成响应式代码
  }
}
```

**返回**：

```typescript
{
  success: boolean;
  files: Array<{
    path: string;
    content: string;
    type: 'component' | 'style' | 'asset';
  }>;
  metadata: {
    componentName: string;
    framework: string;
    linesOfCode: number;
    dependencies: string[];
  };
}
```

### 2. analyze_design

分析 Figma 设计并提供改进建议。

**参数**：

```typescript
{
  figmaUrl: string;          // Figma 文件 URL
  nodeId?: string;           // 节点 ID
  analysisType?: 'consistency' | 'accessibility' | 'performance' | 'all';
}
```

**返回**：

```typescript
{
  success: boolean;
  analysis: {
    consistencyScore: number;  // 0-100
    inconsistencies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestions: string[];
    }>;
    accessibilityIssues: Array<{
      type: string;
      severity: string;
      element: string;
      suggestion: string;
    }>;
    performanceMetrics: {
      complexity: number;
      estimatedSize: string;
      recommendations: string[];
    };
  };
}
```

### 3. update_component

更新现有组件，保留业务逻辑。

**参数**：

```typescript
{
  figmaUrl: string;          // Figma 文件 URL
  nodeId?: string;           // 节点 ID
  componentPath: string;     // 现有组件路径
  updateMode: 'styles' | 'structure' | 'both';
  preserveLogic?: boolean;   // 保留业务逻辑
}
```

**返回**：

```typescript
{
  success: boolean;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    file: string;
    description: string;
  }>;
  diff: string;              // 代码差异
}
```

### 4. check_consistency

检查设计令牌的一致性。

**参数**：

```typescript
{
  figmaUrl: string;          // Figma 文件 URL
  nodeId?: string;           // 节点 ID
  tokenTypes?: Array<'color' | 'typography' | 'spacing' | 'shadow' | 'border'>;
}
```

**返回**：

```typescript
{
  success: boolean;
  consistencyScore: number;  // 0-100
  report: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    inconsistencies: Array<{
      type: string;
      severity: string;
      description: string;
      affectedNodes: string[];
      suggestions: string[];
    }>;
  };
}
```

## 使用示例

### 在 Claude Desktop 中使用

**示例 1：生成 React 组件**

```
User: 请从这个 Figma 设计生成 React 组件：
https://www.figma.com/file/abc123/MyDesign?node-id=1:2

Claude: 我会使用 figma_to_code 工具来生成代码。

[调用 figma_to_code 工具]

生成成功！我创建了以下文件：

1. MyComponent.tsx - 主组件文件（234 行）
2. MyComponent.module.css - 样式文件（89 行）
3. types.ts - TypeScript 类型定义（45 行）

组件使用了以下依赖：
- React 18+
- CSS Modules

代码已经过优化，包含：
✓ 响应式布局
✓ 无障碍属性（ARIA）
✓ 性能优化（懒加载）
✓ TypeScript 类型安全

需要我解释代码的任何部分吗？
```

**示例 2：分析设计一致性**

```
User: 分析这个设计的一致性：
https://www.figma.com/file/abc123/DesignSystem

Claude: 我会分析设计的一致性。

[调用 analyze_design 工具]

分析完成！一致性得分：75/100

发现以下问题：

🟡 中等严重性（3 个）：
1. 颜色不一致
   - 发现 5 个相似但不完全相同的背景颜色
   - 建议：统一使用 #FFFFFF 或创建设计令牌

2. 字体大小不一致
   - 发现 4 个相似的字体大小（14px, 15px, 16px）
   - 建议：建立字体大小体系（12px, 14px, 16px, 20px, 24px）

3. 间距不一致
   - 发现 8 个不符合 8px 网格系统的间距值
   - 建议：调整为 8 的倍数

🟢 低严重性（2 个）：
4. 圆角变体过多（6 种）
5. 阴影变体过多（7 种）

建议优先修复中等严重性问题以提高设计一致性。
```

### 在 Kiro 中使用

**示例 1：在聊天中生成代码**

```
You: #figma-to-code 从 https://figma.com/file/abc123 生成 Vue 组件

Kiro: 我会使用 Figma-to-Code MCP 服务来生成 Vue 组件。

[自动调用 figma_to_code 工具]

✓ 代码生成完成

我已经创建了以下文件：
- src/components/MyComponent.vue
- src/components/MyComponent.css

组件特性：
- Vue 3 Composition API
- TypeScript 支持
- 响应式设计
- 无障碍优化

文件已保存到工作区，您可以直接使用。
```

**示例 2：自动批准工具调用**

在 `mcp.json` 中配置 `autoApprove`：

```json
{
  "mcpServers": {
    "figma-to-code": {
      "autoApprove": ["figma_to_code", "analyze_design"]
    }
  }
}
```

这样 Kiro 会自动调用这些工具，无需每次确认。

## 高级配置

### 1. 自定义环境变量

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": ["--mcp"],
      "env": {
        "FIGMA_TOKEN": "your_token",
        "OPENAI_API_KEY": "your_key",
        "LLM_PROVIDER": "openai",
        "LLM_MODEL": "gpt-4",
        "CACHE_DIR": "/tmp/figma-cache",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 2. 使用本地 LLM

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": ["--mcp"],
      "env": {
        "FIGMA_TOKEN": "your_token",
        "LLM_PROVIDER": "ollama",
        "LLM_MODEL": "llama2",
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    }
  }
}
```

### 3. 配置超时和重试

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": [
        "--mcp",
        "--timeout", "60000",
        "--max-retries", "3"
      ],
      "env": {
        "FIGMA_TOKEN": "your_token"
      }
    }
  }
}
```

### 4. 启用调试日志

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "figma-to-code-agent",
      "args": ["--mcp", "--verbose"],
      "env": {
        "FIGMA_TOKEN": "your_token",
        "LOG_LEVEL": "debug",
        "DEBUG": "figma-to-code:*"
      }
    }
  }
}
```

## 故障排除

### 常见问题

**1. MCP 服务未启动**

检查配置文件路径和格式：
```bash
# 验证 JSON 格式
cat ~/.kiro/settings/mcp.json | jq .

# 检查命令是否可执行
which figma-to-code-agent
```

**2. 工具调用失败**

查看 MCP 服务日志：
```bash
# Kiro 日志
tail -f ~/.kiro/logs/mcp-figma-to-code.log

# Claude Desktop 日志（macOS）
tail -f ~/Library/Logs/Claude/mcp.log
```

**3. 认证错误**

确保 Figma 令牌正确配置：
```bash
# 测试令牌
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/me
```

**4. 性能问题**

优化配置以提高性能：
```json
{
  "mcpServers": {
    "figma-to-code": {
      "env": {
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "3600",
        "MAX_CONCURRENT_REQUESTS": "5"
      }
    }
  }
}
```

### 调试技巧

1. **启用详细日志**：添加 `--verbose` 参数
2. **检查网络连接**：确保可以访问 Figma API
3. **验证权限**：确保令牌有足够的权限
4. **测试工具**：使用 MCP Inspector 测试工具调用
5. **查看文档**：参考 [MCP 规范](https://modelcontextprotocol.io/)

## 最佳实践

1. **安全存储令牌**：使用环境变量或密钥管理服务
2. **启用缓存**：减少 API 调用次数
3. **配置自动批准**：为常用工具启用自动批准
4. **监控使用情况**：定期检查日志和性能指标
5. **版本管理**：使用特定版本的 MCP 服务以确保稳定性

## 更多资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Figma API 文档](https://www.figma.com/developers/api)
- [CLI 使用指南](./CLI_GUIDE.md)
- [Kiro Skill 使用指南](./KIRO_SKILL_GUIDE.md)
