import { assemble } from "./Assembler.js";
import { compile, FUNC, IF, LET, SET } from "./Compiler.js";
import { run, S } from "./CPU.js";

const asm = compile([
  [LET, "CONSOLE", 0x7fffff],
  [
    FUNC,
    "main",
    [],
    [
      [LET, "n1", 2],
      [LET, "n2", 3],
      [LET, "n", 4],
      [LET, "a", ["factorial", 12]],
      [SET, "CONSOLE", "a"],
      [LET, "b", ["factorial", 11]],
      ["fib", [S["/"], "a", "b"]],
    ],
  ],
  [
    FUNC,
    "fib",
    ["n"],
    [
      [
        IF,
        [S["<"], "n", 2],
        [1],
        [[S["+"], ["fib", [S["-"], "n", 1]], ["fib", [S["-"], "n", 2]]]],
      ],
    ],
  ],
  [
    FUNC,
    "factorial",
    ["n"],
    [
      [
        IF,
        [S["<"], "n", 2],
        [1],
        [[S["*"], "n", ["factorial", [S["-"], "n", 1]]]],
      ],
    ],
  ],
]);

const binary = assemble(asm);

// const binary = assemble([
//   [S.jmp, "begin"],
//   ["0"],
//   [0],
//   ["1"],
//   [1],
//   ["2"],
//   [2],
//   ["3"],
//   [3],
//   ["n"],
//   [10],
//   ["m"],
//   [0],
//   ["begin"],
//   [S.lrs, "n"],
//   [S.srs, "m"],
//   ["loop"],
//   [S.lls, "m"],
//   [S.lrs, "0"],
//   [S.binopr, S["<="]],
//   [S.brr, -1],
//   [S.lls, "m"],
//   [S.sld, 4],
//   [S.call, "fibonacci"],
//   [S.lls, "m"],
//   [S.lrs, "1"],
//   [S.binopl, S["-"]],
//   [S.sls, "m"],
//   [S.jmp, "loop"],
//   [1],
//   ["fibonacci"],
//   [S.lld, 1],
//   [S.lrs, "2"],
//   [S.binopr, S["<"]],
//   [S.brr, "fib-base"],
//   [S.lrs, "1"],
//   [S.binopr, S["-"]],
//   [S.srd, 5],
//   [S.call, "fibonacci"],
//   [S.lld, 2],
//   [S.sld, -2],
//   [S.lld, 1],
//   [S.lrs, "2"],
//   [S.binopr, S["-"]],
//   [S.srd, 5],
//   [S.call, "fibonacci"],
//   [S.lld, -2],
//   [S.lrd, 2],
//   [S.binopl, S["+"]],
//   [S.sld, -2],
//   [S.ret],
//   ["fib-base"],
//   [S.lls, "1"],
//   [S.sld, -2],
//   [S.ret],
// ]);

run(binary);
