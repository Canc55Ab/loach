import { RollupOptions, Plugin } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import del from "rollup-plugin-delete";
import dts from "rollup-plugin-dts";

const entry = "src/index.ts";
const outputDir = "dist";

/**
 * 给 rollup 生成的命名空间对象加 PURE 注解
 *
 * `export * as ns from "./mod"` 会被编译成 `Object.freeze({ ... })`，
 * 而 `Object.freeze` 没有 `@__PURE__` 注解，下游打包器（webpack/esbuild/rollup）
 * 无法判定它无副作用，只能把整个命名空间的成员全部保留 —— 哪怕调用方只用了其中 1 个导出。
 * 标注为纯函数后，未被引用的命名空间连同其成员可被整体摇掉。
 */
const markNamespacePure = (): Plugin => ({
  name: "mark-namespace-pure",
  renderChunk(code) {
    return {
      code: code.replace(/\bObject\.freeze\(/g, "/*@__PURE__*/Object.freeze("),
      map: null,
    };
  },
});

const config: RollupOptions[] = [
  {
    input: entry,
    output: [
      {
        // package.json 中 "type": "module"，.js 会被 Node 当作 ESM 加载，
        // 因此 CJS 入口必须使用 .cjs 扩展名，否则 require 拿到的是空对象
        file: `${outputDir}/index.cjs.cjs`,
        format: "cjs",
      },
      {
        file: `${outputDir}/index.cjs.js`,
        format: "cjs",
      },
      {
        file: `${outputDir}/index.esm.js`,
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
      // 放在 terser 之后：terser 会把命名空间压成 `Object.freeze({...})`，
      // 必须在压缩产物上补 PURE 注解，下游打包器才能摇掉未用到的命名空间
      markNamespacePure(),
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
