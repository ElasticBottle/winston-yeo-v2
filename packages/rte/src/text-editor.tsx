"use client";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@winston/ui/resizable";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Editor } from "./editor";
import type { FileType } from "./file-explorer";

const FileExplorer = dynamic(
	() =>
		import("./file-explorer").then((result) => {
			return result.FileExplorer;
		}),
	{
		ssr: false,
	},
);

export function TextEditor() {
	const [sourceFile, setSourceFile] = useState<FileType | undefined>(undefined);

	let EditorBody = (
		<div className="w-full flex justify-center items-center h-full">
			<div className="text-muted-foreground text-sm ">
				Select or create a file to get started
			</div>
		</div>
	);
	if (sourceFile) {
		EditorBody = <Editor sourceFile={sourceFile} />;
	}

	return (
		<ResizablePanelGroup direction="horizontal" className="min-h-screen">
			<ResizablePanel defaultSize={20}>
				<FileExplorer setSourceFile={setSourceFile} />
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={80} className="p-5">
				{EditorBody}
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
