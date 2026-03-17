# Figma-to-Code Agent 上下文工程分析

基于项目源码的深度分析，覆盖 Prompt 设计、上下文管理、Token 优化等维度。

---

## 一、模型最容易犯的错误及上下文调整策略

### 1.1 最易犯的错误

**（1）Figma 节点树过深导致 JSON 爆炸**

Figma 设计稿的节点树可以非常深（嵌套 10+ 层），直接序列化传给模型会产生巨量 Token。模型在面对超长 JSON 时容易：
- 丢失深层节点的语义关系
- 生成的组件结构与设计稿不匹配
- 在 JSON 中间"迷路"，输出截断或格式错误

项目中 `AILayoutAnalyzer` 的做法是将 AST 简化到深度 5：

```typescript
// src/transformation/transformers/AILayoutAnalyzer.ts
private simplifyForAI(node: ASTNode, depth = 0, maxDepth = 5): any {
  if (depth >= maxDepth) return { name: node.name, type: node.type, childCount: node.children.length };
  return {
    id: node.id, type: node.type, name: node.name,
    layout: node.layout, childCount: node.children.length,
    children: node.children.map(c => this.simplifyForAI(c, depth + 1, maxDepth))
  };
}
```

**（2）语义命名偏差**

模型给组件命名时容易产生过于通用（`Container1`、`Wrapper`）或过于具体（`BlueGradientHeaderWithLogo`）的名称。`AISemanticNamer` 通过构建精简上下文来约束：

```typescript
// 只传递关键特征，不传完整节点
context = `Type: ${node.type}, Name: ${node.name}, Layout: ${node.layout.mode},
           Children: ${node.children.length}, HasText: ${hasText}, HasImage: ${hasImage}`
```

**（3）组件拆分点判断失误**

模型在决定"哪里该拆分组件"时，容易过度拆分（每个 div 一个组件）或拆分不足。`AIComponentSplitter` 设置了硬性前置条件（children > 5）才触发 AI 分析，避免不必要的 LLM 调用。

**（4）代码优化时破坏功能**

`AICodeOptimizer` 让模型优化代码时，模型可能改变组件的 props 接口或删除关键样式。Prompt 中用 "Return ONLY the optimized code" 约束输出格式，并用正则从 markdown code block 中提取代码，但缺乏功能等价性验证。

### 1.2 上下文调整策略

| 错误类型 | 调整手段 |
|---------|---------|
| 节点树过深 | `simplifyForAI` 截断深度为 5，叶节点只保留 name/type/childCount |
| 命名偏差 | 构建精简特征上下文，而非传完整节点 |
| 拆分失误 | 硬性前置条件过滤 + JSON schema 约束输出格式 |
| 代码破坏 | 严格的输出格式指令 + 正则提取 |
| 意图误判 | 规则引擎兜底，LLM 只做增强而非唯一路径 |

---

## 二、给模型信息的"减法"与"加法反效果"

### 2.1 做过的减法

**（1）AST 节点精简 — 最核心的减法**

Figma API 返回的原始节点包含大量冗余字段（`pluginData`、`exportSettings`、`constraints` 等）。`ASTParser` 只提取 7 种关键信息：

```
原始 Figma 节点 (~50+ 字段) → ASTNode (id, type, name, layout, styles, metadata, children)
```

这是整个项目最重要的一次减法——将 Figma 的复杂数据模型压缩为精简的中间表示。

**（2）不可见节点过滤**

```typescript
// ASTParser.ts — 直接跳过不可见和遮罩节点
if (node.visible === false) return null;
if ((node as any).isMask === true) return null;
```

**（3）AI Transformer 的分级简化**

每个 AI Transformer 都有自己的简化策略：
- `AILayoutAnalyzer`：深度截断到 5 层
- `AISemanticNamer`：只传特征摘要，不传子树
- `AIComponentSplitter`：`simplifyNode` 只保留 name/type/childCount/children

**（4）规则引擎优先，AI 可选**

`IntentUnderstandingEngine` 默认用关键词匹配（`analyzeWithRules`），只在有 LLM Provider 时才调用 `analyzeWithLLM`。`DecisionEngine` 的策略评估完全基于规则（加权评分），不依赖 LLM。

### 2.2 加了更多信息反而效果变差的场景

虽然代码中没有显式的"回退记录"，但从架构设计可以推断出以下反模式：

**（1）AILayoutAnalyzer 的 maxDepth 参数**

`simplifyForAI` 有 `maxDepth = 5` 的默认值。这个值很可能是调试出来的——如果设为更大（比如 10），传给模型的 JSON 会指数级膨胀，模型反而更难识别语义结构。深度 5 是信息量和可处理性的平衡点。

