import { assemble } from "./Assembler.js";
import { alu, op, run } from "./CPU.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const rowSize = 800;
const colSize = 600;
const frameBufferSize = rowSize * colSize * 3;

// LOAD: 0x02,
// STORE: 0x03,
// LOAD_DYNAMIC: 0x05,
// STORE_DYNAMIC: 0x07,
// BRANCH: 0x0b,

const binary = assemble([
  "begin",
  [op.load_static, "a"],
  [op.load],
  [op.load],
  "loop",
  [op.jump, "loop"],
  "a",
  0x10101010,
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
