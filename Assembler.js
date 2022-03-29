import { op } from "./CPU.js";

export function assemble(text) {
  const tags = {};
  const res = [];

  let offset = 0;
  for (const [head] of text) {
    if (typeof head == "string") {
      tags[head] = offset;
    } else {
      ++offset;
    }
  }

  for (const [head, arg] of text) {
    if (typeof head == "string") continue;
    if (typeof head == "number") {
      res.push(head);
    } else {
      switch (head) {
        case op.brl:
        case op.brr:
        case op.jmp:
        case op.call:
        case op.lls:
        case op.lrs:
        case op.llsi:
        case op.lrsi:
        case op.sls:
        case op.srs:
        case op.slsi:
        case op.srsi: {
          const real_arg = typeof arg == "string" ? tags[arg] : arg;
          res.push((head << 24) | (real_arg & ((1 << 24) - 1)));
          break;
        }
        case op.lld:
        case op.lrd:
        case op.lldi:
        case op.lrdi:
        case op.sld:
        case op.srd:
        case op.sldi:
        case op.srdi:
          res.push((head << 24) | (arg & ((1 << 24) - 1)));
          break;
        case op.unopl:
        case op.unopr:
        case op.binopl:
        case op.binopr:
          res.push((head << 24) | (arg << 16));
          break;
        case op.nop:
        case op.swp:
        case op.ret:
          res.push(head << 24);
          break;
        default:
          throw "[assembler] unsupported instruction";
      }
    }
  }
  return res;
}
