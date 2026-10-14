import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["coverage/", "dist/"] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["describe", "it", "suite", "test"] }]
        }
      ]
    }
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked]
  }
);
