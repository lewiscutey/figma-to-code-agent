# Changelog

## [0.6.0] - 2026-02-13

### Added
- Property tests for Property 3 (component identification completeness) and Property 4 (image asset extraction)
- Real Figma data end-to-end tests: 29 tests covering 4 real design files (MIUI12 Navigation, Homepage, Shopping Cart, Product Page)
- Cross-design pipeline consistency tests (React vs Vue, css-modules vs css)
- Full document processing test for large Figma canvas

### Improved
- Property test coverage now spans Properties 1-4, 5-44 (complete)
- Total test count: 309 tests across 42 test suites

## [0.5.0] - 2026-02-13

### Added
- Optional transformers: StyleMerger (style deduplication with shared class references), ResponsiveMerger (breakpoint variant merging), AccessibilityEnhancer (ARIA roles, alt text, landmark detection), PerformanceOptimizer (lazy loading, code splitting hints, redundant wrapper removal)
- Pure CSS mode: generates separate `.css` file for both React and Vue (previously inline styles only)
- CSS rule deduplication: merges selectors with identical rule bodies
- Responsive code generation: `@media` queries from ResponsiveMerger breakpoint metadata
- Improved Tailwind CSS mapping: actual color values `bg-[rgba(...)]`, precise sizes `w-[200px]`, border-radius `rounded-[12px]`, spacing, typography
- 24 new tests (222 total, all passing)

### Changed
- React/Vue generators now support all 3 style modes with external CSS files
- Tailwind class generation uses arbitrary value syntax instead of hardcoded utility classes

## [0.4.0] - 2026-02-13

### Added
- Design token extraction and export (CSS variables, SCSS, JSON, JS)
- `--extract-tokens <format>` CLI option
- Component splitter: auto-split large designs (>50 nodes) into sub-components with max depth control
- File organizer: framework-convention file naming (PascalCase for React, kebab-case for Vue), directory structure generation, Props interface inference
- Asset manager: image extraction, deduplication by imageRef, SVG-first detection, semantic file naming, import statement generation
- Visual validator: headless browser rendering via Puppeteer, pixel-level image comparison, similarity scoring, diff report with fix suggestions
- Configuration manager: JSON config parsing, validation, deep merge with defaults
- Error handling system: ErrorType enum, SystemError class, Logger with level filtering, recovery strategies (retry/skip/fallback), processing report generation
- 55 new tests (198 total, all passing)

## [0.3.4] - 2026-02-12

### Fixed
- Deduplicate image imports when multiple nodes reference the same image file

## [0.3.3] - 2026-02-12

### Fixed
- Auto `npm install` in test-app before preview when dependencies are missing (npx usage)

## [0.3.2] - 2026-02-12

### Fixed
- Rename CLI bin from `figma-to-code` to `figma-to-code-agent` to avoid npm naming conflict
- Update all docs and help text to use `npx figma-to-code-agent`

## [0.3.1] - 2026-02-12

### Changed
- Update README and QUICKSTART for npm package usage (`npx figma-to-code`)
- Add `files`, `engines`, `prepublishOnly` to package.json for cleaner npm publish
- Fix all 62 ESLint errors and warnings

## [0.3.0] - 2026-02-12

### Added
- `--preview` flag: generate and instantly preview in browser via built-in Vite test app
- `--node` parameter: convert specific Figma node/layer instead of entire file
- Responsive scaling: root container auto-fits viewport width, no horizontal scrollbar
- Figma mask support: filter `isMask` nodes, containers inherit parent background
- Invisible fill filtering: skip `opacity: 0` fills (transparent placeholders)
- Hidden layer filtering: `visible: false` nodes excluded from output
- Vector icon detection: pure vector containers auto-exported as PNG images
- Image local cache fallback: skip API calls when images already exist on disk
- High-res image export: `scale: 2` for retina displays
- Full typography CSS: font-family, font-size, font-weight, line-height, letter-spacing, text-align, color
- `white-space: nowrap` for single-line text nodes
- Google Fonts and CSS reset in test-app HTML templates
- Non-ASCII filename sanitization (Chinese characters stripped from output filenames)
- 4 example projects with original vs generated screenshots

### Changed
- Default TypeScript output changed to `false` (use `--typescript` to enable)
- Root container uses `transform: scale()` with JS resize listener instead of fixed `max-width`
- `overflow: hidden` containers now get `background-color: inherit` to match Figma compositing
- Replaced `SimplifyTransformer`/`FlattenTransformer` with `FigmaStructureOptimizer`
- `ComponentExtractor` preserves Text/Image/Shape types (no longer converts to Component)
- Image imports only generated for local paths (avoids broken imports from failed downloads)
- CSS class names truncated for long text nodes

### Fixed
- Duplicate method definitions in generators
- Button text centering with flex layout for single-text containers
- Image rendering with ES module imports (`import img from './assets/...'`)
- Rate limit handling with automatic retry and backoff

## [0.2.0] - 2026-02-11

### Added
- LLM integration: AWS Bedrock, OpenAI, and Anthropic providers
- AI semantic naming, component splitting, and code optimization
- CLI options: `--llm-provider`, `--llm-model`, `--ai-naming`, `--ai-splitting`, `--ai-optimization`

### Changed
- `TransformationPipeline` supports async transformers
- `FigmaToCodeAgent` conditionally registers AI transformers

## [0.1.0] - 2026-02-11

### Initial Release
- Figma API and MCP protocol integration
- AST parsing and transformation pipeline
- React and Vue code generation
- CSS Modules, Tailwind, and plain CSS support
- TypeScript support
- 129 tests
