import type { Ai } from "@cloudflare/workers-types/experimental";
import { type EmojiFlavor, emojiParser } from "@grammyjs/emoji";
import { parseDate } from "chrono-node";
import type { Message, Update, UserFromGetMe } from "grammy/types";
import { Bot, type Context, webhookCallback } from "grammy/web";
import { Hono } from "hono";
import { envValidator } from "./middleware/env-validator";

type Bindings = {
	AI: Ai;
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_BOT_INFO: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", envValidator);

app.post("/", async (c) => {
	const botInfo: UserFromGetMe = JSON.parse(
		decodeURIComponent(c.env.TELEGRAM_BOT_INFO),
	);

	type BotContext = EmojiFlavor<Context>;

	const bot = new Bot<BotContext>(c.env.TELEGRAM_BOT_TOKEN, {
		botInfo,
	});
	bot.use(emojiParser());

	bot.command("start", async (ctx) => {
		await ctx.reply(
			"Welcome, I'm a bot that helps you keep track of your tasks and reminds you when things are due!",
		);
	});

	const onMessage = async (
		ctx: BotContext,
		msg: Message & Update.NonChannel,
	) => {
		console.log("ctx.from", ctx.from);
		console.log("ctx.chat", ctx.chat);
		console.log("msg", msg);

		let text = msg.text;
		if (msg.voice) {
			if ((msg.voice.file_size ?? 0) > 2e7) {
				const emojiString = ctx.emoji`I can't process audio files larger than 20MB ${"smiling_face_with_tear"}`;
				return ctx.reply(emojiString, {
					reply_parameters: { message_id: msg.message_id },
				});
			}
			const fileInfo = await ctx.api.getFile(msg.voice.file_id);
			const fileResp = await fetch(
				`https://api.telegram.org/file/bot${c.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`,
			);
			const file = await fileResp.arrayBuffer();

			const response = await c.env.AI.run("@cf/openai/whisper", {
				audio: [...new Uint8Array(file)],
			});
			console.log("response", response);
			text = response.text;
		}

		if (!text) {
			const emojiString = ctx.emoji`I did not understand your request ${"smiling_face_with_tear"} Try with either text or voice!`;
			return ctx.reply(emojiString, {
				reply_parameters: { message_id: msg.message_id },
			});
		}

		const date = parseDate(text, new Date(), { forwardDate: true });
		console.log("date", date);

		const response = await c.env.AI.run(
			"@hf/nousresearch/hermes-2-pro-mistral-7b",
			{
				messages: [
					{
						role: "system",
						content: `You are a world class leading assistant named Rajesh. You are tasked with helping a user manage their TODO list. 
						
You should be able to add, update, and delete items from the list. You should also be able to provide the user with a list of items that are due soon.

Listen to the user's request and do your best to configure the TODO list to match the conversation.

When not calling tools to manage the TODO list, you should respond with a message that acknowledges the user's request an stay concise, and empathetic. 

Give no more than 2 sentence response.`,
					},
					{
						role: "user",
						content: text,
					},
					{
						role: "assistant",
						content: date
							? `The user has requested for the given request to happen on ${date.toISOString()}`
							: "The user has not requested for a specific date to be used.",
					},
				],
				tools: [
					{
						function: {
							name: "addTodo",
							description: "Adds a todo to the list",
							parameters: {
								type: "object",
								properties: {
									item: {
										type: "string",
										description: "The item to add to the TODO list",
									},
									tags: {
										type: "string[]",
										description: "Helpful tags for the item",
									},
									dueDate: {
										type: "string",
										description: "The due date for the item",
									},
									location: {
										type: "string",
										description: "The location for the item",
									},
								},
								required: ["item"],
							},
						},
						type: "function",
					},
					{
						function: {
							name: "getTodo",
							description: "get TODOs from the list",
							parameters: {
								type: "object",
								properties: {
									date: {
										type: "string",
										description: "The date to get TODOs for",
									},
									location: {
										type: "string",
										description: "The location to get TODOs for",
									},
								},
								required: [],
							},
						},
						type: "function",
					},
					// {
					// 	function: {
					// 		name: "deleteTodo",
					// 		description: "Return the weather for a latitude and longitude",
					// 		parameters: {
					// 			type: "object",
					// 			properties: {
					// 				latitude: {
					// 					type: "string",
					// 					description: "The latitude for the given location",
					// 				},
					// 				longitude: {
					// 					type: "string",
					// 					description: "The longitude for the given location",
					// 				},
					// 			},
					// 			required: ["latitude", "longitude"],
					// 		},
					// 	},
					// 	type: "function",
					// },
				],
			},
		);

		if ("response" in response) {
			console.log("response", response);
			return await ctx.reply(
				`I heard what you said: ${text}.
				
In an ideal world, I would have responded with ${response.response}

I would also have called the following tools:
${response.tool_calls ? formatToolUse(response.tool_calls, date) : ""}`,
				{
					reply_parameters: { message_id: msg.message_id },
				},
			);
		}
		return await ctx.reply("I'm sorry, I didn't understand that.", {
			reply_parameters: { message_id: msg.message_id },
		});
	};

	bot.on("message", (ctx) => {
		if (ctx.chat.type !== "private") {
			return ctx.reply(
				`I only work in private chats for now! Search up ${botInfo.username} to get started`,
			);
		}
		onMessage(ctx, ctx.message);
	});

	return await webhookCallback(bot, "hono")(c);
});

app.get("/", (c) => {
	return c.body("Hello World!");
});

export default app;

const formatToolUse = (
	toolUsed: Array<{
		arguments: unknown;
		name: string;
	}>,
	date: Date | null,
) => {
	return toolUsed
		.map((tool) => {
			const args = JSON.stringify(tool.arguments);
			return `${tool.name}(${args}, date: ${date})`;
		})
		.join("\n");
};
