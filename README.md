# DocSanctum for Obsidian

An Obsidian plugin that connects to a self-hosted [DocSanctum](https://github.com/DocSanctum/doc-sanctum) backend over MCP, so you can search and read your DocSanctum-indexed documents from inside Obsidian.

DocSanctum already exposes its document tools (`list_documents`, `search_documents`, `semantic_search_documents`, `read_document`) as a standard MCP server over streamable HTTP (mounted at `/mcp` on the backend). This plugin is just an MCP client wired into Obsidian's UI — no backend changes required.

## Features

- **Search** command / ribbon icon — keyword search across your DocSanctum sources.
- **Semantic search** command — natural-language search over indexed content.
- Selecting a result fetches the full document and renders it in a read-only preview.
- Settings tab to configure the backend's MCP server URL, with a "Test connection" button.

## Setup

1. Have a DocSanctum backend running and reachable (default `http://localhost:8000/mcp`).
2. Install this plugin (see below) and set the **Server URL** in the plugin settings if it differs from the default.
3. Run the **DocSanctum: Search** or **DocSanctum: Semantic search** command (or use the ribbon icon).

## Development

- `npm i` to install dependencies.
- `npm run dev` to build `src/main.ts` into `main.js` in watch mode.
- `npm run build` to type-check and produce a production build.
- For local testing, symlink or copy `main.js`, `manifest.json`, `styles.css` into `VaultFolder/.obsidian/plugins/doc-sanctum/`.

## License

MIT — see [LICENSE](LICENSE).
