// https://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parserOptions: {
        sourceType: 'module'
    },
    env: {
        browser: false,
        node: true,
        mocha: true,
    },
    globals: {
        expect: true,
    },
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    extends: 'standard',

    // add your custom rules here
    rules: {
        // allow paren-less arrow functions
        'arrow-parens': 0,
        // allow async-await
        'generator-star-spacing': 0,
        'indent': ['error', 4],
        'comma-dangle': ['error', 'always-multiline'],
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'no-multi-spaces': ['error', { ignoreEOLComments: true }],
        'prefer-promise-reject-errors': 0,

        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    },
}
