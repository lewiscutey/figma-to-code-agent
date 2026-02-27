# Figma-to-Code Agent

Convert Figma designs to production-ready React/Vue components. Supports CSS Modules, Tailwind, and plain CSS.

> 📖 New here? Check the [Quick Start Guide](QUICKSTART.md) for step-by-step setup.
> 
> English | [中文](README.zh-CN.md)

## Usage

### 1. CLI Tool
For local development and CI/CD integration.

```bash
npx figma-to-code-agent --token YOUR_TOKEN --file FILE_KEY --framework react --output ./output
```

[Full CLI Guide →](docs/CLI_GUIDE.md)

### 2. MCP Service
Integrate with Claude Desktop or Kiro IDE, generate code through AI conversations.

[MCP Configuration Guide →](docs/MCP_GUIDE.md)

### 3. Kiro Skill
Use as a Skill in Kiro IDE for seamless design-to-code workflow.

[Kiro Skill Guide →](docs/KIRO_SKILL_GUIDE.md)

## Examples

### Example 1 — MIUI12 Website (Global Navigation)

| Original Design | React | Vue |
|:-:|:-:|:-:|
| ![Original](assets/example1/全局导航-黑.png) | ![React](assets/example1/generate/Figma%20to%20Code%20-%20React%20Test%20-%20%5Blocalhost%5D.png) | ![Vue](assets/example1/generate/Figma%20to%20Code%20-%20Vue%20Test%20-%20%5Blocalhost%5D.png) |

### Example 2 — Homepage (World Peas)

| Original Design | React | Vue |
|:-:|:-:|:-:|
| ![Original](assets/example2/20260211-185255.png) | ![React](assets/example2/generate/Figma%20to%20Code%20-%20React%20Test%20-%20%5Blocalhost%5D.png) | ![Vue](assets/example2/generate/Figma%20to%20Code%20-%20Vue%20Test%20-%20%5Blocalhost%5D.png) |

### Example 3 — Shopping Cart

| Original Design | React | Vue |
|:-:|:-:|:-:|
| ![Original](assets/example3/20260212-095453.png) | ![React](assets/example3/generate/Figma%20to%20Code%20-%20React%20Test%20-%20%5Blocalhost%5D.png) | ![Vue](assets/example3/generate/Figma%20to%20Code%20-%20Vue%20Test%20-%20%5Blocalhost%5D.png) |

### Example 4 — Product Page

| Original Design | React | Vue |
|:-:|:-:|:-:|
| ![Original](assets/example4/20260212-095459.png) | ![React](assets/example4/generate/Figma%20to%20Code%20-%20React%20Test%20-%20%5Blocalhost%5D.png) | ![Vue](assets/example4/generate/Figma%20to%20Code%20-%20Vue%20Test%20-%20%5Blocalhost%5D.png) |

## Features

- 🎨 Extract designs from Figma API with caching and rate-limit handling
- ⚛️ Generate React (.jsx/.tsx) and Vue (.vue) components
- 🎭 Support CSS Modules, Tailwind CSS, and plain CSS
- 📐 Responsive layout with viewport adaptation
- 🖼️ 2x resolution image export, auto-detect vector icons
- 🎯 Design token extraction (CSS variables, SCSS, JSON, JS)
- ♿ Accessibility enhancements (ARIA roles, alt text)
- ⚡ Performance optimization (lazy loading, code splitting, style deduplication)
- 🤖 Optional AI enhancements (semantic naming, component splitting, code optimization)
- 🔌 MCP server (integrate with Claude Desktop / Kiro IDE)
- 🎯 Kiro Skill (use as a skill in Kiro IDE)
- 📊 Design consistency checker
- 🎮 Interactive prototype generator

## Install

### Global Installation
```bash
npm install -g figma-to-code-agent
```

### Local Installation
```bash
npm install figma-to-code-agent
```

### Use with npx (no installation required)
```bash
npx figma-to-code-agent --token YOUR_TOKEN --file FILE_KEY --output ./output
```

## Quick Start

```bash
# Generate React component
npx figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework react \
  --output ./output

# Generate and preview
npx figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --framework react \
  --output ./output \
  --preview
```

For more usage options, see the [Quick Start Guide](QUICKSTART.md).

## How It Works

1. **Extract**: Fetch design data via Figma API (with caching)
2. **Parse**: Parse design tree into intermediate AST
3. **Transform**: Apply transformation pipeline (flatten, extract components, optimize, semantic naming)
4. **Generate**: Generate framework-specific component code
5. **Optimize**: Style deduplication, responsive handling, accessibility enhancements

For detailed architecture, see [Architecture Documentation](spec/ARCHITECTURE.md).

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--token <token>` | Figma API token | — |
| `--file <key>` | Figma file key | — |
| `--node <id>` | Target node ID | root |
| `--framework` | `react` or `vue` | `react` |
| `--style` | `css-modules`, `tailwind`, or `css` | `css-modules` |
| `--typescript` | Enable TypeScript | `false` |
| `--output <dir>` | Output directory | `./output` |
| `--preview` | Preview in browser after generation | — |
| `--mcp` | Start MCP server mode | — |

### AI Options

| Option | Description |
|--------|-------------|
| `--llm-provider` | `bedrock`, `openai`, or `anthropic` |
| `--llm-model` | Model name |
| `--ai-naming` | AI-powered semantic naming |
| `--ai-optimization` | AI-powered code optimization |

For complete options, see [CLI Usage Guide](docs/CLI_GUIDE.md).

## Documentation

- 📖 [Quick Start](QUICKSTART.md) - Get started in 5 minutes
- 🖥️ [CLI Guide](docs/CLI_GUIDE.md) - Complete CLI reference
- 🔌 [MCP Guide](docs/MCP_GUIDE.md) - Integrate with Claude/Kiro
- 🎯 [Kiro Skill Guide](docs/KIRO_SKILL_GUIDE.md) - Use in Kiro IDE
- 🏗️ [Architecture](spec/ARCHITECTURE.md) - System architecture
- 🎨 [Examples](assets/) - Real conversion examples

## Development

```bash
git clone https://github.com/lewiscutey/figma-to-code-agent.git
cd figma-to-code-agent
npm install
npm run build        # Compile TypeScript
npm test             # Run tests (222 tests)
npm run lint         # Lint code
```

## Requirements

- Node.js 18+
- Figma access token ([Get token](https://www.figma.com/developers/api#access-tokens))

## License

MIT License - See [LICENSE](LICENSE) file for details
