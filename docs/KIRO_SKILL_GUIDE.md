# Kiro Skill 使用指南

本指南介绍如何在 Kiro IDE 中安装和使用 Figma-to-Code Agent Skill。

## 目录

- [什么是 Kiro Skill](#什么是-kiro-skill)
- [安装](#安装)
- [基本用法](#基本用法)
- [可用命令](#可用命令)
- [配置选项](#配置选项)
- [工作流示例](#工作流示例)
- [故障排除](#故障排除)

## 什么是 Kiro Skill

Kiro Skill 是 Kiro IDE 的扩展机制，允许 AI 助手执行特定任务。Figma-to-Code Agent Skill 将设计转代码功能直接集成到 Kiro 中，提供无缝的开发体验。

### 主要特性

- 🎨 直接从 Figma 生成代码到工作区
- 🔄 增量更新现有组件
- 📊 设计一致性分析
- 🤖 智能代码优化
- 📝 自动生成文档
- 🎯 上下文感知建议

## 安装

### 方法 1：通过 Kiro Skill 市场安装

1. 打开 Kiro IDE
2. 点击侧边栏的 **Skills** 图标
3. 搜索 "Figma to Code"
4. 点击 **Install**

### 方法 2：手动安装

1. 下载 Skill 包：
```bash
npm install -g figma-to-code-agent
```

2. 在 Kiro 中注册 Skill：
```bash
kiro skill add figma-to-code-agent
```

### 配置 Figma 访问令牌

安装后，需要配置 Figma 访问令牌：

1. 打开 Kiro 设置（`Cmd/Ctrl + ,`）
2. 导航到 **Skills** → **Figma to Code**
3. 输入您的 Figma 访问令牌
4. 点击 **Save**

或者通过命令行配置：

```bash
kiro config set figma-to-code.token YOUR_FIGMA_TOKEN
```

## 基本用法

### 在聊天中使用

最简单的方式是在 Kiro 聊天中直接使用：

```
You: 从这个 Figma 设计生成 React 组件
https://www.figma.com/file/abc123/MyDesign?node-id=1:2

Kiro: 我会为您生成 React 组件。

[执行 generate_from_figma 命令]

✓ 代码已生成并保存到 src/components/MyComponent.tsx

组件特性：
- React 18 + TypeScript
- CSS Modules 样式
- 响应式设计
- 无障碍优化

需要我解释代码的任何部分吗？
```

### 使用命令面板

1. 打开命令面板（`Cmd/Ctrl + Shift + P`）
2. 输入 "Figma to Code"
3. 选择所需命令
4. 按照提示输入参数

### 使用快捷键

配置自定义快捷键以快速访问常用功能：

1. 打开键盘快捷键设置（`Cmd/Ctrl + K Cmd/Ctrl + S`）
2. 搜索 "Figma to Code"
3. 为命令分配快捷键

推荐快捷键：
- `Cmd/Ctrl + Shift + F G`：生成组件
- `Cmd/Ctrl + Shift + F U`：更新组件
- `Cmd/Ctrl + Shift + F A`：分析设计

## 可用命令

### 1. Generate from Figma

从 Figma 设计生成新组件。

**命令**：`figma-to-code.generate`

**参数**：
- `figmaUrl` (必需)：Figma 文件 URL
- `framework` (可选)：目标框架（react/vue）
- `outputPath` (可选)：输出路径

**示例**：

```
You: /figma-to-code generate https://figma.com/file/abc123 --framework react --output src/components
```

### 2. Update Component

更新现有组件，保留业务逻辑。

**命令**：`figma-to-code.update`

**参数**：
- `figmaUrl` (必需)：Figma 文件 URL
- `componentPath` (必需)：现有组件路径
- `updateMode` (可选)：更新模式（styles/structure/both）

**示例**：

```
You: /figma-to-code update https://figma.com/file/abc123 src/components/Header.tsx --mode styles
```

### 3. Analyze Design

分析设计并提供改进建议。

**命令**：`figma-to-code.analyze`

**参数**：
- `figmaUrl` (必需)：Figma 文件 URL
- `analysisType` (可选)：分析类型（consistency/accessibility/performance/all）

**示例**：

```
You: /figma-to-code analyze https://figma.com/file/abc123 --type consistency
```

### 4. Check Consistency

检查设计令牌的一致性。

**命令**：`figma-to-code.check-consistency`

**参数**：
- `figmaUrl` (必需)：Figma 文件 URL
- `tokenTypes` (可选)：令牌类型（color/typography/spacing/shadow/border）

**示例**：

```
You: /figma-to-code check-consistency https://figma.com/file/abc123 --tokens color,typography
```

## 配置选项

### Skill 配置文件

编辑 `.kiro/skills/figma-to-code/config.json`：

```json
{
  "figmaToken": "your_figma_token",
  "defaultFramework": "react",
  "defaultStyleMode": "css-modules",
  "outputPath": "src/components",
  "options": {
    "typescript": true,
    "optimize": true,
    "accessibility": true,
    "responsive": true,
    "splitComponents": true
  },
  "ai": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4",
    "features": {
      "semanticNaming": true,
      "codeOptimization": true,
      "documentation": true
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "directory": ".figma-cache"
  }
}
```

### 工作区配置

在 `.kiro/settings.json` 中配置工作区级别的设置：

```json
{
  "figma-to-code": {
    "autoSave": true,
    "showProgress": true,
    "verbosity": "normal",
    "notifications": {
      "onSuccess": true,
      "onError": true,
      "onWarning": false
    }
  }
}
```

## 工作流示例

### 工作流 1：从设计到生产

```
1. You: 从 Figma 生成登录页面组件
   https://figma.com/file/abc123/LoginPage

2. Kiro: [生成组件]
   ✓ 已创建 src/components/LoginPage.tsx
   ✓ 已创建 src/components/LoginPage.module.css
   
3. You: 添加表单验证逻辑

4. Kiro: [添加验证代码]
   ✓ 已添加 React Hook Form 集成
   ✓ 已添加 Zod 验证模式
   
5. You: 生成单元测试

6. Kiro: [生成测试]
   ✓ 已创建 src/components/__tests__/LoginPage.test.tsx
   ✓ 测试覆盖率：95%
```

### 工作流 2：设计系统维护

```
1. You: 分析整个设计系统的一致性
   https://figma.com/file/design-system

2. Kiro: [执行一致性检查]
   
   一致性得分：78/100
   
   发现 12 个问题：
   - 5 个颜色不一致
   - 4 个字体大小不一致
   - 3 个间距不一致
   
   建议：
   1. 统一主色调为 #007AFF
   2. 建立字体大小体系
   3. 采用 8px 网格系统

3. You: 生成设计令牌文件

4. Kiro: [生成令牌]
   ✓ 已创建 src/tokens/colors.ts
   ✓ 已创建 src/tokens/typography.ts
   ✓ 已创建 src/tokens/spacing.ts
   
5. You: 更新所有组件以使用新令牌

6. Kiro: [批量更新]
   ✓ 已更新 23 个组件
   ✓ 一致性得分提升至 95/100
```

### 工作流 3：增量更新

```
1. You: 设计师更新了导航栏，请更新代码
   https://figma.com/file/abc123/Navbar
   
2. Kiro: [分析变更]
   
   检测到以下变更：
   - 新增了搜索框
   - 修改了按钮样式
   - 调整了间距
   
   是否保留现有的事件处理逻辑？

3. You: 是的，只更新样式和结构

4. Kiro: [执行增量更新]
   ✓ 已更新 src/components/Navbar.tsx
   ✓ 已保留 onClick 处理器
   ✓ 已保留 useState 逻辑
   ✓ 已更新样式
   
   变更摘要：
   - 添加：SearchBox 组件
   - 修改：Button 样式
   - 保留：所有业务逻辑
```

### 工作流 4：交互原型

```
1. You: 生成带交互的表单组件
   https://figma.com/file/abc123/ContactForm
   
2. Kiro: [分析交互模式]
   
   检测到以下交互：
   - 3 个输入框（name, email, message）
   - 1 个提交按钮
   - 表单验证
   
   生成交互原型？

3. You: 是的，包含验证和动画

4. Kiro: [生成交互原型]
   ✓ 已创建 src/components/ContactForm.tsx
   
   包含功能：
   - 状态管理（useState）
   - 表单验证（React Hook Form + Zod）
   - 提交处理（async/await）
   - 加载状态
   - 错误处理
   - 动画效果（Framer Motion）
   
   依赖：
   - react-hook-form
   - zod
   - framer-motion
   
   需要我安装这些依赖吗？

5. You: 是的

6. Kiro: [安装依赖]
   ✓ 已安装所有依赖
   ✓ 组件已就绪
```

## 高级功能

### 1. 自定义模板

创建自定义模板以匹配您的代码风格：

```typescript
// .kiro/skills/figma-to-code/templates/my-component.json
{
  "id": "my-component-template",
  "name": "My Component Template",
  "framework": "react",
  "content": "...",
  "variables": [...]
}
```

使用模板：

```
You: 使用 my-component-template 模板生成组件
```

### 2. 批量操作

批量生成多个组件：

```
You: 从这个 Figma 文件生成所有页面组件
https://figma.com/file/abc123/AllPages
```

Kiro 会自动：
1. 识别所有页面
2. 为每个页面生成组件
3. 创建路由配置
4. 生成导航组件

### 3. 设计令牌同步

自动同步设计令牌：

```
You: 同步设计令牌
https://figma.com/file/design-system
```

Kiro 会：
1. 提取所有设计令牌
2. 生成 TypeScript 类型
3. 创建 CSS 变量
4. 更新所有使用令牌的组件

### 4. 可视化预览

在 Kiro 中预览生成的组件：

```
You: 生成并预览组件
https://figma.com/file/abc123/Button
```

Kiro 会：
1. 生成组件代码
2. 启动开发服务器
3. 在内置浏览器中打开预览
4. 支持热重载

## 故障排除

### 常见问题

**1. Skill 未加载**

```bash
# 检查 Skill 状态
kiro skill list

# 重新加载 Skill
kiro skill reload figma-to-code
```

**2. 认证失败**

```bash
# 验证令牌
kiro config get figma-to-code.token

# 重新设置令牌
kiro config set figma-to-code.token NEW_TOKEN
```

**3. 生成失败**

查看详细日志：

```bash
# 启用调试模式
kiro config set figma-to-code.debug true

# 查看日志
tail -f ~/.kiro/logs/figma-to-code.log
```

**4. 性能问题**

优化配置：

```json
{
  "cache": {
    "enabled": true,
    "ttl": 7200
  },
  "options": {
    "splitComponents": true,
    "maxConcurrency": 3
  }
}
```

### 调试技巧

1. **启用详细日志**：`kiro config set figma-to-code.verbosity detailed`
2. **清除缓存**：`kiro skill cache clear figma-to-code`
3. **重置配置**：`kiro skill reset figma-to-code`
4. **检查更新**：`kiro skill update figma-to-code`
5. **查看文档**：`kiro skill docs figma-to-code`

## 最佳实践

1. **使用工作区配置**：为每个项目配置特定设置
2. **启用缓存**：减少 API 调用和提高性能
3. **定期同步**：保持设计和代码同步
4. **版本控制**：提交生成的代码到 Git
5. **代码审查**：审查生成的代码以确保质量
6. **增量更新**：使用更新而不是重新生成
7. **自动化**：创建 Kiro 工作流自动化常见任务

## 快捷键参考

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + Shift + F G` | 生成组件 |
| `Cmd/Ctrl + Shift + F U` | 更新组件 |
| `Cmd/Ctrl + Shift + F A` | 分析设计 |
| `Cmd/Ctrl + Shift + F C` | 检查一致性 |
| `Cmd/Ctrl + Shift + F P` | 预览组件 |
| `Cmd/Ctrl + Shift + F S` | 同步令牌 |

## 更多资源

- [CLI 使用指南](./CLI_GUIDE.md)
- [MCP 服务配置指南](./MCP_GUIDE.md)
- [API 文档](./API.md)
- [示例项目](../examples/)
- [Kiro 官方文档](https://kiro.dev/docs)
