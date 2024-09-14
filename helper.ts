import { Context, isContext, makeContext, MonoType, PolyType, TypeVariable } from "./models";

// substitutions

export type Substitution = {
  type: 'substitution',
  (m: MonoType): MonoType;
  (t: PolyType): PolyType;
  (c: Context): Context;
  (s: Substitution): Substitution;
  raw: { [typeVariables: string]: MonoType }
}

export const makeSubstitution = (raw: Substitution["raw"]): Substitution => {
  const fn = ((arg: MonoType | PolyType | Context | Substitution) => {
    if (arg.type === "substitution") return combine(fn, arg)
    return apply(fn, arg);
  }) as Substitution
  fn.type = 'substitution';
  fn.raw = raw;
  return fn;
}

function apply<T extends MonoType | PolyType | Context>(substitution: Substitution, value: T): T;
function apply(s: Substitution, value: MonoType | PolyType | Context): MonoType | PolyType | Context {
  if (isContext(value)) {
    return makeContext(Object.fromEntries(
      Object.entries(value)
      .map(([k, v]) => [k, apply(s, v)])
    ))
  }

  if (value.type === "ty-var") {
    if (s.raw[value.a]) return s.raw[value.a];
    return value;
  }

  if (value.type === "ty-app") {
    return { ...value, mus: value.mus.map((m) => apply(s, m)) };
  }

  if (value.type === "ty-quantifier") {
    // If the quantifier variable conflicts with any substitution...
    if (s.raw[value.a] || Object.values(s.raw).some(t => freeVars(t).includes(value.a))) {
      // Rename the quantifier variable
      const aPrime = newTypeVar();
      const renamedSigma = apply(makeSubstitution({ [value.a]: aPrime }), value.sigma);
      
      // Apply the original substitution to the renamed sigma
      return {
        ...value,
        a: aPrime.a,
        sigma: apply(s, renamedSigma)
      };
    }

    return { ...value, sigma: apply(s, value.sigma) };
  }

  throw new Error('Unknown argument passed to substitution')
}

const combine = (s1: Substitution, s2: Substitution): Substitution => {
  return makeSubstitution({
    ...s1.raw,
    ...Object.fromEntries(Object.entries(s2.raw).map(([k, v]) => [k, s1(v)]))
  })
}

// new type variable
let currentTypeVar = 0;
export const newTypeVar = (): TypeVariable => ({
  type: 'ty-var',
  a: `t${currentTypeVar++}`
})

// instantiate
// mappings = { a |-> t0, b |-> t1 }
// Va. Vb. a -> b
// t0 -> t1
export const instantiate = (
  type: PolyType,
  mappings: Map<string, TypeVariable> = new Map()
): MonoType => {
  if (type.type === "ty-var") {
    return mappings.get(type.a) ?? type;
  }

  if (type.type === "ty-app") {
    return { ...type, mus: type.mus.map((m) => instantiate(m, mappings)) };
  }

  if (type.type === "ty-quantifier") {
    mappings.set(type.a, newTypeVar());
    return instantiate(type.sigma, mappings);
  }

  throw new Error('Unknown type passed to instantiate')
}

// generalise
export const generalise = (ctx: Context, type: MonoType): PolyType => {
  const quantifiers = diff(freeVars(type), freeVars(ctx));
  let t: PolyType = type;
  quantifiers.forEach(q => {
    t = { type: 'ty-quantifier', a: q, sigma: t }
  })
  return t;
}

const diff = <T>(a: T[], b: T[]): T[] => {
  const bset = new Set(b);
  return a.filter(v => !bset.has(v))
}

const freeVars = (value: PolyType | Context): string[] => {
  if (isContext(value)) {
    return Object.values(value).flatMap(freeVars)
  }

  if (value.type === "ty-var") {
    return [value.a];
  }

  if (value.type === "ty-app") {
    return value.mus.flatMap(freeVars)
  }

  if (value.type === "ty-quantifier") {
    return freeVars(value.sigma).filter(v => v !== value.a)
  }

  throw new Error('Unknown argument passed to substitution')
}

// unify

export const unify = (type1: MonoType, type2: MonoType): Substitution => {
  if (type1.type === "ty-var" && type2.type === "ty-var" && type1.a === type2.a) {
    return makeSubstitution({})
  }

  if (type1.type === "ty-var") {
    if (contains(type2, type1)) throw new Error('Infinite type detected')

    return makeSubstitution({
      [type1.a]: type2
    })
  }

  if (type2.type === "ty-var") {
    return unify(type2, type1)
  }

  if (type1.C !== type2.C) {
    throw new Error(`Could not unify types (different type functions): ${type1.C} and ${type2.C}`)
  }

  if (type1.mus.length !== type2.mus.length) {
    throw new Error(`Could not unify types (different argument lengths): ${type1} and ${type2}`)
  }

  let s: Substitution = makeSubstitution({})
  for (let i = 0; i < type1.mus.length; i++) {
    s = (unify(s(type1.mus[i]), s(type2.mus[i])))(s)
  }
  return s;
}

const contains = (value: MonoType, type2: TypeVariable): boolean => {
  if (value.type === "ty-var") {
    return value.a === type2.a;
  }

  if (value.type === "ty-app") {
    return value.mus.some((t) => contains(t, type2))
  }

  throw new Error('Unknown argument passed to substitution')
}