const R = require('ramda')
const V = require('./validate')
const P = require('./Predicates')


// --------------------------------------------------------
// Validator
// empty :: String -> [(* -> Bool), String]
V.empty = (msg = 'The value has to be empty') => V.by(
    R.either(R.isNil, R.isEmpty), msg,
)

// nonEmptyString :: String -> [(* -> Bool), String]
V.nonEmptyString = (msg = 'The value has to be a non empty string') =>
    [R.both(P.isNotEmpty, R.is(String)), msg]

// nonNil :: String -> [(* -> Bool), String]
V.notNil = (msg = 'Please provide a value') =>
    [R.complement(R.isNil), msg]

// number :: String -> [(* -> Bool), String]
V.number = (msg = 'Please provide a number') => [
    R.both(R.is(Number), x => !Number.isNaN(x)), msg,
]

// number :: Obj -> String -> [(* -> Bool), String]
V.minMax = ({ min, max }, msg) => [
    x => (R.isNil(min) ? true : x >= min) && (R.isNil(max) ? true : x <= max),
    msg || `Prescribed Range: [${min || '-Infty'}, ${max || 'Infty'}]`,
]

// number :: String -> [(* -> Bool), String]
V.bool = (msg = 'Please provide a boolean') => [R.is(Boolean), msg]

// oneOf :: ([a], String) -> [(* -> Bool), String]
V.oneOf = (options, msg = null) => V.by(
    R.contains(R.__, options),
    msg || `Value has to be one of "${R.join('", "', options)}".`,
)

// minLen :: (Number, String) -> Validator
V.minLen = (min, msg = null) => [
    u => R.length(u) >= min,
    msg || `Please provide at least ${min} characters`,
]

// minLen :: (Number, String) -> Validator
V.length = (len, msg = null) => [
    u => R.length(u) === len,
    msg || `Please provide exactly ${len} characters`,
]

// nonEmptyArray :: String -> Validator
V.nonEmptyArray = (msg = 'Has to be a non empty array') =>
    [R.both(P.isNotEmpty, R.is(Array)), msg]

// date :: String -> Validator
V.date = (msg = 'Please provide a date') => [P.isDate, msg]

// or :: (Validator, Validator, String) -> Validator
V.or = (V1, V2, msg) => (...args) => V.applyTo(...args)(V1)
    .chainRej(_ => V.applyTo(...args)(V2))
    .map(R.always(R.head(args)))
    .mapRej(R.always(msg))

module.exports = V
