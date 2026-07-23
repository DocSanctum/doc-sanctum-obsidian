import { Plugin } from 'obsidian';
import { DocSanctumClient } from './mcpClient';
import { DEFAULT_SETTINGS, DocSanctumSettings, DocSanctumSettingTab } from './settings';
import { DocSanctumSearchModal } from './searchModal';

export default class DocSanctumPlugin extends Plugin {
	settings!: DocSanctumSettings;
	client!: DocSanctumClient;

	async onload() {
		await this.loadSettings();
		this.client = new DocSanctumClient(this.settings.serverUrl);

		this.addRibbonIcon('search', 'Search DocSanctum', () => {
			new DocSanctumSearchModal(this.app, this, 'keyword').open();
		});

		this.addCommand({
			id: 'search',
			name: 'Search',
			callback: () => {
				new DocSanctumSearchModal(this.app, this, 'keyword').open();
			},
		});

		this.addCommand({
			id: 'semantic-search',
			name: 'Semantic search',
			callback: () => {
				new DocSanctumSearchModal(this.app, this, 'semantic').open();
			},
		});

		this.addSettingTab(new DocSanctumSettingTab(this.app, this));
	}

	onunload() {
		this.client.disconnect();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<DocSanctumSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
