const R = require('ramda')


// --------------------------------------------------------
// Predicates
const P = {}

// isNotEmpty :: * -> Boolean
P.isNotEmpty = R.complement(R.isEmpty)

// isNotNil :: * -> Boolean
P.isNotNil = R.complement(R.isNil)

// isDate :: * -> Bool
/* eslint-disable no-self-compare */
P.isDate = R.both(R.is(Date), t => t.getTime() === t.getTime())
/* eslint-enable no-self-compare */

module.exports = P
