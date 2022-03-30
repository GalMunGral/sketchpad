import { assemble } from "../Assembler.js";
import { compile, FUNC, IF, LET } from "../Compiler.js";
import { run, S } from "../CPU.js";

const asm = compile([
  [LET, "x"],
  [FUNC, "main", [], [["fib", 10]]],
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
]);

const binary = assemble(asm);

run(binary);
