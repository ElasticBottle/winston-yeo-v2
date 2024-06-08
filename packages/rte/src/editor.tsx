"use client";

import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { AudioRecorder } from "./mic-recorder";

const themeClass: InitialConfigType["theme"] = {
	code: "editor-code  ",
	heading: {
		h1: "editor-heading-h1",
		h2: "editor-heading-h2",
		h3: "editor-heading-h3",
		h4: "editor-heading-h4",
		h5: "editor-heading-h5",
	},
	image: "editor-image",
	link: "editor-link",
	list: {
		listitem: "editor-listitem",
		nested: {
			listitem: "editor-nested-listitem",
		},
		ol: "editor-list-ol",
		ul: "editor-list-ul",
	},
	ltr: "ltr",
	paragraph: "editor-paragraph",
	placeholder: "text-muted-foreground",
	quote: "editor-quote",
	rtl: "rtl",
	text: {
		base: "text-base",
		bold: "font-bold text-2xl",
		code: "font-mono",
		italic: "italic",
		strikethrough: "strikethrough",
		underline: "underline",
		underlineStrikethrough: "[text-decoration:underline_line-through]",
	},
};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
const onError: InitialConfigType["onError"] = function onError(error) {
	console.error(error);
};

export function Editor() {
	const initialConfig: InitialConfigType = {
		namespace: "RTE",
		theme: themeClass,
		onError,
		nodes: [
			HorizontalRuleNode,
			CodeNode,
			HeadingNode,
			LinkNode,
			ListNode,
			ListItemNode,
			QuoteNode,
		],
	};

	return (
		<div className="flex flex-col gap-3">
			<AudioRecorder />
			<LexicalComposer initialConfig={initialConfig}>
				<div className="relative">
					<RichTextPlugin
						contentEditable={
							<ContentEditable className=" min-h-80 text-base caret-yellow-500 outline-none px-4 py-6 bg-secondary text-secondary-foreground rounded-md" />
						}
						placeholder={
							<div className="absolute text-muted-foreground top-6 left-5 pointer-events-none select-none">
								Type to start writing...
							</div>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
					<HistoryPlugin />
					<AutoFocusPlugin />
				</div>
			</LexicalComposer>
		</div>
	);
}
