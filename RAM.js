const memory = (window.memory = Array(10000));
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 1280, 800);

const ROW_SIZE = canvas.width;
const COL_SIZE = canvas.height;
const frame_buffer_size = ROW_SIZE * COL_SIZE;

let has_event = 0;
let mouse_down = 0;
let event_x = 0;
let event_y = 0;

canvas.onmousemove = (e) => {
  has_event = 1;
  const { left, top, height, width } = canvas.getBoundingClientRect();
  event_x = Math.round(ROW_SIZE * ((e.clientX - left) / width));
  event_y = Math.round(COL_SIZE * ((e.clientY - top) / height));
};

canvas.onmousedown = (e) => {
  has_event = 1;
  mouse_down = 1;
};

canvas.onmouseup = (e) => {
  has_event = 1;
  mouse_down = 0;
};

export function read(addr) {
  switch (addr) {
    case 0x7ffff0: {
      const res = has_event;
      has_event = 0;
      return res;
    }
    case 0x7ffff1:
      return mouse_down;
    case 0x7ffff2:
      return event_x;
    case 0x7ffff3:
      return event_y;
    case 0x7fffff:
      return 0 | prompt();
    default:
      return memory[addr] || 0;
  }
}

export function write(addr, data) {
  switch (addr) {
    case 0x7ffffe:
      console.log("[output]", data);
      break;
    case 0x7fffff:
      alert(data);
      break;
    default:
      memory[addr] = 0 | data;
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
