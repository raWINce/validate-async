const Future = require('fluture')
const R = require('ramda')


// delayP :: Number -> Function f -> * -> Promise(f(*))
const delayP = R.curry((timeInMs, f) => (...args) =>
    new Promise((resolve, reject) => setTimeout(_ => resolve(f(...args)), timeInMs)))

// delayP :: Number -> Function f -> * -> Future(f(*))
const delayF = R.curry((timeInMs, f) => (...args) =>
    Future.after(timeInMs, f).map(R.apply(R.__, args)))


module.exports = { delayP, delayF }
