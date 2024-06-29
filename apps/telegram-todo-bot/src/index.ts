import { Hono } from "hono";
import { env } from "./env";

const app = new Hono();
app.get("/", (c) => {
	console.log("env", env);
	return c.text("Hello Bun!");
});

export default {
	port: 8787,
	fetch: app.fetch,
};
