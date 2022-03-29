import { assemble } from "./Assembler.js";
import { compile } from "./Compiler.js";
import { op, run, B } from "./CPU.js";

const VAR = "VAR";
const FUNC = "FUNC";
const SET = "SET";
const IF = 'IF';

// TODO OPERATOR;
const binary = assemble(
  compile([
    [VAR, "x"],
    [FUNC, "main", [], [["fib", 10]]],
    [
      FUNC,
      "fib",
      ["n"],
      [IF ["+" [[B["+"], ["fib", [B["-"], "n", 1]], ["fib", [B["-"], "n", 2]]]],
    ],
  ])
);

// const binary = assemble([
//   [op.jmp, "begin"],
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
//   [op.lrs, "n"],
//   [op.srs, "m"],
//   ["loop"],
//   [op.lls, "m"],
//   [op.lrs, "0"],
//   [op.binopr, B["<="]],
//   [op.brr, -1],
//   [op.lls, "m"],
//   [op.sld, 4],
//   [op.call, "fibonacci"],
//   [op.lls, "m"],
//   [op.lrs, "1"],
//   [op.binopl, B["-"]],
//   [op.sls, "m"],
//   [op.jmp, "loop"],
//   [1],
//   ["fibonacci"],
//   [op.lld, 1],
//   [op.lrs, "2"],
//   [op.binopr, B["<"]],
//   [op.brr, "fib-base"],
//   [op.lrs, "1"],
//   [op.binopr, B["-"]],
//   [op.srd, 5],
//   [op.call, "fibonacci"],
//   [op.lld, 2],
//   [op.sld, -2],
//   [op.lld, 1],
//   [op.lrs, "2"],
//   [op.binopr, B["-"]],
//   [op.srd, 5],
//   [op.call, "fibonacci"],
//   [op.lld, -2],
//   [op.lrd, 2],
//   [op.binopl, B["+"]],
//   [op.sld, -2],
//   [op.ret],
//   ["fib-base"],
//   [op.lls, "1"],
//   [op.sld, -2],
//   [op.ret],
// ]);

run(binary);
