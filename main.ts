import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import prettier from "prettier";
import parserBabel from "prettier/parser-babel";
import parserMarkdown from "prettier/parser-markdown";
import parserTypescript from "prettier/parser-typescript";

// Remember to rename these classes and interfaces!

interface Settings {
	formatOnSave?: boolean;
	prettierConfig: Record<string, string | number | boolean>;
}

const DEFAULT_SETTINGS: Settings = {
	formatOnSave: false,
	prettierConfig: {
		arrowParens: "always",
		bracketSameLine: false,
		bracketSpacing: true,
		embeddedLanguageFormatting: "auto",
		insertPragma: false,
		jsxSingleQuote: false,
		printWidth: 80,
		proseWrap: "always",
		quoteProps: "as-needed",
		semi: true,
		singleQuote: false,
		tabWidth: 2,
	},
};

export default class PrettierFormatPlugin extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(
			`Formating: ${this.settings.formatOnSave ? "true" : "false"}`
		);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "format toggle file with perttier",
			name: "format file",
			editorCallback: (editor) => {
				this.format();
			},
		});

		if (this.settings.formatOnSave) {
			this.registerAutoSaveCommand();
		}

		this.addSettingTab(new FormatSettingTab(this.app, this));
	}

	onunload() {}

	registerAutoSaveCommand() {
		if (window.hadRegister) {
			return;
		}
		// console.log(Object.keys(this.app.commands.commands));
		// @ts-ignore
		const saveFileCommand = this.app.commands.commands["editor:save-file"];

		const originalCallback = saveFileCommand.callback;
		// saveFileCommand.callback = callback;
		saveFileCommand.callback = (...args: any) => {
			this.format();
			originalCallback && originalCallback(...args);
		};

		window.hadRegister = true;
	}

	async format() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		const editor = activeView.editor;

		const text = editor.getValue();
		const { top, left } = editor.getScrollInfo();
		const cursor = editor.getCursor();

		// console.log({ top, left });

		const formated = prettier.format(text, {
			parser: "markdown",
			...this.settings.prettierConfig,
			plugins: [parserBabel, parserMarkdown, parserTypescript],
		});

		if (text === formated) {
			return;
		}

		editor.setValue(formated);
		editor.setCursor(cursor);
		editor.scrollTo(left, top);
	}

	async loadSettings(setting: Partial<Settings> = {}) {
		this.settings = Object.assign(
			setting,
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(settings: Partial<Settings> = {}) {
		await this.saveData({ ...this.settings, ...settings });
	}
}

class FormatSettingTab extends PluginSettingTab {
	plugin: PrettierFormatPlugin;

	constructor(app: App, plugin: PrettierFormatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for Prettier-Obsidian" });

		new Setting(containerEl)
			.setName("Format On Save")
			.addToggle((toggle) => {
				toggle.onChange(async (val) => {
					await this.plugin.saveSettings({ formatOnSave: val });
				});
			});

		new Setting(containerEl)
			.setName("Prettier Config")
			.addTextArea((textarea) => {
				textarea.onChange(async (val) => {
					try {
						let config = JSON.parse(val);
						await this.plugin.saveSettings(config);
					} catch (e) {}
				});
			});
	}
}
