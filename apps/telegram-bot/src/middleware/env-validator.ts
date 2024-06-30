import { createMiddleware } from "hono/factory";
import { z } from "zod";

const envValidatorSchema = z.object({
	TELEGRAM_BOT_TOKEN: z.string(),
});

export const envValidator = createMiddleware(async (c, next) => {
	const parseEnv = envValidatorSchema.safeParse(c.env);
	if (!parseEnv.success) {
		throw new Error(
			`❌ MIssing Environment Variable: ${parseEnv.error.message}`,
		);
	}

	await next();
});
