const Future = require('fluture')
const { EOL } = require('os')
const R = require('ramda')
const { isFunction } = require('ramda-adjunct')

const { toFuture, traverseObjParallel } = require('./Future')


// --------------------------------------------------------
// asynchronus validation
const V = {}

/**
 * Given a predicate and an error message. Convert them into a validator that
 * returns a Future.
 *
 * @sig ((a1, ..., an) -> Bool) -> Str -> (a1, ..., an) -> Future String a1
 */
V.by = R.curry((pred, msg) => (...obj) =>
    toFuture(pred(...obj)).chain(res => res === true ? Future.of(R.head(obj)) : Future.reject(msg)))

/**
 * Applies the validator to the input object and converts it into a task.
 *
 * A validator can be
 *    - A Future or Promise returning an errorMessage or the initial Object
 *    - An array of size two holding a predicate and the error message
 *        - predicate may be promise, function or Future returning a Boolean
 *
 * @typedef Predicate a: a -> Promise Bool | a -> Future Bool | a -> Bool
 * @typedef Validator a = Obj -> Future Error a | a -> Promise a Error | [Predicate a, String]
 * @sig Validator V => (a1, ..., an) -> V (a1, ..., an) -> Future Error a1
 * @see V.by
 */
V.applyTo = (...obj) => val => R.compose(
    toFuture,
    v => v(...obj),
    R.when(R.is(Array), ([ pred, msg ]) => V.by(pred, msg))
)(val)

/**
 * Compose an unlimited amount of validators. They are evaluated in their argument
 * order until one validator fails or all pass.
 *
 * Validator obtained by V.and can be nested and composed. You can compose
 * validators from V.and and V.parallel.
 *
 * The validator may be:
 *    - A function returning a task(Error, Obj)
 *    - A promise returning an errorMessage or the initial Object
 *    - An array of size two holding a predicate and the error message
 *        - predicate may be promise, function or Future returning a Boolean
 *
 * @typedef Validator a = a -> Future Error a | a -> Promise a Error | [Predicate, String]
 * @sig Validator V => (V a, ..., V a) -> V a
 * @see V.parallel, V.spec, V.specAnd, V.specParallel
 */
V.and = (...validators) => (...obj) => R.reduce(
    (acc, validator) => acc.chain(o => V.applyTo(...obj)(validator)),
    Future.of(R.head(obj)),
    validators,
)

/**
 * Apply all validations to the input object. If there are multiple errors, they
 * are collected in  an array in the Future rejection.
 *
 * Validator obtained by V.and can be nested and composed. You can compose
 * validators from V.and and V.parallel.
 *
 * The validator may be:
 *    - A function returning a task(Error, Obj)
 *    - A promise returning an errorMessage or the initial Object
 *    - An array of size two holding a predicate and the error message
 *        - predicate may be promise, function or Future returning a Boolean
 *
 * @typedef Validator a = a -> Future Error a | a -> Promise a Error | [Predicate, String]
 * @sig Validator V => (V a, ..., V a) -> V a
 * @see validateFirstVail, V.spec, V.specAnd, V.specParallel
 */
V.parallel = (...validators) => (...obj) => Future.parallel(
    8,
    R.map(R.compose(
        t => t.map(_ => null).chainRej(Future.of),
        V.applyTo(...obj),
    ), validators),
)
    .chain(R.compose(
        R.ifElse(R.isEmpty, () => Future.of(R.head(obj)), Future.reject),
        R.reject(R.isNil),
    ))

// collectFutureError :: { k: { ok: * } | { err: [String] } } -> a -> Future { k: [String] } a
const collectFutureErrors = obj => R.ifElse(
    R.compose(R.all(R.has('ok')), R.values),
    R.always(Future.of(obj)),
    R.compose(
        Future.reject,
        R.reject(R.isEmpty),
        R.map(R.compose(
            R.when(R.is(String), R.of),
            R.propOr([], 'err'),
        )),
    ),
)

