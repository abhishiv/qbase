const esModules = [].join("|");
module.exports = {
  testEnvironment: "jsdom",
  reporters: ["default"],
  setupFiles: [],
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules",
    "<rootDir>/dist",
    "<rootDir>/packages/hub/src/e2e",
    "<rootDir>/packages/*/dist",
    "<rootDir>/packages/shell/src/public/bundles",
  ],
};
