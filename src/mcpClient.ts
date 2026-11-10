import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
	StreamableHTTPClientTransport,
	StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface KeywordMatch {
	path: string;
	source_id: string;
	source_name: string;
	line_number: number;
	line: string;
	context: string[];
}

export interface SemanticHit {
	path: string;
	source_id: string;
	source_name: string;
	chunk_index: number;
	score: number;
	excerpt: string;
}

export interface DocSanctumWarning {
	source_id: string;
	source_name: string;
	reason: string;
	message: string;
	stale: boolean;
}

export interface ReadDocumentResult {
	path: string;
	source_id: string;
	source_name: string;
	content: string;
	warning?: DocSanctumWarning;
}

export interface ListedDocument {
	path: string;
	name: string;
	source_id: string;
	source_name: string;
	source_type: string;
	sha: string | null;
}

export interface SourceInfo {
	id: string;
	name: string;
}

interface McpTextContent {
	type: 'text';
	text: string;
}

function isTextContent(value: unknown): value is McpTextContent {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { type?: unknown }).type === 'text' &&
		typeof (value as { text?: unknown }).text === 'string'
	);
}

// The doc-sanctum MCP server always wraps its tool output as a single text
// content block containing a JSON string (see backend/app/mcp/tools/*.py).
function parseToolResult<T>(result: Awaited<ReturnType<Client['callTool']>>): T {
	const content: unknown = result.content;
	const first: unknown = Array.isArray(content) ? content[0] : undefined;
	if (!isTextContent(first)) {
		throw new Error('Unexpected MCP tool result shape');
	}
	return JSON.parse(first.text) as T;
}

// Accepts a bare token or the whole "Authorization: Bearer <token>" line
// that the DocSanctum web app's copy button produces.
export function normalizeAccessToken(raw: string): string {
	return raw
		.trim()
		.replace(/^authorization:\s*/i, '')
		.replace(/^bearer\s+/i, '')
		.trim();
}

// The SDK carries the HTTP status on StreamableHTTPError.code, so a rejected
// token becomes an actionable message instead of the server's raw JSON body.
export function describeConnectionError(err: unknown): string {
	const message = err instanceof Error ? err.message : String(err);
	if (err instanceof StreamableHTTPError && err.code === 401) {
		return 'the server rejected the access token. Copy the current token from the DocSanctum web app (Settings → MCP Server → Remote access).';
	}
	return message;
}

// MCP servers answer 404 to a request whose session ID they no longer know,
// which is what every open session gets after the server restarts.
function isSessionLost(err: unknown): boolean {
	return err instanceof StreamableHTTPError && err.code === 404;
}

export class DocSanctumClient {
	private client: Client | null = null;
	private connecting: Promise<Client> | null = null;

	constructor(
		private serverUrl: string,
		private accessToken = '',
	) {}

	setConnection(serverUrl: string, accessToken: string): void {
		if (serverUrl === this.serverUrl && accessToken === this.accessToken) return;
		this.serverUrl = serverUrl;
		this.accessToken = accessToken;
		this.disconnect();
	}

	private async connect(): Promise<Client> {
		if (this.client) return this.client;
		if (!this.connecting) {
			this.connecting = (async () => {
				// A token is only needed for DocSanctum's remote MCP port; the
				// local port ignores the header, so sending it there is harmless.
				const transport = new StreamableHTTPClientTransport(new URL(this.serverUrl), {
					requestInit: this.accessToken
						? { headers: { Authorization: `Bearer ${this.accessToken}` } }
						: undefined,
				});
				const client = new Client({
					name: 'doc-sanctum-obsidian',
					version: '0.1.0',
				});
				await client.connect(transport);
				this.client = client;
				return client;
			})();
		}
		try {
			return await this.connecting;
		} finally {
			this.connecting = null;
		}
	}

	async listDocuments(
		sourceId?: string,
	): Promise<{ documents: ListedDocument[]; warnings: DocSanctumWarning[] }> {
		return this.callTool('list_documents', sourceId ? { source_id: sourceId } : {});
	}

	// There's no dedicated "list sources" MCP tool, so this derives the
	// distinct set of registered sources from every document's source_id/
	// source_name — the only place that information is exposed.
	async listSources(): Promise<SourceInfo[]> {
		const { documents } = await this.listDocuments();
		const byId = new Map<string, string>();
		for (const doc of documents) {
			byId.set(doc.source_id, doc.source_name);
		}
		return Array.from(byId, ([id, name]) => ({ id, name }));
	}

	async searchDocuments(
		query: string,
		sourceId?: string,
	): Promise<{ query: string; matches: KeywordMatch[]; warnings: DocSanctumWarning[] }> {
		return this.callTool('search_documents', {
			query,
			...(sourceId ? { source_id: sourceId } : {}),
		});
	}

	async semanticSearchDocuments(
		query: string,
		sourceId?: string,
		topK?: number,
	): Promise<{ query: string; results: SemanticHit[]; warnings: DocSanctumWarning[] }> {
		return this.callTool('semantic_search_documents', {
			query,
			...(sourceId ? { source_id: sourceId } : {}),
			...(topK ? { top_k: topK } : {}),
		});
	}

	async readDocument(sourceId: string, path: string): Promise<ReadDocumentResult> {
		return this.callTool('read_document', { source_id: sourceId, path });
	}

	private async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
		try {
			return await this.callToolOnce<T>(name, args);
		} catch (err) {
			if (!isSessionLost(err)) throw err;
			// A restarted server forgets every MCP session, so start a new
			// one and retry once instead of failing until Obsidian reloads.
			this.disconnect();
			return this.callToolOnce<T>(name, args);
		}
	}

	private async callToolOnce<T>(name: string, args: Record<string, unknown>): Promise<T> {
		const client = await this.connect();
		const result = await client.callTool({ name, arguments: args });
		return parseToolResult<T>(result);
	}

	disconnect(): void {
		void this.client?.close();
		this.client = null;
	}
}
