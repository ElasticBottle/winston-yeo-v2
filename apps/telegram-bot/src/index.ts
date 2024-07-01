import type { KVNamespace } from "@cloudflare/workers-types";
import type { Ai } from "@cloudflare/workers-types/experimental";
import { type EmojiFlavor, emojiParser } from "@grammyjs/emoji";
import { KvAdapter } from "@grammyjs/storage-cloudflare";
import { parseDate } from "chrono-node";
import type { Message, Update, UserFromGetMe } from "grammy/types";
import {
	Bot,
	type Context,
	type SessionFlavor,
	lazySession,
	webhookCallback,
} from "grammy/web";
import { Hono } from "hono";
import { z } from "zod";
import { envValidator } from "./middleware/env-validator";

type Bindings = {
	AI: Ai;
	TODO_DEMO: KVNamespace;
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_BOT_INFO: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", envValidator);

app.post("/", async (c) => {
	const botInfo: UserFromGetMe = JSON.parse(
		decodeURIComponent(c.env.TELEGRAM_BOT_INFO),
	);

	interface SessionData {
		todo: Array<{
			item: string;
			tags: Array<string>;
			dueDate?: string;
			location?: string;
		}>;
	}
	type BotContext = EmojiFlavor<Context> & SessionFlavor<SessionData>;

	const bot = new Bot<BotContext>(c.env.TELEGRAM_BOT_TOKEN, {
		botInfo,
	});

	const storage = new KvAdapter<SessionData>(c.env.TODO_DEMO);
	bot.use(
		lazySession({
			initial: (): SessionData => {
				return { todo: [] };
			},
			storage,
		}),
	);
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
						
You are a function calling AI model. You are provided with function signatures within <tools></tools> XML tags. You may call one or more functions to assist with the user query. Don't make assumptions about what values to plug into functions. Here are the available tools: <tools> [{'type': 'function', 'function': {'name': 'get_stock_fundamentals', 'description': 'Get fundamental data for a given stock symbol using yfinance API.', 'parameters': {'type': 'object', 'properties': {'symbol': {'type': 'string'}}, 'required': ['symbol']}}}] </tools> Use the following pydantic model json schema for each tool call you will make: {'title': 'FunctionCall', 'type': 'object', 'properties': {'arguments': {'title': 'Arguments', 'type': 'object'}, 'name': {'title': 'Name', 'type': 'string'}}, 'required': ['arguments', 'name']} For each function call return a json object with function name and arguments within <tool_call></tool_call> XML tags as follows:
<tool_call>
{'arguments': <args-dict>, 'name': <function-name>}
</tool_call>

Listen to the user's request and do your best to configure or display the TODO list to match the conversation.

Always prefer calling tools. When not calling tools to manage the TODO list, you should respond with a message that acknowledges the user's request an stay concise, and empathetic. 

Give no more than 2 sentence response.`,
					},
					{
						role: "user",
						content: text,
					},
					{
						role: "system",
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
							name: "getTodos",
							description:
								"Retrieve user TODOs from the list based on some potential filers. Not that if no parameters are specified, all TODOs will be returned. Use this is users specifies that he or she would like to see their TODOs in any way shape or form.",
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
					{
						function: {
							name: "allTodos",
							description:
								"retrieves all the TODOs from the list. Use this if the user asks to see all their TODOs.",
							parameters: {
								type: "object",
								properties: {},
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
			if (response.response) {
				return await ctx.reply(
					`${response.response}.
DEBUG user input: ${text}`,
					{
						reply_markup: {
							force_reply: true,
						},
						reply_parameters: { message_id: msg.message_id },
					},
				);
			}
			if (response.tool_calls) {
				for (const toolCall of response.tool_calls) {
					switch (toolCall.name) {
						case "addTodo": {
							const todoItem = z
								.object({
									item: z.string(),
									tags: z.array(z.string()).optional(),
									dueDate: z.string().optional(),
									location: z.string().optional(),
								})
								.parse(toolCall.arguments);

							(await ctx.session).todo.push({
								item: todoItem.item,
								tags: todoItem.tags ?? [],
								dueDate: date?.toISOString() ?? undefined,
								location: todoItem.location,
							});
							await storage.write(msg.chat.id.toString(), ctx.session);
							return ctx.reply(
								`Added: "${todoItem.item}
								
						DEBUG user input: ${text}"`,
								{
									reply_parameters: { message_id: msg.message_id },
								},
							);
						}
						case "getTodos": {
							const { todo: todos } = await ctx.session;
							const filters = z
								.object({
									date: z.string().optional(),
									location: z.string().optional(),
								})
								.parse(toolCall.arguments);
							console.log("filters", filters);
							const filteredTodos = todos.filter((todo) => {
								console.log("todo", todo);
								if (date && todo.dueDate) {
									return (
										new Date(todo.dueDate).getDate() ===
											new Date(date).getDate() &&
										new Date(todo.dueDate).getMonth() ===
											new Date(date).getMonth()
									);
								}
								if (filters.location) {
									return todo.location === filters.location;
								}
								return true;
							});

							const todoList = filteredTodos
								.map(
									(todo, i) =>
										`${i + 1}. ${todo.item} ${
											todo.dueDate ? `due on ${todo.dueDate}` : ""
										} ${todo.location ? `at ${todo.location}` : ""}`,
								)
								.join("\n");
							return ctx.reply(
								`Your TODOs:\n${todoList}
								
						DEBUG user input: ${text}`,
								{
									reply_parameters: { message_id: msg.message_id },
								},
							);
						}
						case "allTodos": {
							const { todo: todos } = await ctx.session;
							if (todos.length === 0) {
								return ctx.reply("You have no TODOs!", {
									reply_parameters: { message_id: msg.message_id },
								});
							}
							const todoList = todos
								.map(
									(todo, i) =>
										`${i + 1}. ${todo.item} ${
											todo.dueDate ? `due on ${todo.dueDate}` : ""
										} ${todo.location ? `at ${todo.location}` : ""}`,
								)
								.join("\n");
							return ctx.reply(
								`Your TODOs:\n${todoList}
								
						DEBUG user input: ${text}`,
								{
									reply_parameters: { message_id: msg.message_id },
								},
							);
						}
						default: {
							return ctx.reply(`I'm sorry, I didn't understand that.`, {
								reply_parameters: { message_id: msg.message_id },
							});
						}
					}
				}
			}
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
