import { cn } from "@winston/ui";
import { ThemeProvider, ThemeToggle } from "@winston/ui/theme";
import { Toaster } from "@winston/ui/toast";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { TRPCReactProvider } from "~/trpc/react";

import "~/app/globals.css";

import { env } from "~/env";

export const metadata: Metadata = {
	metadataBase: new URL(
		env.VERCEL_ENV === "production"
			? "https://turbo.t3.gg"
			: "http://localhost:3000",
	),
	title: "Winston Yeo	",
	description: "Playground for random ideas",
	openGraph: {
		title: "Winston Yeo",
		description: "Playground for random ideas",
		url: "https://create-t3-turbo.vercel.app",
		siteName: "Winston Yeo",
	},
	twitter: {
		card: "summary_large_image",
		site: "@winston_yeo",
		creator: "@winston_yeo",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"min-h-screen bg-background font-sans text-foreground antialiased",
					GeistSans.variable,
					GeistMono.variable,
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<TRPCReactProvider>{props.children}</TRPCReactProvider>
					<div className="absolute bottom-4 right-4">
						<ThemeToggle />
					</div>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
