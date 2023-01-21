import { generalise, instantiate, makeSubstitution, newTypeVar, Substitution, unify } from "./helper";
import { Context, Expression, makeContext, MonoType } from "./models";

export const W = (typEnv: Context, expr: Expression): [Substitution, MonoType] => {
  if (expr.type === "var") {
    const value = typEnv[expr.x];
    if (value === undefined) throw new Error(`Undefined variable: ${expr.x}`);
    return [makeSubstitution({}), instantiate(value)]
  }

  if (expr.type === "abs") {
    const beta = newTypeVar();
    const [s1, t1] = W(makeContext({
      ...typEnv,
      [expr.x]: beta,
    }), expr.e)
    return [s1, s1({
      type: 'ty-app',
      C: '->',
      mus: [beta, t1]
    })]
  }

  if (expr.type === "app") {
    const [s1, t1] = W(typEnv, expr.e1)
    const [s2, t2] = W(s1(typEnv), expr.e2)
    const beta = newTypeVar()

    const s3 = unify(s2(t1), {
      type: 'ty-app',
      C: '->',
      mus: [t2, beta]
    })
    return [s3(s2(s1)), s3(beta)]
  }

  if (expr.type === "let") {
    const [s1, t1] = W(typEnv, expr.e1)
    const [s2, t2] = W(makeContext({
      ...s1(typEnv),
      [expr.x]: generalise(typEnv, t1),
    }), expr.e2)
    return [s2(s1), t2]
  }

  throw new Error('Unknown expression type')
}
