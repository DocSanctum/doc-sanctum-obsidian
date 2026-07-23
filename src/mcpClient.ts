import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

export interface ReadDocumentResult {
	path: string;
	source_id: string;
	source_name: string;
	content: string;
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

export class DocSanctumClient {
	private client: Client | null = null;
	private connecting: Promise<Client> | null = null;

	constructor(private serverUrl: string) {}

	setServerUrl(serverUrl: string): void {
		if (serverUrl === this.serverUrl) return;
		this.serverUrl = serverUrl;
		this.disconnect();
	}

	private async connect(): Promise<Client> {
		if (this.client) return this.client;
		if (!this.connecting) {
			this.connecting = (async () => {
				const transport = new StreamableHTTPClientTransport(
					new URL(this.serverUrl),
				);
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

	async listDocuments(sourceId?: string): Promise<unknown> {
		return this.callTool('list_documents', sourceId ? { source_id: sourceId } : {});
	}

	async searchDocuments(
		query: string,
		sourceId?: string,
	): Promise<{ query: string; matches: KeywordMatch[]; warnings: unknown[] }> {
		return this.callTool('search_documents', {
			query,
			...(sourceId ? { source_id: sourceId } : {}),
		});
	}

	async semanticSearchDocuments(
		query: string,
		sourceId?: string,
		topK?: number,
	): Promise<{ query: string; results: SemanticHit[]; warnings: unknown[] }> {
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
		const client = await this.connect();
		const result = await client.callTool({ name, arguments: args });
		return parseToolResult<T>(result);
	}

	disconnect(): void {
		void this.client?.close();
		this.client = null;
	}
}
