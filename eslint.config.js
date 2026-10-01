import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "design-system-export", "design-system/reference"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Aderência ao design system (portado de design-system/lint/adherence.oxlintrc.json, export do Claude Design).
  // Vale para a biblioteca e para o que já nasce dentro dela; as telas antigas entram aqui conforme migrarem.
  {
    files: ["design-system/**/*.{ts,tsx}", "src/pages/DesignSystemShowcase.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        { selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]", message: "Cor hex crua: use um token --np-* via var()." },
        { selector: "Literal[value=/font-family\\s*:\\s*(?!['\"]?(?:Montserrat|Poppins|var\\(--np-font))/i]", message: "Fonte fora do design system (Montserrat, Poppins)." },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        { patterns: [{ group: ["@design-system/components/*", "@design-system/components/**", "**/design-system/components/**"], message: "Importe do barrel '@design-system', não dos arquivos internos." }] },
      ],
    },
  },
);
