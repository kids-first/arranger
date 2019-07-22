#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const babelCfg = fs.readFileSync('.babelrc', 'utf-8');
require('@babel/register')(babelCfg);
require('@babel/register')();

// Necessary to polyfill Babel (replaces @babel/polyfill since 7.4.0)
// see https://babeljs.io/docs/en/7.4.0/babel-polyfill
require('core-js/stable');
require('regenerator-runtime/runtime');

require('./src').App();
