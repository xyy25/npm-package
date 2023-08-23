import { green, yellow, cyan, Chalk } from 'chalk';
import { join, sep } from 'path';
import { detectPnpm } from './src/utils/detect';
import { toDepItemWithId } from './src/utils';

export type DirObj = { 
    [dirName: string]: DirObj | string
}

export const dirsToObj = (
    dirStrs: string[], 
    suffices: string[] = new Array(dirStrs.length).fill('')
): DirObj => {
    const splited = dirStrs.map(e => e.split(sep));
    const root: DirObj = {};
    for(const [i, spDir] of splited.entries()) {
        let cur: DirObj = root;
        const t = spDir.length - 1;
        for(let j = 0; j < t; j++) {
            let child = cur[spDir[j]];
            if(child === undefined) {
                let flag = false;
                for(const key in cur) {
                    if(key.startsWith(spDir[j])) {
                        child = cur[key] = {};
                        flag = true;
                        break;
                    }
                }
                if(!flag) {
                    child = cur[spDir[j]] = {};
                }
            }
            if(typeof child === 'string') {
                child = cur[child] = {};
                delete cur[spDir[j]];
            }
            cur = child;
        }
        // spDir[t]的结构是'id@version'
        const [id, version] = spDir[t].split('@');
        if(id in cur) {
            cur[spDir[t]] = cur[id];
            delete cur[id];
        } else {
            const key = [id, version, suffices[i] || ''].join('$');
            cur[key] = key;
        }
    }
    return root;
}

export const printItemStrs = (itemStrs: string[] | [string, string[]][], depth: number = Infinity) => {
    const dfs = (cur: DirObj, d: number = 0, prefix = '') => {
        const keys = Object.keys(cur);
        const keylen = keys.length;
        for(const [i, key] of keys.entries()) {
            const child = cur[key];
            const pre = prefix + (i === keylen - 1 ? '└─' : '├─');
            const [id, version, link] = key.split('$', 3);
            const dir = (color: Chalk) => color(id) + ' ' + yellow(version ?? '') + ' ' + (link ?? '');
            if(typeof child === 'string') {
                console.log(pre + '─ ' + dir(green));
                continue;
            }
            console.log(pre + (d < depth ? '┬ ': '─ ') + dir(cyan));
            if(d < depth) {
                dfs(child, d + 1, prefix + (i === keylen - 1 ? '  ' : '│ '));
            }
        }
    }
    if(typeof itemStrs[0] === 'string') {
        dfs(dirsToObj(itemStrs as string[]));
    } else {
        itemStrs = itemStrs as [string, string[]][];
        const ver = (d: string) => toDepItemWithId(d).version;
        const linkMap: [string, boolean][] = 
            itemStrs.map((e, i) => 
                e[1].map<[string, boolean]>(d => [d + '@' + ver(e[0]), e[0].startsWith(d)])
            ).flat();
        dfs(dirsToObj(linkMap.map(e => e[0]), linkMap.map(e => e[1] ? '' : '↗')));
    }
}