**（2）AISemanticNamer 的上下文构建**

如果把完整的子树结构传给命名模型，模型会被细节淹没，反而生成更差的名称。当前只传 6 个特征字段，是刻意的信息压缩。

**（3）MCP Server 的两套实现**

项目有两个 MCP Server：
- `src/mcp.ts`：直接调用 `FigmaToCodeAgent`，简单直接
- `src/mcp-server/MCPServer.ts`：走完整 Agent 管线（Intent → Decision → Execution）

后者给模型提供了更多的"决策上下文"（意图理解、策略选择），但对于简单的"给我生成代码"请求，这些额外步骤反而增加了延迟和出错概率。这就是典型的"加了更多信息/流程反而效果变差"。

---

## 三、Prompt 中的静态信息 vs 动态注入

### 3.1 写死在 Prompt 里的（静态）

项目中有 4 个硬编码的 System Prompt，全部以字符串字面量形式内联：

| 文件 | System Prompt（写死） |
|------|---------------------|
| `AICodeOptimizer.ts` | "You are a code optimization expert. Improve code quality: remove redundancy, improve naming, add accessibility, optimize performance. Return ONLY the optimized code, no explanations." |
| `AIComponentSplitter.ts` | "You are a UI architecture expert. Analyze component structure and decide if it should be split into smaller components. Return JSON: {\"shouldSplit\": boolean, \"splitPoints\": [indices]}" |
| `AILayoutAnalyzer.ts` | "You are a UI/UX expert. Analyze component structures and provide semantic improvements. Return ONLY valid JSON." |
| `AISemanticNamer.ts` | "You are a UI component naming expert. Generate semantic, descriptive component names following React/Vue conventions. Return ONLY the component name, nothing else." |

**共同特征：**
- 角色定义（"You are a ... expert"）
- 输出格式约束（"Return ONLY..."）
- 无版本管理，无外部配置

### 3.2 动态注入的

| 动态内容 | 注入位置 | 来源 |
|---------|---------|------|
| 简化后的 AST 节点 JSON | User Message | `simplifyForAI()` / `simplifyNode()` 处理后的节点 |
| 节点特征上下文 | User Message | 运行时从 ASTNode 提取的 type/name/layout/children 等 |
| 代码文件内容 | User Message | `AICodeOptimizer` 中的 `${code}` |
| 文件路径 | User Message | `AICodeOptimizer` 中的 `${filePath}` |
| 用户意图 | `IntentUnderstandingEngine` | 用户输入的自然语言 |
| 框架/样式偏好 | `ConversationContext` | 用户配置或交互中提取 |
| 会话历史 | `ConversationContextManager` | 累积的 message 列表 |

### 3.3 划分原则

从代码中可以归纳出的划分逻辑：

```
静态 = 角色定义 + 输出格式约束 + 任务边界（不随输入变化）
动态 = 具体设计数据 + 用户偏好 + 会话状态（每次调用都不同）
```

当前的划分比较粗糙——所有静态 Prompt 都是内联字符串，没有集中管理。

---

## 四、信息超出上下文窗口的应对方案

### 4.1 项目中已有的方案

**（1）分层压缩（已实现）**

```
Figma API 原始数据 (~50+ 字段/节点)
    ↓ ASTParser: 提取 7 个核心字段
中间 AST 表示
    ↓ simplifyForAI: 截断深度、移除细节
AI 可处理的精简 JSON
```

**（2）分步处理（已实现）**

转换管线将大任务拆成独立步骤，每步只处理一个关注点：

```
FigmaStructureOptimizer → AILayoutAnalyzer → ComponentExtractor
→ LayoutOptimizer → SemanticNamer → AIComponentSplitter
```

每个 Transformer 独立调用 LLM，不需要一次性传入所有信息。

**（3）LLM 缓存（已实现）**

`LLMCache` 用 SHA-256 哈希请求内容作为 key，避免重复调用：
- 内存 + 磁盘双层缓存
- TTL 过期机制（默认 24h）
- LRU 淘汰策略

**（4）Token 预算监控（已实现）**

`TokenMonitor` 提供日/周/月预算跟踪，80% 时预警，超限时回调。但目前只是监控，没有自动降级逻辑。

### 4.2 如果需要处理更大设计稿的思路

**方案 A：分区处理**
```
大型设计稿 → 按页面/区域切分 → 每个区域独立走管线 → 合并结果
```
`ParallelProcessor` 已有组件独立性分析和并行执行的基础设施，可以扩展。

**方案 B：渐进式上下文**
```
第一轮：只传顶层结构（深度 2），获取整体布局方案
第二轮：逐个子树展开，传入上一轮的布局决策作为约束
第三轮：细节优化
```

