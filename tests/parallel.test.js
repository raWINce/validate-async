const Future = require('fluture')

const V = require('../src')
const P = require('../src/Predicates')
const { delayP, delayF } = require('./helpers')


describe('func `V.parallel`', () => {
    it('accept valid data', () => {
        const validator = V.parallel(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [P.propIsNumber('c'), 'no number c'],
        )
        const obj = { a: ['bla'], b: ['hello'], c: 9 }

        return expect(validator(obj).promise()).resolves.toEqual(obj)
    })

    it('return without eror with mixed validator', () => {
        const promiseValidator = V.by(
            delayP(50, P.propIsNonEmptyArray('a')),
            'empty a'
        )
        const futureValidator = V.by(
            delayF(50, P.propIsNonEmptyArray('b')),
            'empty b'
        )

        const validator = V.parallel(
            promiseValidator,
            futureValidator,
            [delayP(50, P.propIsNumber('c')), 'no number c'],
        )
        const obj = { a: ['bla'], b: ['hello'], c: 9 }

        return expect(validator(obj).promise()).resolves.toEqual(obj)
    })

    it('reject invalid object', () => {
        const validator = V.parallel(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [P.propIsNumber('c'), 'no number c'],
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
        const promiseValidator = V.by(delayP(50, P.propIsNonEmptyArray('a')), 'empty a')
        const futureValidator = V.by(
            o => delayF(50, P.propIsNonEmptyArray('b')),
            'empty b'
        )

        const validator = V.parallel(
            promiseValidator,
            [delayP(50, P.propIsNumber('c')), 'no number c'],
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
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [delayP(50, P.propIsNumber('c')), 'no number c'],
            [P.propIsNonEmptyArray('a'), 'empty a'],
        )

        return expect(validator({}).promise()).rejects.toEqual([
            'empty b', 'no number c', 'empty a',
        ])
    })
})
