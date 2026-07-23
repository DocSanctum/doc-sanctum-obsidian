# DocSanctum for Obsidian

An Obsidian plugin that connects to a self-hosted [**DocSanctum**](https://github.com/DocSanctum/doc-sanctum) backend over MCP, so you can search and read your DocSanctum-indexed documents from inside Obsidian.

DocSanctum ([github.com/DocSanctum/doc-sanctum](https://github.com/DocSanctum/doc-sanctum)) exposes its document tools (`list_documents`, `search_documents`, `semantic_search_documents`, `read_document`) as a standard MCP server over streamable HTTP (mounted at `/mcp` on the backend). This plugin is just an MCP client wired into Obsidian's UI.

> **This plugin is a client only.** It doesn't run any indexing or search itself — it calls into a DocSanctum backend you already have running. If you don't have DocSanctum yet, set it up first: https://github.com/DocSanctum/doc-sanctum.

## Features

- **Search** command / ribbon icon — keyword search across your DocSanctum sources.
- **Semantic search** command — natural-language search over indexed content.
- Selecting a result fetches the full document and renders it in a read-only preview.
- Settings tab to configure the backend's MCP server URL, with a "Test connection" button.

## Setup

1. Have a DocSanctum backend running and reachable (default `http://localhost:8000/mcp`). It needs to be recent enough to include the `/mcp` CORS and transport-security fix for external (browser-based) clients — see [DocSanctum#fix/mcp-external-client-cors](https://github.com/DocSanctum/doc-sanctum) if `Test connection` fails with a connection error.
2. **Add the vault's folder (or whichever folder you want searchable) as a source in the DocSanctum frontend, and let it finish indexing.** This plugin only *queries* sources that already exist in DocSanctum — it can't register or index a folder on its own. Search will simply return nothing until this step is done.
3. Install this plugin (see below) and set the **Server URL** in the plugin settings if it differs from the default.
4. Run the **DocSanctum: Search** or **DocSanctum: Semantic search** command (or use the ribbon icon).

## Development

- `npm i` to install dependencies.
- `npm run dev` to build `src/main.ts` into `main.js` in watch mode.
- `npm run build` to type-check and produce a production build.
- For local testing, symlink or copy `main.js`, `manifest.json`, `styles.css` into `VaultFolder/.obsidian/plugins/doc-sanctum/`.

## License

MIT — see [LICENSE](LICENSE).
