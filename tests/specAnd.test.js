const R = require('ramda')

const V = require('../src')
const { delayP } = require('./helpers')


describe('function V.specAnd', () => {
    it('reject invalid obj and does not continue validating after failure', async () => {
        const predicate = jest.fn()

        const validator = V.specAnd(
            {
                a: {
                    nested: V.parallel(
                        [a => Promise.reject('PromiseRejection'), 'errorMessage'],
                        [(n, obj) => obj.a.nested2 === obj.a.nested, 'must be equal'],
                    ),
                    nested2: V.number('NumberError'),
                },
                b: V.nonEmptyArray('ArrayError'),
                c: V.nonEmptyArray('ArrayError'),
            },
            { a: {
                nested: V.parallel(
                    [predicate, 'error'],
                    [delayP(50, R.is(Array)), 'delayed'],
                    V.oneOf([42, 43]),
                    V.number('NumberError'),
                ),
            }},
        )
        const invalidObj = {
            a: {
                nested: 'string',
                nested2: '5',
            },
            b: [7],
            c: 'not a number',
        }

        await expect(validator(invalidObj).promise())
            .rejects
            .toEqual({
                a: {
                    nested: ['PromiseRejection', 'must be equal'],
                    nested2: ['NumberError'],
                },
                c: ['ArrayError'],
            })

        expect(predicate).not.toHaveBeenCalled()
    })

    it('not proceed validation if errors are encountered', async () => {
        const val = jest.fn()
        const validator = V.specAnd(
            { a: V.number('errora') },
            { b: V.number('errorb'), a: V.nonEmptyArray('arraya') },
            { c: val },
        )
        const invalidObj = { a: 1, b: 'nonumber', c: 'nonumber' }

        await expect(validator(invalidObj).promise())
            .rejects
            .toEqual({ a: ['arraya'], b: ['errorb'] })

        expect(val).not.toHaveBeenCalled()
    })

    it('accept valid object', async () => {
        const val = jest.fn().mockReturnValue(true)
        const validator = V.specAnd(
            { a: V.number('errora') },
            { b: V.number('errorb'), a: V.oneOf([1, 2]) },
            { c: val },
        )
        const validObj = { a: 1, b: 42, c: 'somestring' }

        await expect(validator(validObj).promise()).resolves.toEqual(validObj)
        expect(val).toHaveBeenCalledWith('somestring', validObj)
    })
})
