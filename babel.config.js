module.exports = {
  ignore: ["**/*.d.ts"],
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "14.4.0",
        },
        modules: "commonjs",
      },
    ],
    "@babel/preset-react",
    "@babel/preset-typescript",
  ],
  plugins: ["@babel/plugin-proposal-class-properties"],
};
