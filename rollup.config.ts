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

const config: RollupOptions[] = [
  {
    input: entry,
    output: [
      {
        file: `${outputDir}/index.cjs.js`, // CommonJS 格式输出
        format: "cjs",
      },
      {
        file: `${outputDir}/index.esm.js`, // ES 模块格式输出
        format: "es",
      },
    ],
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
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    plugins: [dts()],
  },
];

export default config;
