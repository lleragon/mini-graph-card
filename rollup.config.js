import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import {literalsHtmlCssMinifier} from '@literals/rollup-plugin-html-css-minifier';

const dev = process.env.ROLLUP_WATCH;
const serveopts = {
    contentBase: ['./dist'],
    host: '0.0.0.0',
    port: 5000,
    allowCrossOrigin: true,
    headers: {
        'Access-Control-Allow-Origin': '*',
    },
};

const plugins = [
    literalsHtmlCssMinifier(),
    nodeResolve({}),
    commonjs(),
    json(),
    babel({exclude: 'node_modules/**', babelHelpers: 'bundled'}),
    dev && serve(serveopts),
    !dev && terser({enclose: true, format: {comments: false, wrap_iife: true}}),
];

// https://github.com/d3/d3-interpolate/issues/58
const D3_WARNING = /Circular dependency.*d3-interpolate/

export default [
    {
        input: 'src/main.js',
        output: {
            file: 'dist/extrema-graph-card-bundle.js',
            format: 'umd',
            name: 'ExtremaGraphCard',
            sourcemap: !!dev,
        },
        onwarn: function (message) {
            if (D3_WARNING.test(message)) {}
        },
        plugins: [...plugins],
    },
];
