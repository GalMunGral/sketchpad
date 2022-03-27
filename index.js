import { assemble } from "./Assembler.js";
import { alu, op, run } from "./CPU.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const rowSize = 800;
const colSize = 600;
const frameBufferSize = rowSize * colSize * 3;

// LOAD_DYNAMIC: 0x05,
// STORE_DYNAMIC: 0x07,

const binary = assemble([
  [op.load_static, 100],
  [op.shift],
  "loop",
  [op.load_static, "a"],
  [op.reduce, alu[">="]],
  [op.branch, "exit"],
  [op.load_static, 100],
  [op.shift],
  [op.load_static, "b"],
  [op.reduce, alu["+"]],
  [op.store_static, 100],
  [op.jump, "loop"],
  "exit",
  [op.jump, -1],
  "a",
  10,
  "b",
  1,
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
