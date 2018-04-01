const Future = require('fluture')

const V = require('../src')


describe('`V.spec`', () => {
    describe('synchronous validation', () => {
        const validator = V.spec({
            a: V.number('error a'),
            b: V.nonEmptyString('error b'),
            nested: {
                a: V.number('error nested a'),
                b: V.oneOf(['string', 'anotherstring'], 'error nested b'),
            },
        })

        it('return correct error', () => expect(validator({}).promise())
            .rejects
            .toEqual({
                a: ['error a'],
                b: ['error b'],
                nested: {
                    a: ['error nested a'],
                    b: ['error nested b'],
                },
            })
        )

        it('accepts and returns original object', () => {
            const validObj = {
                a: 1, b: 'string', nested: { a: 1, b: 'string' },
            }

            return expect(validator(validObj).promise())
                .resolves
                .toEqual(validObj)
        })
    })

    describe('parallel validation', () => {
        it('runs in parallel', (done) => {
            const valPropA = jest.fn()
                .mockReturnValue(Future.rejectAfter(50, 'error a'))
            const valPropB = jest.fn()
                .mockReturnValue(Future.rejectAfter(50, 'error b'))

            setTimeout(() => {
                expect(valPropA).toHaveBeenCalledWith(null, {})
                expect(valPropB).toHaveBeenCalledWith(null, {})
                done()
            }, 60)

            const validator = V.spec({ a: valPropA, b: valPropB })
            validator({}).fork(_ => _, _ => _)
        })
    })

    describe('called with different root', () => {
        const obj = {
            a: 'aa',
            b: 'bb',
            nested: {
                na: 'nana',
                nb: 'nbnb',
                deep: {
                    da: 'dada',
                    db: 'dbdb',
                },
            },
        }

        it('calls validator with property and root object', async () => {
            const valPropA = jest.fn().mockReturnValue(Future.of(true))
            const valPropB = jest.fn().mockReturnValue(Future.of(true))
            const valPropNestedA = jest.fn().mockReturnValue(Future.of(true))
            const valPropDeepB = jest.fn().mockReturnValue(Future.of(true))
            const validator = V.spec({
                a: valPropA,
                b: valPropB,
                nested: {
                    na: valPropNestedA,
                    deep: { db: valPropDeepB },
                },
            })

            await expect(validator(obj).promise()).resolves.toEqual(obj)
            expect(valPropA).toHaveBeenCalledWith('aa', obj)
            expect(valPropB).toHaveBeenCalledWith('bb', obj)
            expect(valPropNestedA).toHaveBeenCalledWith('nana', obj)
            expect(valPropDeepB).toHaveBeenCalledWith('dbdb', obj)

            const rootObj = 'anything'
            await expect(validator(obj, rootObj).promise()).resolves.toEqual(obj)
            expect(valPropA).toHaveBeenCalledWith('aa', rootObj)
            expect(valPropB).toHaveBeenCalledWith('bb', rootObj)
            expect(valPropNestedA).toHaveBeenCalledWith('nana', rootObj)
            expect(valPropDeepB).toHaveBeenCalledWith('dbdb', rootObj)
        })
    })
})
