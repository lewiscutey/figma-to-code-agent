# Figma-to-Code Agent

Convert Figma designs to production-ready React/Vue components. Supports CSS Modules, Tailwind, and plain CSS.

> 📖 New here? Check the [Quick Start Guide](QUICKSTART.md) for step-by-step setup.

## Examples

### Example 1 — MIUI12 官网 (全局导航)

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
- 🎭 CSS Modules, Tailwind, or plain CSS
- 📐 Absolute positioning with responsive scaling (auto-fits viewport)
- 🖼️ Image export at 2x resolution, vector icon auto-detection and PNG export
- 🔤 Full typography support (font family, size, weight, line-height, letter-spacing, color)
- 👁️ Figma layer filtering (hidden layers, mask shapes)
- 🤖 Optional AI enhancements (semantic naming, component splitting, code optimization)

## Install

```bash
npm install -g figma-to-code-agent
```

Or use directly with npx (no install needed):

```bash
npx figma-to-code-agent --token YOUR_FIGMA_TOKEN --file FILE_KEY --node NODE_ID --output ./output
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

# Generate and preview in browser
npx figma-to-code-agent \
  --token YOUR_FIGMA_TOKEN \
  --file FILE_KEY \
  --node NODE_ID \
  --framework react \
  --output ./output \
  --preview
```

## How It Works

1. Fetches the Figma file data via API (with local caching)
2. Parses the design tree into an intermediate AST
3. Filters invisible layers, mask shapes, and transparent fills
4. Detects vector-only containers and exports them as PNG icons
5. Downloads images at 2x resolution
6. Generates framework-specific components with CSS Modules
7. Wraps output in a responsive scale container (no horizontal scrollbar)

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--token <token>` | Figma API token (or `FIGMA_TOKEN` env) | — |
| `--file <key>` | Figma file key | — |
| `--node <id>` | Target node ID (e.g. `1502-102`) | root |
| `--framework` | `react` or `vue` | `react` |
| `--style` | `css-modules`, `tailwind`, or `css` | `css-modules` |
| `--typescript` | Enable TypeScript output | `false` |
| `--output <dir>` | Output directory | `./output` |
| `--preview` | Preview in browser after generation | — |

### AI Options (optional)

| Option | Description |
|--------|-------------|
| `--llm-provider` | `bedrock`, `openai`, or `anthropic` |
| `--llm-model` | Model name |
| `--ai-naming` | AI-powered semantic component naming |
| `--ai-splitting` | AI-powered component splitting |
| `--ai-optimization` | AI-powered code optimization |

## Programmatic API

```typescript
import { FigmaToCodeAgent } from 'figma-to-code-agent'

const agent = new FigmaToCodeAgent({
  figmaToken: 'your-token',
  fileKey: 'your-file-key',
  framework: 'react',
  styleMode: 'css-modules',
  typescript: false,
  outputDir: './output',
})

const files = await agent.convert()
```

## Project Structure

```
src/
├── extraction/          # Figma API client, MCP protocol, caching
├── transformation/      # AST parsing, layout optimization, transformers
│   └── transformers/    # Component extraction, semantic naming, etc.
├── generation/          # React and Vue code generators
├── llm/                 # LLM providers (Bedrock, OpenAI)
├── validation/          # Visual validation
└── cli.ts               # CLI entry point
```

## Development

```bash
git clone https://github.com/lewiscutey/figma-to-code-agent.git
cd figma-to-code-agent
npm install
npm run build        # Compile TypeScript
npm test             # Run all tests (129 tests)
npm run lint         # ESLint
npm run format       # Prettier
```

## Requirements

- Node.js 18+
- npm

## License

MIT
