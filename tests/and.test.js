const Future = require('fluture')

const P = require('../src/Predicates')
const V = require('../src')
const { delayP, delayF } = require('./helpers')


describe('function `V.and`', async () => {
    it('not call function after failing once', async () => {
        const predicate = jest.fn().mockReturnValue(true)
        const val = jest.fn().mockReturnValue(true)

        const validator = V.and(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [delayP(50, P.propIsNonEmptyArray('b')), 'empty b'],
            [predicate, 'failed'],
            val,
        )

        await expect(validator({ a: ['a'] }).promise()).rejects.toEqual('empty b')
        expect(predicate).not.toHaveBeenCalled()
        expect(val).not.toHaveBeenCalled()
    })

    it('call function when not failing', async () => {
        const validObj = { a: ['bla'], b: ['hello'], c: 9 }
        const predicate = jest.fn().mockReturnValue(true)
        const val = jest.fn().mockReturnValue(Future.of(validObj))
        const validator = V.and(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [predicate, 'failed'],
            val,
        )

        await expect(validator(validObj).promise()).resolves.toEqual(validObj)
        expect(predicate).toHaveBeenCalledWith(validObj)
        expect(val).toHaveBeenCalledWith(validObj)
    })

    it('output the correct error', () => {
        const validator = V.and(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [P.propIsNumber('c'), 'no number c'],
        )

        return expect(validator({}).promise()).rejects.toEqual('empty a')
    })

    it('output the first invalide predicate', () => {
        const validator = V.and(
            [P.propIsNonEmptyArray('a'), 'empty a'],
            [P.propIsNonEmptyArray('b'), 'empty b'],
            [P.propIsNumber('c'), 'no number c'],
        )
        const invalidObj = { a: ['a'] }

        return expect(validator(invalidObj).promise()).rejects.toEqual('empty b')
    })
})
