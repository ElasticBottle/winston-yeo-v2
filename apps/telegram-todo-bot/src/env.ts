/* eslint-disable no-restricted-properties */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		TELEGRAM_BOT_TOKEN: z.string(),
	},

	experimental__runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
	},
	skipValidation:
		!!process.env.CI ||
		!!process.env.SKIP_ENV_VALIDATION ||
		process.env.npm_lifecycle_event === "lint",
});
