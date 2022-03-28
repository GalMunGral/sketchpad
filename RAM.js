const memory = Array(10000);
window.memory = memory;

export function read_word(addr) {
  return memory[addr] || 0;
}

export function write_word(addr, data) {
  // console.log(`write ${data} -> ${addr}`);
  memory[addr] = data;
}
