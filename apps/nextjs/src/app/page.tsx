import { Editor } from '@winston/rte/editor';

export const runtime = "edge";

export default function HomePage() {
	return <main className="container h-screen py-16"><Editor/></main>;
}
