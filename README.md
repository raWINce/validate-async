Asynchronous Javascript validations made easy. Validation specification may be as deeply nested and Validators may return Promise or Futures.

``` js
const validator = V.spec({
    protocol: V.oneOf(['http', 'https']),
    method: V.oneOf(['post', 'get', 'put', 'delete']),
    successCodes: V.nonEmptyArray(),
    nested: {
        a: [_ => Promise.resolve(false), 'not valid prop'],
        b: (p, obj) => b !=== obj.nested.a
            ? Promise.reject('has to equal obj.nested.a')
            : Promise.resolve('anything'),
        c: _ => Future.after(400, true),
    },
    timeoutSeconds: V.and(
        V.number(),
        V.minMax({ min: 1, max: config.maxNumChecks }),
    ),
    user: V.and(
        V.nonEmptyString(),
        V.unique(User, 'id', 'User not found'),
    ),
    state: V.or(
        V.empty(),
        V.oneOf(['up', 'down'], 'Invalid state'),
    ),
})

// use with promise
const someObj = { ... }
try {
    await validator(someObj).promise()
} catch (err) {
    console.log(err)
}

// use with futures
Controller.post = ctx => validate.create(parseRequest(ctx))
    .chainRej(errors => ctx.send({ status: 400, payload: { errors } }))
    .chain(someModel => SomeModel.create(someModel.id, someModel))
    .chain(someModel => res.send({ someModel }))
    ...
```
