import { App, Notice, SuggestModal } from 'obsidian';
import DocSanctumPlugin from './main';
import { DocumentModal } from './documentModal';

interface ResultItem {
	sourceId: string;
	sourceName: string;
	path: string;
	snippet: string;
}

export type SearchMode = 'keyword' | 'semantic';

export class DocSanctumSearchModal extends SuggestModal<ResultItem> {
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

	async getSuggestions(query: string): Promise<ResultItem[]> {
		if (!query.trim()) return [];
		try {
			if (this.mode === 'semantic') {
				const { results } = await this.plugin.client.semanticSearchDocuments(query);
				return results.map((hit) => ({
					sourceId: hit.source_id,
					sourceName: hit.source_name,
					path: hit.path,
					snippet: hit.excerpt,
				}));
			}
			const { matches } = await this.plugin.client.searchDocuments(query);
			return matches.map((match) => ({
				sourceId: match.source_id,
				sourceName: match.source_name,
				path: match.path,
				snippet: match.line,
			}));
		} catch (err) {
			new Notice(`DocSanctum search failed — ${(err as Error).message}`);
			return [];
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
			new DocumentModal(this.app, doc.source_name, doc.path, doc.content).open();
		} catch (err) {
			new Notice(`DocSanctum: failed to open document — ${(err as Error).message}`);
		}
	}
}
