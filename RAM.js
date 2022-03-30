const memory = (window.memory = Array(10000));
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const ROW_SIZE = 800;
const COL_SIZE = 600;
const frame_buffer_size = ROW_SIZE * COL_SIZE;

export function read(addr) {
  switch (addr) {
    case 0x7fffff:
      return 0 | prompt();
    default:
      return memory[addr] || 0;
  }
}

export function write(addr, data) {
  switch (addr) {
    case 0x7fffff:
      alert(data);
      break;
    default:
      memory[addr] = data;
      if (addr < frame_buffer_size) {
        const row = Math.floor(addr / ROW_SIZE);
        const col = addr % ROW_SIZE;
        const r = (data >> 16) & 0xff;
        const g = (data >> 8) & 0xff;
        const b = data & 0xff;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(col, row, 1, 1);
      }
  }
}