const wl = [['node_modules', '@aashutoshrathi', 'word-wrap@1.2.6'], ['node_modules', '@babel', 'code-frame@7.22.5'], ['node_modules', '@babel', 'helper-validator-identifier@7.22.5'], ['node_modules', '@babel', 'highlight@7.22.5'], ['node_modules', '@babel', 'highlight', 'node_modules', 'ansi-styles@3.2.1'], ['node_modules', '@babel', 'highlight', 'node_modules', 'chalk@2.4.2'], ['node_modules', '@babel', 'highlight', 'node_modules', 'color-convert@1.9.3'], ['node_modules', '@babel', 'highlight', 'node_modules', 'color-name@1.1.3'], ['node_modules', '@babel', 'highlight', 'node_modules', 'escape-string-regexp@1.0.5'], ['node_modules', '@babel', 'highlight', 'node_modules', 'has-flag@3.0.0'], ['node_modules', '@babel', 'highlight', 'node_modules', 'supports-color@5.5.0'], ['node_modules', '@eslint', 'eslintrc@2.1.1'], ['node_modules', '@eslint', 'js@8.46.0'], ['node_modules', '@eslint-community', 'eslint-utils@4.4.0'], ['node_modules', '@eslint-community', 'regexpp@4.6.2'], ['node_modules', '@humanwhocodes', 'config-array@0.11.10'], ['node_modules', '@humanwhocodes', 'module-importer@1.0.1'], ['node_modules', '@humanwhocodes', 'object-schema@1.2.1'], ['node_modules', '@nodelib', 'fs.scandir@2.1.5'], ['node_modules', '@nodelib', 'fs.stat@2.0.5'], ['node_modules', '@nodelib', 'fs.walk@1.2.8'], ['node_modules', '@socket.io', 'component-emitter@3.1.0'], ['node_modules', '@types', 'cookie@0.4.1'], ['node_modules', '@types', 'cors@2.8.13'], ['node_modules', '@types', 'node@20.4.8'], ['node_modules', 'accepts@1.3.8'], ['node_modules', 'acorn@8.10.0'], ['node_modules', 'acorn-jsx@5.3.2'], ['node_modules', 'ajv@6.12.6'], ['node_modules', 'ansi-regex@5.0.1'], ['node_modules', 'ansi-styles@4.3.0'], ['node_modules', 'any-promise@1.3.0'], ['node_modules', 'argparse@2.0.1'], ['node_modules', 'async@3.2.4'], ['node_modules', 'asynckit@0.4.0'], ['node_modules', 'axios@1.4.0'], ['node_modules', 'balanced-match@1.0.2'], ['node_modules', 'base64-js@1.5.1'], ['node_modules', 'base64id@2.0.0'], ['node_modules', 'bearcat-buffer@0.1.1'], ['node_modules', 'bl@4.1.0'], ['node_modules', 'bl', 'node_modules', 'readable-stream@3.6.2'], ['node_modules', 'bluebird@3.7.2'], ['node_modules', 'brace-expansion@1.1.11'], ['node_modules', 'buffer@5.7.1'], ['node_modules', 'buffer-from@1.1.2'], ['node_modules', 'builtin-modules@1.1.1'], ['node_modules', 'callsites@3.1.0'], ['node_modules', 'chalk@4.1.2'], ['node_modules', 'color-convert@2.0.1'], ['node_modules', 'color-name@1.1.4'], ['node_modules', 'colors@1.4.0'], ['node_modules', 'combined-stream@1.0.8'], ['node_modules', 'commander@2.20.3'], ['node_modules', 'concat-map@0.0.1'], ['node_modules', 'cookie@0.4.2'], ['node_modules', 'core-util-is@1.0.3'], ['node_modules', 'cors@2.8.5'], ['node_modules', 'crc@3.8.0'], ['node_modules', 'cross-spawn@7.0.3'], ['node_modules', 'date-format@4.0.14'], ['node_modules', 'debug@4.3.4'], ['node_modules', 'deep-is@0.1.4'], ['node_modules', 'delayed-stream@1.0.0'], ['node_modules', 'diff@4.0.2'], ['node_modules', 'doctrine@3.0.0'], ['node_modules', 'duplexify@3.7.1'], ['node_modules', 'emoji-regex@7.0.3'], ['node_modules', 'end-of-stream@1.4.4'], ['node_modules', 'engine.io@6.5.1'], ['node_modules', 'engine.io', 'node_modules', 'ws@8.11.0'], ['node_modules', 'engine.io-parser@5.1.0'], ['node_modules', 'escape-string-regexp@4.0.0'], ['node_modules', 'eslint@8.46.0'], ['node_modules', 'eslint-scope@7.2.2'], ['node_modules', 'eslint-visitor-keys@3.4.2'], ['node_modules', 'espree@9.6.1'], ['node_modules', 'esprima@4.0.1'], ['node_modules', 'esquery@1.5.0'], ['node_modules', 'esrecurse@4.3.0'], ['node_modules', 'estraverse@5.3.0'], ['node_modules', 'esutils@2.0.3'], ['node_modules', 'eyes@0.1.8'], ['node_modules', 'fast-deep-equal@3.1.3'], ['node_modules', 'fast-json-stable-stringify@2.1.0'], ['node_modules', 'fast-levenshtein@2.0.6'], ['node_modules', 'fastq@1.15.0'], ['node_modules', 'file-entry-cache@6.0.1'], ['node_modules', 'find-up@5.0.0'], ['node_modules', 'flat-cache@3.0.4'], ['node_modules', 'flatted@3.2.7'], ['node_modules', 'follow-redirects@1.15.2'], ['node_modules', 'form-data@4.0.0'], ['node_modules', 'fs-extra@8.1.0'], ['node_modules', 'fs.realpath@1.0.0'], ['node_modules', 'function-bind@1.1.1'], ['node_modules', 'glob@7.2.3'], ['node_modules', 'glob-parent@6.0.2'], ['node_modules', 'globals@13.20.0'], ['node_modules', 'graceful-fs@4.2.11'], ['node_modules', 'graphemer@1.4.0'], ['node_modules', 'has@1.0.3'], ['node_modules', 'has-flag@4.0.0'], ['node_modules', 'ieee754@1.2.1'], ['node_modules', 'ignore@5.2.4'], ['node_modules', 'import-fresh@3.3.0'], ['node_modules', 'imurmurhash@0.1.4'], ['node_modules', 'inflight@1.0.6'], ['node_modules', 'inherits@2.0.4'], ['node_modules', 'is-core-module@2.13.0'], ['node_modules', 'is-extglob@2.1.1'], ['node_modules', 'is-glob@4.0.3'], ['node_modules', 'is-path-inside@3.0.3'], ['node_modules', 'isarray@1.0.0'], ['node_modules', 'isexe@2.0.0'], ['node_modules', 'js-tokens@4.0.0'], ['node_modules', 'js-yaml@4.1.0'], ['node_modules', 'json-schema-traverse@0.4.1'], ['node_modules', 'json-stable-stringify-without-jsonify@1.0.1'], ['node_modules', 'json2module@0.0.3'], ['node_modules', 'jsonfile@4.0.0'], ['node_modules', 'levn@0.4.1'], ['node_modules', 'locate-path@6.0.0'], ['node_modules', 'lodash.merge@4.6.2'], ['node_modules', 'log4js@6.9.1'], ['node_modules', 'loose-envify@1.4.0'], ['node_modules', 'mime-db@1.52.0'], ['node_modules', 'mime-types@2.1.35'], ['node_modules', 'minimatch@3.1.2'], ['node_modules', 'minimist@1.2.8'], ['node_modules', 'mkdirp@1.0.4'], ['node_modules', 'mqtt-connection@4.1.0'], ['node_modules', 'mqtt-packet@6.10.0'], ['node_modules', 'ms@2.1.2'], ['node_modules', 'mz@2.7.0'], ['node_modules', 'natural-compare@1.4.0'], ['node_modules', 'negotiator@0.6.3'], ['node_modules', 'node-bignumber@v1.2.2'], ['node_modules', 'object-assign@4.1.1'], ['node_modules', 'once@1.4.0'], ['node_modules', 'optionator@0.9.3'], ['node_modules', 'p-limit@3.1.0'], ['node_modules', 'p-locate@5.0.0'], ['node_modules', 'parent-module@1.0.1'], ['node_modules', 'path-exists@4.0.0'], ['node_modules', 'path-is-absolute@1.0.1'], ['node_modules', 'path-key@3.1.1'], ['node_modules', 'path-parse@1.0.7'], ['node_modules', 'pinus@1.7.0'], ['node_modules', 'pinus', 'node_modules', 'commander@3.0.2'], ['node_modules', 'pinus-admin@1.7.0'], ['node_modules', 'pinus-loader@1.7.0'], ['node_modules', 'pinus-logger@1.7.0'], ['node_modules', 'pinus-monitor@1.7.0'], ['node_modules', 'pinus-protobuf@1.7.0'], ['node_modules', 'pinus-protocol@1.7.0'], ['node_modules', 'pinus-rpc@1.7.0'], ['node_modules', 'pinus-scheduler@1.7.0'], ['node_modules', 'prelude-ls@1.2.1'], ['node_modules', 'pretty-columns@1.2.1'], ['node_modules', 'process-nextick-args@2.0.1'], ['node_modules', 'proxy-from-env@1.1.0'], ['node_modules', 'punycode@2.3.0'], ['node_modules', 'queue-microtask@1.2.3'], ['node_modules', 'react@18.2.0'], ['node_modules', 'react-dom@18.2.0'], ['node_modules', 'read-last-lines@1.8.0'], ['node_modules', 'readable-stream@2.3.8'], ['node_modules', 'readable-stream', 'node_modules', 'safe-buffer@5.1.2'], ['node_modules', 'reflect-metadata@0.1.13'], ['node_modules', 'resolve@1.22.4'], ['node_modules', 'resolve-from@4.0.0'], ['node_modules', 'reusify@1.0.4'], ['node_modules', 'rfdc@1.3.0'], ['node_modules', 'rimraf@3.0.2'], ['node_modules', 'run-parallel@1.2.0'], ['node_modules', 'rw@1.3.3'], ['node_modules', 'safe-buffer@5.2.1'], ['node_modules', 'scheduler@0.23.0'], ['node_modules', 'semver@5.7.2'], ['node_modules', 'seq-queue@0.0.5'], ['node_modules', 'shebang-command@2.0.0'], ['node_modules', 'shebang-regex@3.0.0'], ['node_modules', 'socket.io@4.7.1'], ['node_modules', 'socket.io-adapter@2.5.2'], ['node_modules', 'socket.io-adapter', 'node_modules', 'ws@8.11.0'], ['node_modules', 'socket.io-parser@4.2.4'], ['node_modules', 'source-map@0.6.1'], ['node_modules', 'source-map-support@0.5.21'], ['node_modules', 'sprintf-js@1.0.3'], ['node_modules', 'stream-pkg@0.0.5'], ['node_modules', 'stream-shift@1.0.1'], ['node_modules', 'streamroller@3.1.5'], ['node_modules', 'string_decoder@1.1.1'], ['node_modules', 'string_decoder', 'node_modules', 'safe-buffer@5.1.2'], ['node_modules', 'strip-ansi@6.0.1'], ['node_modules', 'strip-json-comments@3.1.1'], ['node_modules', 'supports-color@7.2.0'], ['node_modules', 'supports-preserve-symlinks-flag@1.0.0'], ['node_modules', 'text-table@0.2.0'], ['node_modules', 'thenify@3.3.1'], ['node_modules', 'thenify-all@1.6.0'], ['node_modules', 'through2@2.0.5'], ['node_modules', 'tslib@1.14.1'], ['node_modules', 'tslint@6.1.3'], ['node_modules', 'tslint', 'node_modules', 'ansi-styles@3.2.1'], ['node_modules', 'tslint', 'node_modules', 'argparse@1.0.10'], ['node_modules', 'tslint', 'node_modules', 'chalk@2.4.2'], ['node_modules', 'tslint', 'node_modules', 'color-convert@1.9.3'], ['node_modules', 'tslint', 'node_modules', 'color-name@1.1.3'], ['node_modules', 'tslint', 'node_modules', 'escape-string-regexp@1.0.5'], ['node_modules', 'tslint', 'node_modules', 'has-flag@3.0.0'], ['node_modules', 'tslint', 'node_modules', 'js-yaml@3.14.1'], ['node_modules', 'tslint', 'node_modules', 'mkdirp@0.5.6'], ['node_modules', 'tslint', 'node_modules', 'supports-color@5.5.0'], ['node_modules', 'tsutils@2.29.0'], ['node_modules', 'type-check@0.4.0'], ['node_modules', 'type-fest@0.20.2'], ['node_modules', 'typescript@5.1.6'], ['node_modules', 'universalify@0.1.2'], ['node_modules', 'uri-js@4.4.1'], ['node_modules', 'util-deprecate@1.0.2'], ['node_modules', 'uuid@9.0.0'], ['node_modules', 'vary@1.1.2'], ['node_modules', 'which@2.0.2'], ['node_modules', 'wrappy@1.0.2'], ['node_modules', 'ws@8.13.0'], ['node_modules', 'xtend@4.0.2'], ['node_modules', 'yocto-queue@0.1.0']];
const w = wl.map(e => e.join(sep));
const s = detectPnpm(join(__dirname, './test-pkgs/pnpm-test'));

printItemStrs(w);