**方案 C：摘要链**
```
深层子树 → LLM 生成摘要 → 摘要替代原始数据参与上层决策
```

**方案 D：动态深度调整**
```
根据 Token 预算动态计算 maxDepth：
estimatedTokens = nodeCount * avgTokensPerNode
maxDepth = 找到满足 estimatedTokens < budget 的最大深度
```

---

## 五、当前上下文设计的最大短板及优化方向

### 5.1 最大短板

**（1）Prompt 管理完全内联，无集中治理**

4 个 System Prompt 散落在 4 个文件中，以字符串字面量硬编码。没有：
- 版本管理
- A/B 测试能力
- 运行时切换
- Prompt 模板引擎（虽然 `TemplateManager` 存在，但未用于 LLM Prompt）

**（2）缺乏输出验证层**

模型返回的结果只有格式校验（JSON.parse、正则提取），没有语义验证：
- `AISemanticNamer`：不验证名称是否符合命名规范
- `AIComponentSplitter`：不验证拆分点是否合理
- `AICodeOptimizer`：不验证优化后代码是否功能等价
- `AILayoutAnalyzer`：有 try/catch 兜底，但只是回退到原始结构

**（3）上下文窗口无感知**

没有任何地方在发送前估算 Token 数量。`TokenMonitor` 只做事后统计，不做事前预判。如果某个节点树序列化后超过模型上下文窗口，会直接失败。

**（4）会话上下文未参与 AI 决策**

`ConversationContextManager` 维护了完整的会话历史、用户偏好、任务状态，但 4 个 AI Transformer 完全不读取这些信息。每次 LLM 调用都是无状态的，丢失了用户的风格偏好和历史反馈。

**（5）无 Few-shot 示例**

所有 Prompt 都是零样本（zero-shot），没有提供输入-输出示例。对于结构化输出（JSON schema），few-shot 能显著提升格式正确率。

### 5.2 一周优化计划

如果有一周时间，按优先级排序：

**Day 1-2：建立 Prompt 注册中心**

```typescript
// 将散落的 Prompt 集中管理
const prompts = {
  'semantic-namer': { version: '1.2', system: '...', fewShot: [...] },
  'layout-analyzer': { version: '2.0', system: '...', fewShot: [...] },
  // ...
};
```

收益：可版本化、可 A/B 测试、可运行时热更新。

**Day 3：Token 预估与自适应截断**

```typescript
function estimateTokens(obj: any): number {
  return Math.ceil(JSON.stringify(obj).length / 4); // 粗估
}

function adaptiveSimplify(node: ASTNode, tokenBudget: number): any {
  for (let depth = 10; depth >= 1; depth--) {
    const simplified = simplifyForAI(node, 0, depth);
    if (estimateTokens(simplified) <= tokenBudget) return simplified;
  }
}
```

收益：避免超窗口失败，自动找到最优信息密度。

**Day 4：输出验证层**

为每个 AI Transformer 添加结构化输出验证：
- 命名：正则校验 PascalCase + 长度限制
- 拆分：验证 splitPoints 在有效索引范围内
- 布局：验证返回的 nodeId 在原始树中存在
- 代码：AST 解析验证语法正确性

收益：捕获模型幻觉，提升可靠性。

**Day 5：会话上下文注入 AI 调用**

```typescript
// 将用户偏好注入 System Prompt
const preferences = context.getUserPreferences();
const systemPrompt = basePrompt + `\nUser preferences: ${JSON.stringify(preferences)}`;
```

收益：AI 输出更贴合用户风格，减少迭代次数。

**Day 6-7：Few-shot 示例库 + 评估框架**

- 为每个 Prompt 准备 2-3 个高质量输入输出示例
- 建立自动化评估：对比 AI 输出与预期输出的结构相似度
- 用 `DesignConsistencyChecker` 的思路做 Prompt 输出一致性检查

收益：提升输出质量的下限，建立可量化的优化基准。

---

## 总结

| 维度 | 现状 | 评价 |
|------|------|------|
| 信息减法 | AST 精简 + 深度截断 + 不可见过滤 | ✅ 做得不错 |
| 静态/动态划分 | 角色+格式写死，数据动态注入 | ⚠️ 合理但管理粗糙 |
| 超窗口处理 | 分步管线 + 缓存 + 监控 | ⚠️ 有基础但缺预判 |
| 输出可靠性 | 格式校验 + try/catch 兜底 | ❌ 缺语义验证 |
| Prompt 治理 | 内联硬编码 | ❌ 最大短板 |
| 上下文利用 | 会话管理完善但未注入 AI 调用 | ❌ 浪费了已有能力 |
