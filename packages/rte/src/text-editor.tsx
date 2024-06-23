"use client";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@winston/ui/resizable";
import { useState } from "react";
import { Editor } from "./editor";
import { FileExplorer, type FileType } from "./file-explorer";

export function TextEditor() {
	const [sourceFile, setSourceFile] = useState<FileType | undefined>(undefined);

	return (
		<ResizablePanelGroup direction="horizontal" className="min-h-screen">
			<ResizablePanel defaultSize={20}>
				<FileExplorer setSourceFile={setSourceFile} />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={80} className="p-5">
				<Editor sourceFile={sourceFile} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
