import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { literalsHtmlCssMinifier } from '@literals/rollup-plugin-html-css-minifier';

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
  babel({exclude: 'node_modules/**'}),
  dev && serve(serveopts),
  !dev && terser({enclose: true, format: {comments: false, wrap_iife: true}}),
];

export default [
  {
  input: 'src/main.js',
  output: {
    file: 'dist/mini-graph-card-bundle.js',
    format: 'umd',
    name: 'MiniGraphCard',
    sourcemap: dev ? true : false,
  },
    plugins: [...plugins],
  },
];
