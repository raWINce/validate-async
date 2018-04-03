const Future = require('fluture')
const R = require('ramda')

const V = require('../src')
const P = require('../src/Predicates')


// propIsNumber :: String -> Obj -> Boolean
const propIsNumber = R.propSatisfies(R.is(Number))

// propIsNonEmptyArray :: String -> Obj -> Boolean
const propIsNonEmptyArray = R.propSatisfies(R.both(R.is(Array), P.isNotEmpty))

// delayP :: Number -> Function f -> * -> Promise(f(*))
const delayP = R.curry((timeInMs, f) => (...args) =>
    new Promise((resolve, reject) => setTimeout(_ => resolve(f(...args)), timeInMs)))

// delayP :: Number -> Function f -> * -> Future(f(*))
const delayF = R.curry((timeInMs, f) => (...args) =>
    Future.after(timeInMs, f).map(R.apply(R.__, args)))

describe('func `V.parallel`', () => {
    it('accept valid data', () => {
        const validator = V.parallel(
            [propIsNonEmptyArray('a'), 'empty a'],
            [propIsNonEmptyArray('b'), 'empty b'],
            [propIsNumber('c'), 'no number c'],
        )
        const obj = { a: ['bla'], b: ['hello'], c: 9 }

        return expect(validator(obj).promise()).resolves.toEqual(obj)
    })

    it('return without eror with mixed validator', () => {
        const promiseValidator = V.by(
            delayP(50, propIsNonEmptyArray('a')),
            'empty a'
        )
        const futureValidator = V.by(
            delayF(50, propIsNonEmptyArray('b')),
            'empty b'
        )

        const validator = V.parallel(
            promiseValidator,
            futureValidator,
            [delayP(50, propIsNumber('c')), 'no number c'],
        )
        const obj = { a: ['bla'], b: ['hello'], c: 9 }

        return expect(validator(obj).promise()).resolves.toEqual(obj)
    })

    it('reject invalid object', () => {
        const validator = V.parallel(
            [propIsNonEmptyArray('a'), 'empty a'],
            [propIsNonEmptyArray('b'), 'empty b'],
            [propIsNumber('c'), 'no number c'],
        )
        const invalidObj ={ a: ['hi'], b: ['jo'], c: 'not a number' }

        return expect(validator(invalidObj).promise()).rejects.toEqual([
            'no number c',
        ])
    })

    it('run in parallel', (done) => {
        const pred1 = jest.fn().mockReturnValue(true)
        const pred2 = jest.fn().mockReturnValue(true)
        const val1 = x => Future.after(50, pred1).map(f => f(x))
        const val2 = x => Future.after(50, pred2).map(f => f(x))

        setTimeout(() => {
            expect(pred1).not.toHaveBeenCalled()
            expect(pred2).not.toHaveBeenCalled()
        }, 45)

        setTimeout(() => {
            expect(pred1).toHaveBeenCalledWith({})
            expect(pred2).toHaveBeenCalledWith({})
            done()
        }, 60)

        V.parallel([val1, 'ignore'], [val2, 'ignore'])({})
            .fork(_ => _, _ => _)
    })

    it('reject invalid object with mixed validators', () => {
        const promiseValidator = V.by(delayP(50, propIsNonEmptyArray('a')), 'empty a')
        const futureValidator = V.by(
            o => delayF(50, propIsNonEmptyArray('b')),
            'empty b'
        )

        const validator = V.parallel(
            promiseValidator,
            [delayP(50, propIsNumber('c')), 'no number c'],
            futureValidator,
        )
        const invalidObj = { a: ['a'] }

        return expect(validator(invalidObj).promise()).rejects.toEqual([
            'no number c',
            'empty b',
        ])
    })


    it('output array of errors in correct order', () => {
        const validator = V.parallel(
            [propIsNonEmptyArray('b'), 'empty b'],
            [delayP(50, propIsNumber('c')), 'no number c'],
            [propIsNonEmptyArray('a'), 'empty a'],
        )

        return expect(validator({}).promise()).rejects.toEqual([
            'empty b', 'no number c', 'empty a',
        ])
    })
})
