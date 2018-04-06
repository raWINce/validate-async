const Future = require('fluture')
const R = require('ramda')

const V = require('../src')
const { delayP } = require('./helpers')


describe('function V.specParallel', () => {
    it('validate all specs in parallel', () => {
        const validator = V.specParallel(
            {
                a: {
                    nested: V.parallel(
                        [a => Promise.reject('PromiseRejection'), 'stuff'],
                        [(n, obj) => obj.a.nested2 === obj.a.nested, 'must be equal'],
                    ),
                    nested2: V.number('numbernested2'),
                },
                b: V.nonEmptyArray('arrayb'),
                c: V.nonEmptyArray('arrayc'),
            },
            {
                a: {
                    nested: V.and(
                        [delayP(50, R.is(Array)), 'delayed'],
                        V.number('numbernested'),
                    ),
                    nested2: [x => x === 'foo', 'customErrornested2'],
                },
            },
        )
        const invalidObj = {
            a: {
                nested: 'string',
                nested2: '5',
            },
            b: [7],
            c: 'not a number',
        }

        return expect(validator(invalidObj).promise())
            .rejects
            .toEqual({
                a: {
                    nested: ['PromiseRejection', 'must be equal', 'delayed'],
                    nested2: ['numbernested2', 'customErrornested2'],
                },
                c: ['arrayc'],
            })
    })

    it('accept valid object', () => {
        const validator = V.specParallel(
            { a: V.number('errora') },
            { b: V.number('errorb'), a: V.oneOf([1, 2]) },
            { c: V.nonEmptyString('errorc') },
        )
        const validObj = { a: 1, b: 42, c: 'somestring' }

        return expect(validator(validObj).promise()).resolves.toEqual(validObj)
    })
})
