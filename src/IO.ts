const __DEBUG__ = !!new URLSearchParams(location?.search)?.get("visualize");
const __SCALE__ = __DEBUG__ ? 8 : 1;

// OUTPUT

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
export const ROW_SIZE = canvas.width / __SCALE__;
export const COL_SIZE = canvas.height / __SCALE__;
export const FRAME_BUFFER_SIZE = ROW_SIZE * COL_SIZE;

function fillRect(x: number, y: number, width: number, height: number) {
  ctx.fillRect(
    x * __SCALE__,
    y * __SCALE__,
    width * __SCALE__,
    height * __SCALE__
  );
}

ctx.fillStyle = "black";
fillRect(0, 0, ROW_SIZE, COL_SIZE);

export function writeToFrameBuffer(addr: number, data: number) {
  const y = Math.floor(addr / ROW_SIZE);
  const x = addr % ROW_SIZE;
  const r = (data >> 16) & 0xff;
  const g = (data >> 8) & 0xff;
  const b = data & 0xff;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  fillRect(x, y, 1, 1);
}

// INPUT

let FLAG = 0;
export const MOUSE = {
  get FLAG() {
    const res = FLAG;
    FLAG = 0;
    return res;
  },
  DOWN: 0,
  X: 0,
  Y: 0,
};

canvas.onmousemove = (e) => {
  const { left, top, height, width } = canvas.getBoundingClientRect();
  MOUSE.X = Math.round(ROW_SIZE * ((e.clientX - left) / width));
  MOUSE.Y = Math.round(COL_SIZE * ((e.clientY - top) / height));
  FLAG = 1;
};

canvas.onmousedown = () => {
  MOUSE.DOWN = 1;
  FLAG = 1;
};

canvas.onmouseup = () => {
  MOUSE.DOWN = 0;
  FLAG = 1;
};
