const memory = Array(10000);
window.memory = memory;

memory[0x10101010 | 0] = 0xcafebabe | 0;
memory[0xcafebabe | 0] = 0xbabecafe | 0;

export function read_word(addr) {
  return memory[addr] || 0;
}

export function write_word(addr, data) {
  memory[addr] = data;
}
