import { Hono } from "hono";
import { envValidator } from "./middleware/env-validator";
type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", envValidator);

app.get("/", (c) => {
	console.log("env", c.env);
	return c.text("Hello Bun!");
});
export default app;
