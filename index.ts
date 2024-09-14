import { newTypeVar, Substitution } from "./helper";
import { M } from "./m";
import { makeContext, MonoType } from "./models";
import { parse } from "./parser";
import { W } from "./w";

const type = newTypeVar();

console.dir(W(
  makeContext({
    'not': { type: 'ty-app', C: '->', mus: [
      { type: 'ty-app', C: 'Bool', mus: [] },
      { type: 'ty-app', C: 'Bool', mus: [] },
    ] },
    'odd': { type: 'ty-app', C: '->', mus: [
      { type: 'ty-app', C: 'Int', mus: [] },
      { type: 'ty-app', C: 'Bool', mus: [] },
    ] },
    'add': { type: 'ty-app', C: '->', mus: [
      { type: 'ty-app', C: 'Int', mus: [] },
      { type: 'ty-app', C: '->', mus: [
        { type: 'ty-app', C: 'Int', mus: [] },
        { type: 'ty-app', C: 'Int', mus: [] },
      ] },
    ] },
    'true': { type: 'ty-app', C: 'Bool', mus: [] },
    'false': { type: 'ty-app', C: 'Bool', mus: [] },
    'one': { type: 'ty-app', C: 'Int', mus: [] },
  }),
  parse('odd one'),
)[1], { depth: Infinity });
