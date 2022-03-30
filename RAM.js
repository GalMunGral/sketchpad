const memory = (window.memory = Array(10000));
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const row_size = 800;
const col_size = 600;
const frame_buffer_size = row_size * col_size * 3;

export function read_word(addr) {
  return memory[addr] || 0;
}

export function write_word(addr, data) {
  switch (addr) {
    case 0x7fffff:
      console.log(data);
    default:
      memory[addr] = data;
      if (addr < frame_buffer_size) {
        const row = Math.floor(addr / (3 * row_size));
        const col = Math.floor((addr % (3 * row_size)) / 3);
        const base = (row * row_size + col) * 3;
        const r = memory[base];
        const g = memory[base + 1];
        const b = memory[base + 2];
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(col, row, 1, 1);
      }
  }
}
