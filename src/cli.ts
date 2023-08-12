import { Command, Option } from 'commander';
import { resolve, basename, dirname, join, normalize } from 'path';
import fs from 'fs';
import { getPackage } from './utils/npmUtils';

import chalk from 'chalk';
import lang from './lang/zh-CN.json';

import analyzeCommand from './cmds/analyze';
import detectCommand from './cmds/detect';
import viewCommand from './cmds/view';

export const error = chalk.bgBlack.bold.redBright;

const cmd = new Command();

cmd.name('pkg-cli')
    .description(lang.description)
    .version('0.0.1', undefined, (lang as any).version)
    .addHelpCommand(true, (lang.commands as any).help?.description)
    .showSuggestionAfterError(true);

export const publicOptions = {
    manager: new Option('-m, --manager <packageManager>', lang.commands.analyze.options.manager.description)
                .choices(['auto', 'npm', 'yarn', 'pnpm'])
                .default('auto'),
    scope: new Option('-s, --scope <scope>', lang.commands.analyze.options.scope.description)
                .choices(['all', 'norm', 'peer', 'dev'])
                .default([true, true, true])
                .argParser((v) => { return {
                    all: [true, true, true], norm: [true, false, false],
                    peer: [false, false, true], dev: [false, true, false]
                }[v] }),
    depth: new Option('-d, --depth <depth>', lang.commands.analyze.options.depth.description)
                .default(NaN, lang.commands.analyze.options.depth.default)
                .argParser((v) => parseInt(v)),
    json: new Option( '-j, --json [fileName]', lang.commands.analyze.options.json.description)
                .argParser((v) => typeof v === 'string' ? outJsonRelUri(v) : v),
    pretty: new Option('--pretty, --format', lang.commands.analyze.options.format.description),
    question: new Option('-q, --question', lang.commands.analyze.options.question.description)
                .default(false),
    host: new Option('-h, --host <host>', lang.commands.analyze.options.host.description)
                .default("127.0.0.1"),
    port: new Option('-p, --port <port>', lang.commands.analyze.options.port.description)
                .default(5500)
                .argParser((v) => parseInt(v))
}

analyzeCommand(cmd, lang);
detectCommand(cmd, lang);
viewCommand(cmd, lang);

cmd.command('get')
    .description(lang.commands.get.description)
    .argument('<package name>', lang.commands.get.argument[0].description)
    .option('-v, --version <string>', lang.commands.get.options.version.description)
    .option('-a, --all', lang.commands.get.options.all.description)
    .action(async (str, options) => {
        const res = await getPackage(str, options.version ?? '*', !!options.all);
        console.log(res);
    })

export const outJsonRelUri = (relUri: string) => {
    let baseName = resbase(relUri);
    let dirName = dirname(relUri);
    if(!baseName.endsWith('.json')) baseName += '.json';
    return join(dirName, baseName);
}

export const resbase = (relUri: string) => basename(resolve(relUri));

export const getDirs = (ans: any, input: any) => 
    getFiles(ans, input, (file: string) => fs.lstatSync(file).isDirectory());

export const getFiles = (
    ans: any, 
    input: any, 
    filter: (file: string) => boolean
) => {
    input ??= '.';
    const inputAbs = resolve(input);
    try {
        if(!fs.existsSync(inputAbs) || !fs.lstatSync(inputAbs).isDirectory()) {
            const parent = dirname(input), parAbs = dirname(inputAbs);
            const base = basename(inputAbs);
            if(!fs.existsSync(parAbs) || !fs.lstatSync(parAbs).isDirectory()) {
                return [];
            }
            const files = fs.readdirSync(parAbs) ?? [];
            return files
                .filter(e => filter(join(parAbs, e)) && e.includes(base))
                .map(e => normalize(join(parent, e)));
        }
        const files = fs.readdirSync(inputAbs) ?? [];
        const list = files.filter(e => filter(join(inputAbs, e)));
        return [input, ...list.map(e => join(input, e))].map(normalize);
    } catch {
        return [];
    }
}

cmd.parse();