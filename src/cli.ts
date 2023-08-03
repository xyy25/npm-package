import { Command, Option } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson, toDiagram } from './utils';
import { getPackage } from './utils/npmUtils';
import readRecur, { detect } from './utils/recur'; 
import chalk from 'chalk';
import lang from './lang/zh-CN.json';

const { cyan, green, yellow, yellowBright } = chalk;
const cmd = new Command();

cmd.name('npmpkg-cli')
    .description(lang.description)
    .version('0.0.1');

const scopeOption = new Option('-s, --scope <scope>', lang.commands.analyze.options.scope.description)
        .choices(['all', 'norm', 'peer', 'dev'])
        .default('all');
const depthOption = new Option('-d, --depth <depth>', lang.commands.analyze.options.depth.description)
        .default(Infinity, lang.commands.analyze.options.depth.default)
        .argParser((value) => { const r: number = parseInt(value); return Number.isNaN(r) ? Infinity : r; })
const jsonOption = new Option( '-j, --json [fileName]', lang.commands.analyze.options.json.description);
const jsonPrettyOption = new Option('--pretty, --format', lang.commands.analyze.options.format.description)

cmd.command('analyze').description(lang.commands.analyze.description)
    .argument('<string>', lang.commands.analyze.argument[0].description)
    .addOption(scopeOption)
    .addOption(depthOption)
    .addOption(jsonOption)
    .addOption(jsonPrettyOption)
    .option('--diagram', lang.commands.analyze.options.diagram.description)
    .action(async (str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        const { depth } = options; // 最大深度设置，默认为Infinity

        try {
            const pkgEx = detect(pkgRoot, depth);
            const desc = lang.logs['cli.ts'];
            console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));

            await new Promise((res) => setTimeout(res, 1000));

            const { scope } = options;
            const scopes =
                scope === 'norm' ? [true, false, false] :
                scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true]

            console.log(pkgRoot, scopes, depth);
            let res: any = readRecur(pkgRoot, depth, scopes[0], scopes[1], scopes[2], pkgEx);
            if(options.diagram) {
                const pkgJson = readPackageJson(path.join(pkgRoot, 'package.json'));
                res = toDiagram(res, pkgJson);
            }

            if(options.json) { // 输出JSON文件设置
                let outFileName = options.json === true ? str : options.json;
                if(!outFileName.endsWith('.json')) {
                    outFileName += '.json';
                }
                const outFileUri = path.join(cwd, outFileName);
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
                console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(outFileName))));
            } else {
                console.log(res);
            }
        } catch(e: any) {
            console.error(e);
        }
    });

cmd.command('detect')
    .description(lang.commands.detect.description)
    .argument('<string>', lang.commands.detect.argument[0].description)
    .addOption(depthOption)
    .option('--show', lang.commands.detect.options.show.description, false)
    .action((str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        const { depth } = options;

        try {
            const res = detect(pkgRoot, depth);
            if(options.show) {
                res.forEach(e => console.log('-', green(e)));
            }
            console.log(cyan(lang.logs["cli.ts"].detectPkg), res.length);
        } catch (e) {
            console.error(e);
        }
    })

cmd.command('get')
    .description(lang.commands.get.description)
    .argument('<string>', lang.commands.get.argument[0].description)
    .option('-v, --version <string>', lang.commands.get.options.version.description)
    .option('-a, --all', lang.commands.get.options.all.description)
    .action(async (str, options) => {
        const res = await getPackage(str, options.version ?? '*', !!options.all);
        console.log(res);
    })

cmd.parse();

