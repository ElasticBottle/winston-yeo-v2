import { type HttpBindings, serve } from "@hono/node-server";

import { Hono } from "hono";
import { env } from "./env";

type Bindings = HttpBindings;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
	console.log("env", env);
	return c.text("Hello Bun!");
});

serve({
	fetch: app.fetch,
	port: 8787,
});
