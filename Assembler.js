import { B, O, S, U } from "./CPU.js";

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
        case S.brl:
        case S.brr:
        case S.jmp:
        case S.call:
        case S.lls:
        case S.lrs:
        case S.llsi:
        case S.lrsi:
        case S.sls:
        case S.srs:
        case S.slsi:
        case S.srsi: {
          const real_arg = typeof arg == "string" ? tags[arg] : arg;
          res.push((O[head] << 24) | (real_arg & ((1 << 24) - 1)));
          break;
        }
        case S.lld:
        case S.lrd:
        case S.lldi:
        case S.lrdi:
        case S.sld:
        case S.srd:
        case S.sldi:
        case S.srdi:
          res.push((O[head] << 24) | (arg & ((1 << 24) - 1)));
          break;
        case S.unopl:
        case S.unopr:
          res.push((O[head] << 24) | (U[arg] << 16));
          break;
        case S.binopl:
        case S.binopr:
          res.push((O[head] << 24) | (B[arg] << 16));
          break;
        case S.nop:
        case S.swp:
        case S.ret:
          res.push(O[head] << 24);
          break;
        default:
          throw "[assembler] unsupported instruction";
      }
    }
  }
  return res;
}
