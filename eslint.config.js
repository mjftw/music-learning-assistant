// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  // changes/ holds SDD artefacts and vendored design references, never lintable app code
  { ignores: ["dist/**", "node_modules/**", "changes/**", ".sdd/**"] },
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
