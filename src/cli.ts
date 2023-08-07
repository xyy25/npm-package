import { Command, Option } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson, toDepItemWithId, toDiagram } from './utils';
import { getPackage } from './utils/npmUtils';
import analyze, { detect, evaluate } from './utils/recur'; 
import chalk from 'chalk';
import lang from './lang/zh-CN.json';

const { cyan, green, yellow, yellowBright } = chalk;
const error = chalk.bgBlack.bold.red;
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
    .option('-c, --console, --print', lang.commands.analyze.options.console.description)
    .option('--diagram', lang.commands.analyze.options.diagram.description)
    .action(async (str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        const { depth } = options; // 最大深度设置，默认为Infinity

        try {
            if(!fs.existsSync(pkgRoot)) { // 目录不存在
                console.error( 
                    error(lang.commons.error + ':', lang.logs['cli.ts'].dirNotExist)
                );
                return;
            }
            const pkgJson = readPackageJson(path.join(pkgRoot, 'package.json'));
            if(!pkgJson) { // package.json不存在
                console.error(error(
                    lang.commons.error + ":", 
                    lang.logs['cli.ts'].pkgJsonNotExist.replace('%s', str)
                ))
                return;
            }

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
            const depEval = analyze(pkgRoot, depth, scopes[0], scopes[1], scopes[2], pkgEx.length);
            // 评估分析结果并打印至控制台，该函数返回没有被依赖的包
            const notRequired = evaluate(depEval, pkgEx); 
            
            let res: any = depEval.result;
            if(options.diagram) {
                res = toDiagram(res, pkgJson);
                // 如果未设置最大深度，有向图结构会自动附加上存在于node_modules中但没有被依赖覆盖到的包
                if(depth === Infinity) {
                    res.push(...notRequired.map(e => toDepItemWithId(e))); 
                }
            }

            if(!Object.keys(res).length) {
                console.log(lang.logs['cli.ts'].noDependency);
                return;
            }

            if(options.console) {
                console.log(res);
            }

            if(!fs.existsSync(path.join(cwd, 'outputs'))) {
                fs.mkdirSync(path.join(cwd, 'outputs'));
            }
            if(options.json) { // 输出JSON文件设置
                // 自动创建outputs文件夹
                let outFileName = options.json === true ? 
                    path.join('outputs', 'res-' + pkgJson.name) : options.json;
                if(!outFileName.endsWith('.json')) {
                    outFileName += '.json';
                }
                const outFileUri = path.join(cwd, outFileName);
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
                console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(outFileName))));
            } else {
                if(!options.diagram) res = toDiagram(res, pkgJson);
                fs.writeFileSync(path.join(__dirname, 'public', 'res.json'), Buffer.from(JSON.stringify(res)));
                await import('./express');
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
            const dirEx = fs.existsSync(pkgRoot);
            if(!dirEx) {
                console.error( 
                    error(lang.commons.error + ':', lang.logs['cli.ts'].dirNotExist)
                );
                return;
            }

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

