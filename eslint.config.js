// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  // changes/ holds SDD artefacts and vendored design references, never
  // lintable app code; scripts/*.mjs are plain Node tooling outside the
  // app's TS project (tsconfig.json's `include`), not type-checked.
  // .claude/ can hold another session's git worktree (a second checkout).
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "changes/**",
      ".sdd/**",
      ".claude/**",
      "scripts/*.mjs",
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