/**
 * Validate the spec for each property (or nested property) and reject with
 * obj containing array of error messages or accept an return the original object.
 *
 * @param { k: { l: Validator obj }} validationObj  The spec containing the validation
 *     rules. Each property contains a Validator and will be called with the
 *     current prop and rootObj. Example: { a: { b: f } } -> f is called with
 *     f(obj.a.b, rootObj).
 * @param Object obj The object that has to be validated.
 * @param * rootObj  This parameter is passed to second parameter of the
 *                   validator functions for each entry in validationObj
 *
 * @typedef Predicate a: (a, *) -> Promise Bool | (a, *) -> Future Bool | (a, *) -> Bool
 * @typedef Validator a = (a, *) -> Future Error a | (a, *) -> Promise a Error | [Predicate (a, *), String]
 * @sig Validator V => { k: V } -> Obj -> Future { k: [String] } Obj
 * @see V.parallel, validateFirstVail, V.specAnd, V.specParallel
 * @example
 *
 * const validator = V.spec({
 *     a: V.parallel(V.number(), V.oneOf([1, 2])),
 *     b: V.and(
 *         V.number(),
 *         [(prop, obj) => Promise.resolve(prop === obj.a), 'a and b must be equal']
 *     ),
 *     c: {
 *         d: V.nonEmptyString()
 *     },
 * })
 * validator({ a: 1, b: 1, c: { d: 'foo' } })  // accepts and returns original object
 * validator({ a: 1, b: 1, c: { d: [] } })     // rejects with { c: { d: [String] } }
 * validator({ a: 1, b: 2, c: { d: [] } })     // rejects with { b: [Strig], c: { d: [String] } }
 * validator({ a: 3, b: 1, c: { d: 'foo' } })  // rejects with { a: [String], b: [String] }
 */
V.spec = (validationObj) => (obj, rootObj = obj) =>
    Future.of(R.mapObjIndexed((validator, key) => [validator, key], validationObj))
        .chain(traverseObjParallel(
            8,
            ([validator, key]) => R.ifElse(
                R.either(R.is(Array), isFunction),
                V.applyTo(R.propOr(null, key, obj), rootObj),
                v => V.spec(v)(R.propOr(null, key, obj), rootObj),
            )(validator)
                .map(ok => ({ ok }))
                .chainRej(err => Future.of({ err })) // prevent early exit
        ))
        .chain(collectFutureErrors(obj))

/**
 * Validate mulitple specs in parallel and merge the errors or return the
 * initial object.
 *
 * @typedef Predicate a: a -> Promise Bool | a -> Future Bool | a -> Bool
 * @typedef Validator a = Obj -> Future Error a | a -> Promise a Error | [Predicate a, String]
 * @sig Validator V => ({ k: V }, ..., { k: V }) -> Obj -> Future { k: [String] } Obj
 * @see V.parallel, validateFirstVail, V.specAnd, V.spec
 */
V.specParallel = (...validationObj) => obj => V.parallel(...R.map(
    R.ifElse(isFunction, R.identity, V.spec),
    validationObj,
))(obj)
    .chainRej(R.compose(
        Future.reject,
        R.reduce(R.mergeDeepWith(R.concat), {}),
    ))

/**
 * Sequentially validate multiple specs. As soon as a spec fails, the errors
 * are returned and the other specs are left untouched.
 *
 * @typedef Predicate a: a -> Promise Bool | a -> Future Bool | a -> Bool
 * @typedef Validator a = Obj -> Future Error a | a -> Promise a Error | [Predicate a, String]
 * @sig Validator V => ({ k: V }, ..., { k: V }) -> Obj -> Future { k: [String] } Obj
 * @see V.parallel, validateFirstVail, V.spec, V.specParallel
 * @example
 *
 * const validator = V.specAnd(
 *     {
 *         a: V.number(),
 *         b: V.number(),
 *     },
 *     {
 *         a: [(propA, obj) => Future.of(propA === obj.b + 2), 'exceed b by 2'],
 *     },
 * )
 * validator({ a: 5, b: 3 })        // accepts and returns original object
 * validator({ a: 3, b: 3 })        // rejects with { a: [String] }
 * validator({ a: 3, b: ['foo'] })  // rejects with  { b: [String] }
 **/
V.specAnd = (...validationObj) => obj =>
    V.and(...R.map(
        R.ifElse(isFunction, R.identity, V.spec),
        validationObj,
    ))(obj)

/**
 * Format Error Obj returned by V.spec, V.specParallel or
 * valdiateEvolveFirstFail and return an error string.
 *
 * @TODO Does not work on nested objects!
 * @sig String -> { k: [String] } -> String
 * @see V.spec, V.specParallel, V.specAnd
 * @example
 *
 * const validate = V.spec({ ... })
 * const someObj = { ... }
 * validate(someObj).chainRej(formatErrors('Some meaningfull message'))
 */
V.formatErrors = R.curry((msg, errObj) => R.compose(
    Future.reject,
    R.concat(R.length(msg) > 0 ? `${msg}${EOL}` : ''),
    R.join(EOL),
    R.map(([key, msg]) =>
        R.reduce((acc, m) => `${acc}${EOL}        ${m}`, `    ${key}:`, msg)
    ),
    R.toPairs(),
)(errObj))

module.exports = V
