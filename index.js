import { assemble } from "./Assembler.js";
import { op, run, B } from "./CPU.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const rowSize = 800;
const colSize = 600;
const frameBufferSize = rowSize * colSize * 3;

// LOAD_DYNAMIC: 0x05,
// STORE_DYNAMIC: 0x07,

const binary = assemble([
  [op.jmp, "begin"],
  ["0"],
  [0],
  ["1"],
  [1],
  ["2"],
  [2],
  ["3"],
  [3],
  ["n"],
  [10],
  ["m"],
  [0],
  ["begin"],
  [op.lrs, "n"],
  [op.srs, "m"],
  ["loop"],
  [op.lls, "m"],
  [op.lrs, "0"],
  [op.binopr, B["<="]],
  [op.brr, -1],
  [op.lls, "m"],
  [op.sld, 4],
  [op.call, "fibonacci"],
  [op.lls, "m"],
  [op.lrs, "1"],
  [op.binopl, B["-"]],
  [op.sls, "m"],
  [op.jmp, "loop"],
  [1],
  ["fibonacci"],
  [op.lld, 1],
  [op.lrs, "2"],
  [op.binopr, B["<"]],
  [op.brr, "fib-base"],
  [op.lrs, "1"],
  [op.binopr, B["-"]],
  [op.srd, 5],
  [op.call, "fibonacci"],
  [op.lld, 2],
  [op.sld, -2],
  [op.lld, 1],
  [op.lrs, "2"],
  [op.binopr, B["-"]],
  [op.srd, 5],
  [op.call, "fibonacci"],
  [op.lld, -2],
  [op.lrd, 2],
  [op.binopl, B["+"]],
  [op.sld, -2],
  [op.ret],
  ["fib-base"],
  [op.lls, "1"],
  [op.sld, -2],
  [op.ret],
]);

run(binary);

// function setByte(index, v) {
//   memory[index] = v;
//   if (index < frameBufferSize) {
//     const row = Math.floor(index / (3 * rowSize));
//     const col = Math.floor((index % (3 * rowSize)) / 3);
//     const base = (row * rowSize + col) * 3;
//     const r = memory[base];
//     const g = memory[base + 1];
//     const b = memory[base + 2];
//     ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
//     ctx.fillRect(col, row, 1, 1);
//   }
// }
