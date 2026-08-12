import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import roblox from "eslint-plugin-roblox-ts";

export default defineConfig([
	globalIgnores(["out", "dist"]),

	// Base JS rules (replaces "eslint:recommended")
	js.configs.recommended,

	// TypeScript rules (replaces plugin:@typescript-eslint/recommended)
	...tseslint.configs.recommended,

	{
		files: ["**/*.ts", "**/*.d.ts"],

		languageOptions: {
			parser: tseslint.parser,
			ecmaVersion: 2018,
			sourceType: "module",
			parserOptions: {
				project: "./tsconfig.json",
				jsx: true,
				useJSXTextNode: true,
			},
		},

		plugins: {
			"roblox-ts": roblox,
			prettier,
		},

		rules: {

			// roblox-ts rules
			"roblox-ts/no-any": "error",
			"roblox-ts/no-null": "error",
			"roblox-ts/no-object-math": "error",
			// prettier
			"prettier/prettier": "warn",

			// overrides from old config
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-require-imports": "off",
			"prefer-const": "warn",
		},
	},
]);