import { Command } from "commander"
import { cyan, yellow, yellowBright } from "chalk";
import { join, relative, resolve } from "path";
import fs from 'fs';
import inquirer, { QuestionCollection } from 'inquirer';
import inquirerAuto from "inquirer-autocomplete-prompt";

import { getDirs, outJsonRelUri, resbase } from '.';
import { error, publicOptions as opts } from "../cli";
import { readPackageJson, getManagerType, toDiagram, toDepItemWithId } from "../utils";
import detect from "../utils/detect";
import { evaluate } from "../utils/recurUtils";
import { PackageManager } from "../utils/types";
import analyze from "../utils/analyze";

inquirer.registerPrompt('auto', inquirerAuto);

const questions = (lang: any, enable: boolean): QuestionCollection => {
    return !enable ? [] : [{
        type: 'auto',
        name: 'pkg',
        message: lang.line['input.dir'],
        prefix: String.fromCodePoint(0x1F4C1), // 📁
        suffix: ' >',
        searchText: lang.line['status.searching'],
        emptyText:  lang.line['status.noResult'],
        source: getDirs,
        default: '.',
        validate: (input: any) => {
            if(input?.value && fs.existsSync(resolve(input.value))) {
                return true;
            }
            return error(lang.logs['cli.ts'].dirNotExist);
        }
    }, {
        type: 'number',
        name: 'depth',
        prefix: String.fromCodePoint(0x1F50D), // 🔍
        message: lang.line['input.depth'],
        default: Infinity
    }, {
        type: 'list',
        name: 'manager',
        message: lang.line['input.manager'],
        prefix: String.fromCodePoint(0x1F9F0), // 🧰
        choices: ['auto', 'npm', 'yarn', 'pnpm'],
        default: 'auto'
    }, {
        type: 'checkbox',
        name: 'scope',
        message: lang.line['input.scope'],
        prefix: String.fromCodePoint(0x1F4C7), // 📇
        choices: [
            { name:'norm', checked: true },
            { name:'dev', checked: true }, 
            { name:'peer', checked: true }
        ],
        filter: async (input) => [
            input.includes('norm'), 
            input.includes('dev'),
            input.includes('peer')
        ],
        validate: (input) => input.some((e: boolean) => e)
    }, {
        type: 'confirm',
        name: 'json',
        message: lang.line['input.outJson'],
        prefix: String.fromCodePoint(0x1F4C4), // 📄
        default: false
    }, {
        type: 'input',
        name: 'json',
        message: lang.line['input.outJsonDir'],
        prefix: String.fromCodePoint(0x1F4DD), // 📝
        askAnswered: true,
        when: (ans) => ans['json'],
        default: (ans: any) => 
            join('outputs', 'res-' + resbase(ans['pkg'])),
        filter: (input) => outJsonRelUri(input),
    }, {
        type: 'number',
        name: 'port',
        message: lang.line['input.port'],
        prefix: String.fromCodePoint(0x1F4E8), // 📨
        askAnswered: true,
        when: (ans) => !ans['json'],
        validate: (input) => {
            if(input <= 0 || input > 65536) {
                return error(lang.logs['cli.ts'].portInvalid);
            }
            return true;
        },
        default: 5500
    }];
}

function analyzeCommand(cmd: Command, lang: any) {
    cmd.command('analyze').description(lang.commands.analyze.description)
        .argument('[package root]', lang.commands.analyze.argument[0].description)
        .addOption(opts.manager)
        .addOption(opts.scope)
        .addOption(opts.depth)
        .addOption(opts.json)
        .addOption(opts.pretty)
        .addOption(opts.question)
        .addOption(opts.host)
        .addOption(opts.port)
        .option('-c, --console, --print', lang.commands.analyze.options.console.description)
        .option('-i, --noweb', lang.commands.analyze.options.noweb.description)
        .option('--proto', lang.commands.analyze.options.proto.description)
        .action((str, options) => action(str, options, lang));
}

const action = async (str: string, options: any, lang: any) => {
    const cwd = process.cwd(); // 命令执行路径

    // 询问
    let ans = await inquirer.prompt(
        questions(lang, !!options.question), { pkg: str }
    );
    ans = { ...options, ...ans };
    ans.noweb = ans.noweb ?? !!ans.json;
    ans.depth !== 0 && (ans.depth ||= Infinity);
    ans.pkg ??= '.';

    let { 
        pkg, depth, noweb, host, port, scope
    } = ans;
    let json: string | boolean | undefined = ans.json;
    let manager: PackageManager | 'auto' = ans.manager;

    const pkgRoot = resolve(pkg); // 包根目录的绝对路径
    pkg = resbase(pkg); // 包的名称，如果缺省则为本目录

    console.log(ans);

    try {
        if(!fs.existsSync(pkgRoot)) { // 目录不存在
            throw lang.logs['cli.ts'].dirNotExist;
        }
        const pkgJson = readPackageJson(join(pkgRoot, 'package.json'));
        if(!pkgJson) { // package.json不存在
            throw lang.logs['cli.ts'].pkgJsonNotExist.replace('%s', pkgRoot);
        }
        if(manager === 'auto') {
            manager = getManagerType(pkgRoot);
        }

        const pkgEx = detect(pkgRoot, manager, depth);
        const desc = lang.logs['cli.ts'];
        console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));

        await new Promise((res) => setTimeout(res, 1000));

        // 评估分析结果并打印至控制台，该函数返回没有被依赖的包
        const depEval = analyze(pkgRoot, manager, depth, scope[0], scope[1], scope[2], pkgEx.length);
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

        if(json) { // 输出JSON文件设置
            // 自动创建outputs文件夹
            if(!fs.existsSync(resolve('outputs'))) {
                fs.mkdirSync(resolve('outputs'));
            }
            // 如果json为布尔值true，则转换为目标文件路径字符串
            json = json === true ? outJsonRelUri(join('outputs', 'res-' + pkg)) : json;
            fs.writeFileSync(json, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
            console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(relative(cwd, json)))));
        }
        if(!noweb) {
            if(options.proto) res = toDiagram(res, pkgRoot, pkgJson);
            const buffer = Buffer.from(JSON.stringify(res));
            fs.writeFileSync(join(__dirname, '../express/public/res.json'), buffer);
            (await import('../express')).default(port, host);
        }
    } catch(e: any) {
        console.error(error(lang.commons.error + ':' + e));
    }
};

export default analyzeCommand;
