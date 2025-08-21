import { RollupOptions } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import del from "rollup-plugin-delete";
import dts from "rollup-plugin-dts";

const entry = "src/index.ts";
const outputDir = "dist";
const outputPreserve = {
  preserveModules: true,
  preserveModulesRoot: "src",
};

const config: RollupOptions[] = [
  {
    input: entry,
    output: {
      dir: outputDir,
      format: "es",
      ...outputPreserve,
    },
    plugins: [
      del({ targets: "dist" }),
      typescript(),
      babel({
        babelHelpers: "bundled",
        extensions: [".ts"],
      }),
      nodeResolve(),
      commonjs(),
      terser({ ecma: 2020 }),
    ],
    external: [/^@babel\/runtime/],
  },
  {
    input: entry,
    output: {
      dir: outputDir,
      format: "esm",
      ...outputPreserve,
    },
    plugins: [dts()],
  },
];

export default config;
