module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from @typescript-eslint/eslint-plugin
    "plugin:import/errors",
    "plugin:import/warnings",
    "prettier",
    "plugin:prettier/recommended" // Should be last in the list. Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  overrides: [
    {
      // enable the rule specifically for TypeScript files
      files: ["*.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": ["error"]
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: "module" // Allows for the use of imports
  },
  env: {
    browser: false
  },
  rules: {
    "no-use-before-define": "off",
    "linebreak-style": ["error", "unix"],
    "no-cond-assign": ["error", "always"],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-var-requires": "off",
    "no-console": "off",
    "react/display-name": "off",
    "import/no-self-import": ["error"],
    "import/no-useless-path-segments": [
      "error",
      {
        noUselessIndex: true
      }
    ]
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".ts"],
        moduleDirectory: ["node_modules", "src"]
      }
    }
  }
};
