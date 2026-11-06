import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import DocSanctumPlugin from './main';
import { describeConnectionError, normalizeAccessToken } from './mcpClient';

export interface DocSanctumSettings {
	serverUrl: string;
	// undefined means "search every source registered on the server" —
	// DocSanctum instances can register other local paths besides this
	// vault, and without a filter their documents show up in search here
	// too (see the "Source" setting below).
	sourceId?: string;
}

export const DEFAULT_SETTINGS: DocSanctumSettings = {
	serverUrl: 'http://localhost:8000/mcp',
};

const ALL_SOURCES_OPTION = '';

export class DocSanctumSettingTab extends PluginSettingTab {
	plugin: DocSanctumPlugin;

	constructor(app: App, plugin: DocSanctumPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const intro = containerEl.createEl('p');
		intro.appendText('A client for ');
		intro.createEl('a', {
			text: 'DocSanctum',
			href: 'https://github.com/DocSanctum/doc-sanctum',
		});
		intro.appendText(
			' — a self-hosted, MCP-queryable knowledge base. This settings tab only points the plugin at your backend; sources (which folders it can search) are managed in the DocSanctum web app itself.',
		);

		const prereq = containerEl.createEl('p', { cls: 'setting-item-description' });
		prereq.createEl('strong', { text: 'Before searching: ' });
		prereq.appendText(
			'this vault (or the folder you want searchable) must already be added as a source in the DocSanctum frontend and finish indexing there. The plugin only queries sources that already exist — it does not register or index anything on its own.',
		);

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
						this.plugin.client.setConnection(
							this.plugin.settings.serverUrl,
							this.plugin.getAccessToken(),
						);
					}),
			);

		new Setting(containerEl)
			.setName('Access token')
			.setDesc(
				'Only needed when DocSanctum runs on another machine and you connect through its remote MCP port (e.g. http://192.168.1.20:8020/mcp). Copy it from the DocSanctum web app under Settings → MCP Server → Remote access. Leave empty for a server on this machine.',
			)
			.addText((text) => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('Paste token')
					.setValue(this.plugin.getAccessToken())
					.onChange((value) => {
						this.plugin.setAccessToken(normalizeAccessToken(value));
					});
			});

		new Setting(containerEl)
			.setName('Source')
			.setDesc(
				'Restrict search to a single DocSanctum source (useful if the server also indexes folders outside this vault). Leave as "All sources" to search everything.',
			)
			.addDropdown((dropdown) => {
				dropdown.addOption(ALL_SOURCES_OPTION, 'All sources');
				dropdown.setValue(this.plugin.settings.sourceId ?? ALL_SOURCES_OPTION);
				dropdown.onChange((value) => {
					void (async () => {
						this.plugin.settings.sourceId =
							value === ALL_SOURCES_OPTION ? undefined : value;
						await this.plugin.saveSettings();
					})();
				});
				// Populated asynchronously — the dropdown starts with just
				// "All sources" and gains real options once the server
				// answers (or stays that way if it's unreachable).
				void this.plugin.client
					.listSources()
					.then((sources) => {
						for (const source of sources) {
							dropdown.addOption(source.id, source.name);
						}
						dropdown.setValue(this.plugin.settings.sourceId ?? ALL_SOURCES_OPTION);
					})
					.catch(() => {
						/* leave just "All sources" if unreachable */
					});
			});

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Calls list_documents against the configured server.')
			.addButton((button) =>
				button.setButtonText('Test').onClick(async () => {
					try {
						await this.plugin.client.listDocuments();
						new Notice('DocSanctum: connection OK');
					} catch (err) {
						new Notice(`DocSanctum: connection failed — ${describeConnectionError(err)}`);
					}
				}),
			);
	}
}
