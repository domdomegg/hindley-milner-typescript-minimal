import { C, F, GenLex, SingleParser, Streams } from "@masala/parser";
import { AbstractionExpression, Expression, LetExpression, VariableExpression } from "./models";

// Lexer

const genlex = new GenLex();
const identifier = genlex.tokenize(C.charIn('abcdefghijklmnopqrstuvwxyz').rep().map(t => t.join()), 'identifier')
const backslash = genlex.tokenize(C.char('\\'), 'backslash')
const arrow = genlex.tokenize(C.string('->'), 'arrow')
const letTok = genlex.tokenize(C.string('let '), 'let')
const inTok = genlex.tokenize(C.string('in '), 'in')
const equals = genlex.tokenize(C.char('='), 'equals')
const lparen = genlex.tokenize(C.char('('), 'lparen')
const rparen = genlex.tokenize(C.char(')'), 'rparen')

// Parser

// e ::= x
//     | e1 e2
//     | \x -> e
//     | let x = e1 in e2

const expressionParser = (): SingleParser<Expression> => F.try(variableExpression())
  .or(F.try(abstractionExpression()))
  .or(F.try(letExpression()))
  .or(F.try(paren()))
  .rep()
  .array()
  .map(collectToFunctionApplication)

const variableExpression = (): SingleParser<VariableExpression> =>
  identifier
  .map(x => ({
    type: 'var',
    x,
  }))

const abstractionExpression = (): SingleParser<AbstractionExpression> =>
  backslash
  .then(identifier)
  .then(arrow)
  .then(F.lazy(expressionParser))
  .map(tuple => ({
    type: 'abs',
    x: tuple.at(1) as string,
    e: tuple.at(3) as Expression,
  }))

const letExpression = (): SingleParser<LetExpression> =>
  letTok
  .then(identifier)
  .then(equals)
  .then(F.lazy(expressionParser))
  .then(inTok)
  .then(F.lazy(expressionParser))
  .map(tuple => ({
    type: 'let',
    x: tuple.at(1) as string,
    e1: tuple.at(3) as Expression,
    e2: tuple.at(5) as Expression,
  }))

const paren = (): SingleParser<Expression> =>
  lparen.drop()
  .then(F.lazy(expressionParser))
  .then(rparen.drop())
  .single()

const collectToFunctionApplication = (es: Expression[]): Expression => {
  if (es.length === 1) return es[0];
  if (es.length === 2) return {
    type: 'app',
    e1: es[0],
    e2: es[1],
  }
  
  // (e0 e1) e2
  // ((e0 e1) e2) e3
  return {
    type: 'app',
    e1: collectToFunctionApplication(es.slice(0, -1)),
    e2: es[es.length - 1],
  }
}

const parser: SingleParser<Expression> = genlex.use(expressionParser().then(F.eos().drop()).single())

export const parse = (code: string): Expression => {
  const res = parser.parse(Streams.ofString(code))
  if (res.isAccepted()) {
    return res.value;
  }
  throw new Error('Failed to parse')
}