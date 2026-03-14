import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import {literalsHtmlCssMinifier} from '@literals/rollup-plugin-html-css-minifier';
import pkg from './package.json' with {type: 'json'};

const dev = process.env.ROLLUP_WATCH;

// https://github.com/d3/d3-interpolate/issues/58
const D3_WARNING = /Circular dependency.*d3-interpolate/

export default [
    {
        input: 'src/main.js',
        watch: {
            buildDelay: 500
        },
        output: {
            file: `dist/${pkg.name}-bundle.js`,
            format: 'umd',
            name: pkg.name,
            sourcemap: !!dev,
        },
        onwarn: function (message) {
            if (D3_WARNING.test(message)) {}
        },
        plugins: [
            //literalsHtmlCssMinifier(), TODO Breaks font_size inline style
            nodeResolve({}),
            commonjs(),
            json(),
            babel({babelHelpers: 'bundled'}),
            !dev && terser({
                ecma: 2015, // ES6
                compress: {
                    module: true,
                    drop_console: dev ? false : ['debug'],
                },
                enclose: true,
                format: {comments: false, wrap_iife: true}
            }),
        ],
    },
];
