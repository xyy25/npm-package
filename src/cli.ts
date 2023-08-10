import { Command, Option } from 'commander';
import path, { join, resolve } from 'path';
import fs from 'fs';
import { getManagerType, readPackageJson, toDepItemWithId, toDiagram } from './utils';
import { getPackage } from './utils/npmUtils';
import analyze from './utils/analyze'; 
import { evaluate } from './utils/recurUtils';
import detect, { detectPnpm } from './utils/detect';
import readline from 'readline';
import chalk from 'chalk';
import lang from './lang/zh-CN.json';
import { PackageManager } from './utils/types';

const { cyan, cyanBright, green, yellow, yellowBright } = chalk;
const error = chalk.bgBlack.bold.red;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

type ReturnType<T> = T extends string ? string : T extends number ? number : never;

const readInput = async <D extends string | number, R = ReturnType<D>> (
    prompt: string, 
    inputDesc: string = '', 
    def: D = 'T' as D
): Promise<R> => {
    if(inputDesc || def) {
        prompt += ' (';
        inputDesc && (prompt += inputDesc + (def && ', '));
        def && (prompt += `${lang.line.default}: ${def}`);
        prompt += ')';
    }
    rl.setPrompt(prompt + cyan('> '));
    rl.prompt();
    return await new Promise<R>(
        res => rl.on('line', (line: string) => {
            const r = typeof def === 'string' ? line : parseInt(line)
            res(r as R);
        })
    );
}

const cmd = new Command();

cmd.name('npmpkg-cli')
    .description(lang.description)
    .version('0.0.1', undefined, (lang as any).version)
    .addHelpCommand(true, (lang.commands as any).help?.description)
    .showSuggestionAfterError(true);

const managerOption = new Option('-m, --manager <packageManager>', lang.commands.analyze.options.manager.description)
        .choices(['auto', 'npm', 'yarn', 'pnpm'])
        .default('auto')
const scopeOption = new Option('-s, --scope <scope>', lang.commands.analyze.options.scope.description)
        .choices(['all', 'norm', 'peer', 'dev'])
        .default('all');
const depthOption = new Option('-d, --depth <depth>', lang.commands.analyze.options.depth.description)
        .default(NaN, lang.commands.analyze.options.depth.default);
const jsonOption = new Option( '-j, --json [fileName]', lang.commands.analyze.options.json.description);
const jsonPrettyOption = new Option('--pretty, --format', lang.commands.analyze.options.format.description)
const defaultOption = new Option('-y, --default', lang.commands.analyze.options.default.description)
        .default(false);
const hostOption = new Option('-h, --host', lang.commands.analyze.options.host.description)
    .default("127.0.0.1");
const portOption = new Option('-p, --port', lang.commands.analyze.options.port.description)
    .default(5500).argParser((v) => parseInt(v));


cmd.command('analyze').description(lang.commands.analyze.description)
    .argument('[package root]', lang.commands.analyze.argument[0].description)
    .addOption(managerOption)
    .addOption(scopeOption)
    .addOption(depthOption)
    .addOption(jsonOption)
    .addOption(jsonPrettyOption)
    .addOption(defaultOption)
    .addOption(hostOption)
    .addOption(portOption)
    .option('-c, --console, --print', lang.commands.analyze.options.console.description)
    .option('-i, --noweb', lang.commands.analyze.options.noweb.description)
    .option('--proto', lang.commands.analyze.options.proto.description)
    .action(async (str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        let { depth, noweb, default: def, host, port } = options; // 最大深度设置，默认为Infinity
        let json: boolean | string | undefined = options.json;
        let manager: 'auto' | PackageManager = options.manager;

        // 询问
        while(!str) {
            str = await readInput(lang.line['input.dir']);
            if(str === '.exit') {
                rl.close();
                return;
            }
            if(!fs.existsSync(resolve(str))) {
                console.error(error(lang.logs['cli.ts'].dirNotExist));
                str = undefined;
            }
        }
        const defOutFileName = join('outputs', `res-${path.basename(resolve(str))}.json`);
        if(!def) { // 如果不设置使用默认设置-y，则询问一些问题
            if(Number.isNaN(depth)) {
                depth = await readInput(lang.line['input.depth'], '', Infinity);
            }
            if(json === undefined) {
                const input = await readInput(lang.line['input.outJson'], 'y/n', 'n');
                json = input === 'y';
                if(json) {
                    json = await readInput(lang.line['input.outJsonDir'], '', defOutFileName) || true;
                    if(noweb === undefined) { // 输出json则默认不打开网页
                        noweb = true;
                    }
                } else if(!noweb) {
                    port = await readInput(lang.line['input.port'], '', 5500);
                    host = '127.0.0.1';
                }
            }
        }
        noweb ??= json;
        depth ||= Infinity;
        rl.close();

        const pkgRoot = resolve(str); // 包的根目录

        try {
            if(!fs.existsSync(pkgRoot)) { // 目录不存在
                throw lang.logs['cli.ts'].dirNotExist;
            }
            const pkgJson = readPackageJson(join(pkgRoot, 'package.json'));
            if(!pkgJson) { // package.json不存在
                throw lang.logs['cli.ts'].pkgJsonNotExist.replace('%s', str);
            }
            if(manager === 'auto') {
                manager = getManagerType(pkgRoot);
            }

            const pkgEx = detect(pkgRoot, manager, depth);
            const desc = lang.logs['cli.ts'];
            console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));

            await new Promise((res) => setTimeout(res, 1000));

            const { scope } = options;
            const scopes =
                scope === 'norm' ? [true, false, false] :
                scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true]

            console.log(pkgRoot, scopes, manager, depth);

            const depEval = analyze(pkgRoot, manager, depth, scopes[0], scopes[1], scopes[2], pkgEx.length);
            // 评估分析结果并打印至控制台，该函数返回没有被依赖的包
            const notRequired = evaluate(depEval, pkgEx as string[]); 
            
            let res: any = depEval.result;
            if(!options.proto) {
                res = toDiagram(res, pkgRoot, pkgJson);
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

            if(!fs.existsSync(resolve('outputs'))) {
                fs.mkdirSync(resolve('outputs'));
            }
            if(json) { // 输出JSON文件设置
                // 自动创建outputs文件夹
                let outFileName = json === true ? defOutFileName : json;
                if(!outFileName.endsWith('.json')) {
                    outFileName += '.json';
                }
                const outFileUri = resolve(outFileName);
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
                console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(outFileName))));
            }
            if(!noweb) {
                if(options.proto) res = toDiagram(res, pkgRoot, pkgJson);
                const buffer = Buffer.from(JSON.stringify(res));
                fs.writeFileSync(join(__dirname, 'express/public/res.json'), buffer);
                (await import('./express')).default(port, host);
            }
        } catch(e: any) {
            console.error(error(lang.commons.error + ':' + e));
        }
    });

