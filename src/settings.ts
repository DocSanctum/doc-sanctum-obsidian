import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import DocSanctumPlugin from './main';

export interface DocSanctumSettings {
	serverUrl: string;
}

export const DEFAULT_SETTINGS: DocSanctumSettings = {
	serverUrl: 'http://localhost:8000/mcp',
};

export class DocSanctumSettingTab extends PluginSettingTab {
	plugin: DocSanctumPlugin;

	constructor(app: App, plugin: DocSanctumPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Server URL')
			.setDesc(
				'The MCP endpoint of your DocSanctum backend, e.g. http://localhost:8000/mcp.',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.serverUrl)
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value.trim();
						await this.plugin.saveSettings();
						this.plugin.client.setServerUrl(this.plugin.settings.serverUrl);
					}),
			);

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Calls list_documents against the configured server.')
			.addButton((button) =>
				button.setButtonText('Test').onClick(async () => {
					try {
						await this.plugin.client.listDocuments();
						new Notice('DocSanctum: connection OK');
					} catch (err) {
						new Notice(`DocSanctum: connection failed — ${(err as Error).message}`);
					}
				}),
			);
	}
}
