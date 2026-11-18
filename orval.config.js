import 'dotenv/config';

import { defineConfig } from 'orval';

export default defineConfig({
	hartazone: {
		input: './openapi/schema.json',
		output: {
			schemas: './src/shared/api/models',
			target: './src/shared/api',
			client: 'zod',
			clean: true
		}
	}
});
