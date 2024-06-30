import { type EmojiFlavor, emojiParser } from "@grammyjs/emoji";
import { Bot, type Context, webhookCallback } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { Hono } from "hono";
import { envValidator } from "./middleware/env-validator";

type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_BOT_INFO: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", envValidator);

app.post("/", async (c) => {
	const botInfo: UserFromGetMe = JSON.parse(
		decodeURIComponent(c.env.TELEGRAM_BOT_INFO),
	);

	type MyContext = EmojiFlavor<Context>;

	const bot = new Bot<MyContext>(c.env.TELEGRAM_BOT_TOKEN, {
		botInfo,
	});
	bot.use(emojiParser());

	bot.command("start", async (ctx: Context) => {
		await ctx.reply(
			"Welcome, I'm a bot that helps you keep track of your tasks and reminds you when things are due!",
		);
	});
	bot.on("message", async (ctx) => {
		if (ctx.chat.type !== "private") {
			return ctx.reply(
				`I only work in private chats for now! Search up ${botInfo.username} to get started`,
			);
		}
		console.log("ctx.from", ctx.from);
		console.log("ctx.chat", ctx.chat);
		console.log("ctx.msg", ctx.msg);

		if (!ctx.msg.text) {
			const emojiString = ctx.emoji`I only understand text messages for now ${"smiling_face_with_tear"}`;
			return ctx.reply(emojiString, {
				reply_parameters: { message_id: ctx.msg.message_id },
			});
		}
		await ctx.reply("Got another message!", {
			reply_parameters: { message_id: ctx.msg.message_id },
		});
	});

	return await webhookCallback(bot, "hono")(c);
});

app.get("/", (c) => {
	return c.body("Hello World!");
});

export default app;
