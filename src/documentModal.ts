import { App, Component, MarkdownRenderer, Modal } from 'obsidian';

export class DocumentModal extends Modal {
	// Modal doesn't itself implement Component, so the rendered markdown's
	// event listeners are scoped to this dedicated Component instead of the
	// long-lived plugin — loaded/unloaded alongside the modal.
	private component = new Component();

	constructor(
		app: App,
		private sourceName: string,
		private path: string,
		private content: string,
	) {
		super(app);
	}

	onOpen(): void {
		this.component.load();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: `${this.sourceName} / ${this.path}` });
		const body = contentEl.createDiv();
		void MarkdownRenderer.render(
			this.app,
			this.content,
			body,
			this.path,
			this.component,
		);
	}

	onClose(): void {
		this.component.unload();
		this.contentEl.empty();
	}
}
