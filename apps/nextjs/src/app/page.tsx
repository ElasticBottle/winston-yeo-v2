import { Editor } from "@winston/rte/editor";
import { FileExplorer } from "@winston/rte/file-explorer";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@winston/ui/resizable";
export const runtime = "edge";

export default function HomePage() {
	return (
		<ResizablePanelGroup direction="horizontal" className="min-h-screen">
			<ResizablePanel defaultSize={200}>
				<FileExplorer />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={800} className="p-5">
				<Editor />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
