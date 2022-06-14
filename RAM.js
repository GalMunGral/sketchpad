const __DEBUG__ = Boolean(
  new URLSearchParams(location?.search)?.get("visualize")
);

const memory = (window.memory = Array(10000));
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const scale = __DEBUG__ ? 8 : 1;
const ROW_SIZE = canvas.width / scale;
const COL_SIZE = canvas.height / scale;
const FRAME_BUFFER_SIZE = ROW_SIZE * COL_SIZE;

ctx.fillStyle = "black";
ctx.fillRect(0, 0, ROW_SIZE * scale, COL_SIZE * scale);

let HAS_EVENT = 0;
let MOUSE_DOWN = 0;
let EVENT_X = 0;
let EVENT_Y = 0;

canvas.onmousemove = (e) => {
  HAS_EVENT = 1;
  const { left, top, height, width } = canvas.getBoundingClientRect();
  EVENT_X = Math.round(ROW_SIZE * ((e.clientX - left) / width));
  EVENT_Y = Math.round(COL_SIZE * ((e.clientY - top) / height));
};

canvas.onmousedown = (e) => {
  HAS_EVENT = 1;
  MOUSE_DOWN = 1;
};

canvas.onmouseup = (e) => {
  HAS_EVENT = 1;
  MOUSE_DOWN = 0;
};

export function read(addr) {
  switch (addr) {
    case 0x7fffee:
      return ROW_SIZE;
    case 0x7fffef:
      return COL_SIZE;
    case 0x7ffff0: {
      const res = HAS_EVENT;
      HAS_EVENT = 0;
      return res;
    }
    case 0x7ffff1:
      return MOUSE_DOWN;
    case 0x7ffff2:
      return EVENT_X;
    case 0x7ffff3:
      return EVENT_Y;
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
      if (addr < FRAME_BUFFER_SIZE) {
        const row = Math.floor(addr / ROW_SIZE);
        const col = addr % ROW_SIZE;
        const r = (data >> 16) & 0xff;
        const g = (data >> 8) & 0xff;
        const b = data & 0xff;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(col * scale, row * scale, scale, scale);
      }
  }
}
