import { App, Notice, SuggestModal } from 'obsidian';
import DocSanctumPlugin from './main';
import { DocumentModal } from './documentModal';
import { DocSanctumWarning, describeConnectionError } from './mcpClient';

interface ResultItem {
	sourceId: string;
	sourceName: string;
	path: string;
	snippet: string;
}

export type SearchMode = 'keyword' | 'semantic';

const DEBOUNCE_MS = 300;

export class DocSanctumSearchModal extends SuggestModal<ResultItem> {
	private debounceTimer: number | undefined;
	// Warnings (e.g. a source falling back to stale cached data) apply to a
	// whole source, not a single query, so once shown once per source+reason
	// there's no need to repeat it on every keystroke.
	private readonly notifiedWarnings = new Set<string>();

	constructor(
		app: App,
		private plugin: DocSanctumPlugin,
		private mode: SearchMode,
	) {
		super(app);
		this.setPlaceholder(
			mode === 'semantic' ? 'Semantic search DocSanctum…' : 'Search DocSanctum…',
		);
	}

	// Semantic search runs a real embedding + vector query on the backend,
	// so firing one on every keystroke queues up overlapping requests behind
	// each other — including, eventually, the read_document call for
	// whatever the user clicks. Debouncing keeps at most one in flight.
	getSuggestions(query: string): Promise<ResultItem[]> {
		if (!query.trim()) return Promise.resolve([]);
		if (this.debounceTimer !== undefined) {
			window.clearTimeout(this.debounceTimer);
		}
		return new Promise((resolve) => {
			this.debounceTimer = window.setTimeout(() => {
				void this.fetchSuggestions(query).then(resolve);
			}, DEBOUNCE_MS);
		});
	}

	private async fetchSuggestions(query: string): Promise<ResultItem[]> {
		const sourceId = this.plugin.settings.sourceId;
		try {
			if (this.mode === 'semantic') {
				const { results, warnings } = await this.plugin.client.semanticSearchDocuments(
					query,
					sourceId,
				);
				this.surfaceWarnings(warnings);
				return results.map((hit) => ({
					sourceId: hit.source_id,
					sourceName: hit.source_name,
					path: hit.path,
					snippet: hit.excerpt,
				}));
			}
			const { matches, warnings } = await this.plugin.client.searchDocuments(
				query,
				sourceId,
			);
			this.surfaceWarnings(warnings);
			return matches.map((match) => ({
				sourceId: match.source_id,
				sourceName: match.source_name,
				path: match.path,
				snippet: match.line,
			}));
		} catch (err) {
			new Notice(`DocSanctum search failed — ${describeConnectionError(err)}`);
			return [];
		}
	}

	private surfaceWarnings(warnings: DocSanctumWarning[]): void {
		for (const warning of warnings) {
			const key = `${warning.source_id}:${warning.reason}`;
			if (this.notifiedWarnings.has(key)) continue;
			this.notifiedWarnings.add(key);
			new Notice(`DocSanctum: ${warning.source_name} — ${warning.message}`);
		}
	}

	renderSuggestion(item: ResultItem, el: HTMLElement): void {
		el.createDiv({ text: `${item.sourceName} / ${item.path}` });
		el.createEl('small', { text: item.snippet });
	}

	onChooseSuggestion(item: ResultItem): void {
		void this.openDocument(item);
	}

	private async openDocument(item: ResultItem): Promise<void> {
		try {
			const doc = await this.plugin.client.readDocument(item.sourceId, item.path);
			new DocumentModal(
				this.app,
				doc.source_name,
				doc.path,
				doc.content,
				doc.warning,
			).open();
		} catch (err) {
			new Notice(`DocSanctum: failed to open document — ${describeConnectionError(err)}`);
		}
	}
}
