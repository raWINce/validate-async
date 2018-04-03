const Future = require('fluture')
const R = require('ramda')


// toFuture :: Future Err a | Promise a Err | a -> Future Err a
const toFuture = R.cond([
    [R.is(Future), R.identity],
    [R.is(Promise), x => Future.tryP(_ => x)],
    [R.T, Future.of],
])

// traverseOject :: Number -> (a -> Future Err b) -> { k: a } -> Future Err { k: b }
const traverseObjParallel = R.curry((limit, f, obj) => Future.parallel(
    limit,
    R.compose(
        R.map(([key, value]) => toFuture(f(value)).map(res => [key, res])),
        R.toPairs(),
    )(obj)
)
    .map(R.fromPairs)
)

module.exports = { toFuture, traverseObjParallel }
