import { Editor } from "@winston/rte/editor";
import { FileExplorer } from "@winston/rte/file-explorer";

export const runtime = "edge";

export default function HomePage() {
	return (
		<main className="container min-h-screen py-16">
			<FileExplorer />
			<Editor />
		</main>
	);
}
