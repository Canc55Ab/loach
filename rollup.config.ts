import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { RollupOptions } from "rollup";

const config: RollupOptions = {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
    },
    {
      file: "dist/index.esm.js",
      format: "es",
    },
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    terser({ maxWorkers: 4 }),
  ],
  external: [],
};

export default config;
