<p align="center">
  <a href="https://github.com/DocSanctum/doc-sanctum">
    <img src="https://raw.githubusercontent.com/DocSanctum/.github/main/assets/logo.png" alt="DocSanctum" width="240">
  </a>
</p>

# DocSanctum for Obsidian

An Obsidian plugin that connects to a self-hosted [**DocSanctum**](https://github.com/DocSanctum/doc-sanctum) backend over MCP, so you can search and read your DocSanctum-indexed documents from inside Obsidian.

DocSanctum ([github.com/DocSanctum/doc-sanctum](https://github.com/DocSanctum/doc-sanctum)) exposes its document tools (`list_documents`, `search_documents`, `semantic_search_documents`, `read_document`) as a standard MCP server over streamable HTTP (mounted at `/mcp` on the backend). This plugin is just an MCP client wired into Obsidian's UI.

> **This plugin is a client only.** It doesn't run any indexing or search itself — it calls into a DocSanctum backend you already have running. If you don't have DocSanctum yet, set it up first: https://github.com/DocSanctum/doc-sanctum.

## Features

- **Search** command / ribbon icon — keyword search across your DocSanctum sources.
- **Semantic search** command / ribbon icon — natural-language search over indexed content.
- Selecting a result fetches the full document and renders it in a read-only preview.
- Settings tab to configure the backend's MCP server URL and access token, restrict search to a single source, and test the connection.
- Surfaces backend warnings (e.g. a source falling back to stale cached data) as in-app notices and, when reading a document, as a banner above the preview.

## Setup

Requires Obsidian 1.11.4 or later (desktop).

1. Have a DocSanctum backend running and reachable (default `http://localhost:8000/mcp`).
2. **Add the vault's folder (or whichever folder you want searchable) as a source in the DocSanctum frontend, and let it finish indexing.** This plugin only *queries* sources that already exist in DocSanctum — it can't register or index a folder on its own. Search will simply return nothing until this step is done.
3. Install this plugin (see below) and set the **Server URL** in the plugin settings if it differs from the default.
   - **DocSanctum on another machine:** connect through its remote MCP port instead, e.g. `http://192.168.1.20:8020/mcp`, and paste the **Access token** from the DocSanctum web app (Settings → MCP Server → Remote access). Pasting the whole `Authorization: Bearer …` line works too. The token is stored in Obsidian's keychain, not in the vault, so it is not synced along with your notes. A server on the same machine needs no token.
4. Run the **DocSanctum: Search** or **DocSanctum: Semantic search** command (or use the ribbon icon).

## Development

- `npm i` to install dependencies.
- `npm run dev` to build `src/main.ts` into `main.js` in watch mode.
- `npm run build` to type-check and produce a production build.
- For local testing, symlink or copy `main.js`, `manifest.json`, `styles.css` into `VaultFolder/.obsidian/plugins/doc-sanctum/`.

## License

MIT — see [LICENSE](LICENSE).
