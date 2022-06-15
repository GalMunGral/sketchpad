import {
  COL_SIZE,
  FRAME_BUFFER_SIZE,
  MOUSE,
  ROW_SIZE,
  writeToFrameBuffer,
} from "./IO.js";

const MEM = Array<number>(10000);

export function read(addr: number): number {
  switch (addr) {
    case 0x7fffee:
      return ROW_SIZE;
    case 0x7fffef:
      return COL_SIZE;
    case 0x7ffff0:
      return MOUSE.FLAG;
    case 0x7ffff1:
      return MOUSE.DOWN;
    case 0x7ffff2:
      return MOUSE.X;
    case 0x7ffff3:
      return MOUSE.Y;
    case 0x7fffff:
      return 0 | Number(prompt());
    default:
      return MEM[addr] || 0;
  }
}

export function write(addr: number, data: number): void {
  switch (addr) {
    case 0x7ffffe:
      console.log("[OUTPUT] ", data);
      break;
    case 0x7fffff:
      alert(data);
      break;
    default:
      if (addr < FRAME_BUFFER_SIZE) {
        writeToFrameBuffer(addr, data);
      } else {
        MEM[addr] = 0 | data;
      }
  }
}
