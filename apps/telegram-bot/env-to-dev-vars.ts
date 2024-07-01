import { writeFileSync } from "node:fs";
import { argv } from "node:process";

const convertJsonToDevVars = (jsonString: string) => {
	const json = JSON.parse(jsonString);
	let contentString = "";
	for (const key of Object.keys(json)) {
		if (key.startsWith("DOTENV")) continue;
		contentString += `${key}=${json[key]}\n`;
	}
	writeFileSync(".dev.vars", contentString);
};

const main = () => {
	const decryptedEnv = argv[2];
	if (!decryptedEnv) {
		throw new Error("❌ Missing decrypted env");
	}
	convertJsonToDevVars(decryptedEnv);
};

main();