cmd.command('detect')
    .description(lang.commands.detect.description)
    .argument('[package root]', lang.commands.detect.argument[0].description)
    .addOption(managerOption)
    .addOption(depthOption)
    .addOption(defaultOption)
    .option('--show', lang.commands.detect.options.show.description, false)
    .action(async (str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        let { depth, default: def } = options;
        let manager: PackageManager | 'auto' = options.manager;
        depth = parseInt(depth);

        try {
            // 询问
            if(!str) {
                str = await readInput(lang.line['input.dir'])
            }
            const pkgRoot = resolve(str); // 包的根目录
            const dirEx = fs.existsSync(pkgRoot);
            if(!dirEx) {
                throw lang.logs['cli.ts'].dirNotExist;
            }
            if(manager === 'auto') {
                manager = getManagerType(pkgRoot);
            }

            if(manager !== 'pnpm' && !def) {
                depth = parseInt(await readInput(lang.line['input.depth'], '', 'Infinity')) || Infinity;
            }
            rl.close();
            depth ||= Infinity;

            let res: string[] | [string, string[]][] = [];
            
            if(manager === 'pnpm') {
                res = detectPnpm(pkgRoot);
                options.show && res.forEach(([o, l]) => {
                    console.log('*', cyanBright(o));
                    l.forEach(e => console.log(' ->', green(e)));
                });
            } else {
                res = detect(pkgRoot, manager, depth);
                options.show && res.forEach(e => console.log('-', green(e)));
            }
            console.log(cyan(lang.logs["cli.ts"].detectPkg), res.length);
        } catch (e) {
            console.error(error(lang.commons.error + ':', e));
        }
    })

cmd.command("view")
    .alias("show")
    .description(lang.commands.view.description)
    .argument('[JSON uri]', lang.commands.view.argument[0].description)
    .addOption(hostOption)
    .addOption(portOption)
    .action(async (str, options) => {
        const cwd = process.cwd();
    
        if(!str) {
            str = await readInput(lang.line['input.jsonFile']);
        }
        rl.close();

        try {
            if(!str.endsWith('.json')) {
                str += '.json';
            }
            const uri = resolve(str);
            if(!fs.existsSync(uri) || !fs.lstatSync(uri).isFile()) {
                throw lang.logs['cli.ts'].fileNotExist;
            }

            fs.cpSync(uri, join(__dirname, 'express/public/res.json'), { force: true });
            
            const { port, host } = options;
            (await import('./express')).default(port, host);

        } catch (e) {
            console.error(error(lang.commons.error + ': ' + e));
        }
    })

cmd.command('get')
    .description(lang.commands.get.description)
    .argument('[package name]', lang.commands.get.argument[0].description)
    .option('-v, --version <string>', lang.commands.get.options.version.description)
    .option('-a, --all', lang.commands.get.options.all.description)
    .action(async (str, options) => {
        const res = await getPackage(str, options.version ?? '*', !!options.all);

        // 询问
        if(!str) {
            str = await readInput(lang.line['input.name']);
        }
        rl.close();

        console.log(res);
    })

cmd.parse();

