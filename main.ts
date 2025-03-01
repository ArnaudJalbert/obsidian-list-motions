import { Plugin, App, PluginManifest, Editor, MarkdownView } from "obsidian";

export default class ObsidianListMotions extends Plugin {
	statusBarElement: HTMLSpanElement;
	listRegex: RegExp;
	countListRegex: RegExp;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.listRegex = /^\s*[-*+] \[([^\]]+)\]/;
		this.countListRegex = /^\s*[-*+] \[.*?\]/gm;
	}

	async onload(): Promise<void> {
		this.initStatusBarAndEventListeners();

		this.addListMotionCommands();
	}

	addListMotionCommands() {
		this.addCommand({
			id: "list-motion-done",
			name: "Mark List Instance as Done",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.markListAsDone(editor);
			},
		});

		this.addCommand({
			id: "list-motion-open",
			name: "Mark List Instance as Open",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.markListAsOpen(editor);
			},
		});

		this.addCommand({
			id: "list-motion-in-progress",
			name: "Mark List Instance as In Progress",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.markListAsInProgress(editor);
			},
		});
	}

	async markListAsDone(editor: Editor) {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const match = line.match(this.listRegex);

		if (!match) {
			return;
		}

		const newLine = await this.replaceBracketContent(line, "x");
		editor.replaceRange(
			newLine,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: line.length },
		);
	}

	async markListAsOpen(editor: Editor) {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const match = line.match(this.listRegex);

		if (!match) {
			return;
		}

		const newLine = await this.replaceBracketContent(line, " ");
		editor.replaceRange(
			newLine,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: line.length },
		);
	}

	async markListAsInProgress(editor: Editor) {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const match = line.match(this.listRegex);

		if (!match) {
			return;
		}

		let newLine = await this.replaceBracketContent(line, "/");
		newLine = await this.replaceTodoTags(newLine);
		editor.replaceRange(
			newLine,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: line.length },
		);
	}

	async replaceTodoTags(input: string): Promise<string> {
		return input.replace(/#todo(\/[^\s]*)?/g, (match, group) => {
			return group ? "#todo/in-progress" : "#todo/in-progress";
		});
	}

	async replaceBracketContent(
		line: string,
		newText: string,
	): Promise<string> {
		return line.replace(/^(\s*[-*+] \[)[^\]]*(\])/, `$1${newText}$2`);
	}

	initStatusBarAndEventListeners() {
		// Initialize the status bar element
		this.statusBarElement = this.addStatusBarItem().createEl("span");

		// Initialize the content of the status bar element
		this.statusBarElement.textContent = "List Count: 0";

		// Catch leaf change event and update status bar
		this.app.workspace.on("active-leaf-change", async () => {
			const file = this.app.workspace.getActiveFile();

			if (!file) {
				return;
			}

			const content = await this.app.vault.read(file);

			await this.countAndUpdateListsCount(content);
		});

		// Catch editor change event and update status bar
		this.app.workspace.on("editor-change", async (editor) => {
			const content = editor.getDoc().getValue();

			await this.countAndUpdateListsCount(content);
		});
	}

	async countAndUpdateListsCount(content: string): Promise<number> {
		const lists_count = await this.getListsCount(content);
		this.updateStatusBar(lists_count);
		return lists_count;
	}

	async updateStatusBar(lists_count: number) {
		this.statusBarElement.textContent = `List Count: ${lists_count}`;
	}

	async getListsCount(content: string): Promise<number> {
		return content.match(this.countListRegex)?.length || 0;
	}
}
