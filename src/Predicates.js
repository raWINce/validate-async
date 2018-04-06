const R = require('ramda')


// --------------------------------------------------------
// Predicates
const P = {}

// isNotEmpty :: * -> Boolean
P.isNotEmpty = R.complement(R.isEmpty)

// isNotNil :: * -> Boolean
P.isNotNil = R.complement(R.isNil)

// propIsNumber :: String -> Obj -> Boolean
P.propIsNumber = R.propSatisfies(R.is(Number))

// propIsNonEmptyArray :: String -> Obj -> Boolean
P.propIsNonEmptyArray = R.propSatisfies(R.both(R.is(Array), P.isNotEmpty))

// isDate :: * -> Bool
/* eslint-disable no-self-compare */
P.isDate = R.both(R.is(Date), t => t.getTime() === t.getTime())
/* eslint-enable no-self-compare */

module.exports = P
