import { assemble } from "../Assembler.js";
import { compile, FUNC, IF, LET } from "../Compiler.js";
import { run, S } from "../CPU.js";

const asm = compile([
  [LET, "x"],
  [FUNC, "main", [], [["factorial", 10]]],
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

run(binary);
