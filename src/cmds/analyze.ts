import { Command } from "commander"
import { cyan, yellow, yellowBright } from "chalk";
import { basename, join, relative, resolve } from "path";
import fs, { existsSync } from 'fs';
import inquirer, { QuestionCollection } from 'inquirer';
import inquirerAuto from "inquirer-autocomplete-prompt";

import { getDirs, outJsonRelUri, resbase } from '.';
import { error, publicOptions as opts } from "../cli";
import { readPackageJson, toDepItemWithId, timeString } from "../utils";
import { toDiagram } from '../utils/diagram';
import detect from "../utils/detect";
import { evaluate } from "../utils/evaluate";
import { DepEval, DirectedDiagram, PackageManager } from "../utils/types";
import analyze, { orange } from "../utils/analyze";
import { createResourceServer } from "../express";
import { run, checkStartNginx } from "../express/script"


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

const extraQuestion = (lang: any) => ({
    type: "confirm" as "confirm",
    name: "extra",
    suffix: " >",
    message: orange(lang.line['input.extraAnalyze']),
    default: true
})

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
        .option('-e, --extra', lang.commands.analyze.options.extra.description, false)
        .option('-c, --console, --print', lang.commands.analyze.options.console.description, false)
        .option('-i, --noweb', 
            lang.commands.analyze.options.noweb.description + 
            " (default: " + lang.commands.analyze.options.noweb.default + ")"
        )
        .option('--noresource', lang.commands.analyze.options.noresource.description, false)
        .option('--proto', lang.commands.analyze.options.proto.description)
        .action((str, options) => action(str, options, lang));
}

const action = async (str: string, options: any, lang: any) => {
    const cwd = process.cwd(); // 命令执行路径

    // 询问
    let ans = await inquirer.prompt(
        questions(lang, !!options.question), { pkg: str }
    );
    ans = { ...options, ...ans, extra: options.extra };
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

        const pkgEx = detect(pkgRoot, manager, depth);
        const desc = lang.logs['cli.ts'];
        console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));

        await new Promise((res) => setTimeout(res, 1000));

        let st = new Date().getTime();
        const depEval: DepEval = analyze(pkgRoot, manager, depth, scope, pkgEx.length);
        let ed = new Date().getTime();
        let timeCost = ed - st;
        console.log('\n' + cyan(desc.analyzed
            .replace("%len", yellowBright(depEval.analyzed.size))
            .replace("%t", yellowBright(timeString(timeCost)))
        ));

        let outEvalRes: any = {};
        // 评估分析结果并打印至控制台，该函数返回因没有被依赖而没有被分析到的包
        const unused: string[] = evaluate(depEval, pkgEx, outEvalRes); 
        let notAnalyzed = unused, { extra } = options;
        if(unused.length) {
            // 弹出询问是否需要以这些包为起点继续检测其依赖关系
            options.question && (extra = (await inquirer.prompt(extraQuestion(lang))).extra);
            if(extra) {
                console.log(cyan(desc.extraAnalyzeStart.replace("%len", yellow(notAnalyzed.length))));
                st = new Date().getTime();
                notAnalyzed = analyzeExtra(depEval, unused, pkgEx);
                ed = new Date().getTime();
                timeCost += ed - st;
                console.log('\n' + cyan(desc.analyzed
                    .replace("%len", yellowBright(depEval.analyzed.size)))
                    .replace("%t", yellowBright(timeString(timeCost)))
                );
            }
        }
        
        const { result: res, ...evalRes } = depEval;
        const sres = options.proto ? res : toDiagram(res);
        if(!Object.keys(res).length) {
            console.log(lang.logs['cli.ts'].noDependency);
            return;
        }

        if(options.console) {
            console.log(sres);
        }

        outEvalRes = {
            name: pkg,
            ...evalRes,
            detected: pkgEx.length,
            analyzed: evalRes.analyzed.size,
            coverage: evalRes.analyzed.size / pkgEx.length,
            ...outEvalRes,
            notAnalyzed
        };
        
        if(json) { // 输出JSON文件设置
            // 自动创建outputs文件夹
            if(!fs.existsSync(resolve('outputs'))) {
                fs.mkdirSync(resolve('outputs'));
            }

            // 如果json为布尔值true，则转换为目标文件路径字符串
            const evalJson = outJsonRelUri(join('outputs', 'eval-' + (json === true ? pkg : basename(json))));
            json = json === true ? outJsonRelUri(join('outputs', 'res-' + pkg)) : json;

            const buffer = Buffer.from(JSON.stringify(sres, null, options.format ? "\t" : ""));
            const bufferEval = Buffer.from(JSON.stringify(outEvalRes, null, options.format ? "\t" : ""));
            fs.writeFileSync(json, buffer);
            fs.writeFileSync(evalJson, bufferEval);
            console.log(cyan(desc.jsonSaved
                .replace('%len', yellowBright(Object.keys(sres).length))
                .replace('%s', yellowBright(relative(cwd, json)))
                .replace('%e', yellowBright(relative(cwd, evalJson)))
            ));
        }

        const outputViewJson = () => {
            const dres = options.proto ? toDiagram(res) : sres as DirectedDiagram;
            if(depth === Infinity && !extra) {
                dres.push(...unused.map(e => toDepItemWithId(e))); 
            }

            const buffer = Buffer.from(JSON.stringify(dres));
            const bufferEval = Buffer.from(JSON.stringify(outEvalRes));
            fs.writeFileSync(join(__dirname, '../express/public/res.json'), buffer);
            fs.writeFileSync(join(__dirname, '../express/public/eval.json'), bufferEval);
            if(!fs.existsSync(join(__dirname, '../view/json'))) {
                fs.mkdirSync(join(__dirname, '../view/json'));
            }
            fs.writeFileSync(join(__dirname, '../view/json/res.json'), buffer);
            fs.writeFileSync(join(__dirname, '../view/json/eval.json'), bufferEval);
        }

        if(!noweb) {
            outputViewJson();
            if(!options.noresource) {
                createResourceServer(pkgRoot, undefined, undefined, async () => {
                    run('VIEW', 'npm', ['run', 'view']);
                    await new Promise<void>(res => setTimeout(() => res(), 2000));
                    checkStartNginx();
                });
            }
        } else if(!options.noresource) {
            outputViewJson();
            createResourceServer(pkgRoot);
        }
    } catch(e: any) {
        console.error(error(lang.commons.error + ':' + e));
    }
};

function analyzeExtra(depEval: DepEval, notAnalyzed: string[], pkgList: string[]): string[] {
    const { pkgRoot, manager, depth, analyzed } = depEval;

    for(const itemStr of notAnalyzed) {
        const { id, dir } = toDepItemWithId(itemStr);
        const relDir = join(dir!, id);
        // console.log(relDir);
        analyze(pkgRoot, manager, depth, [true, false, false], pkgList.length, relDir, {
            result: depEval.result, analyzed
        });
    }

    return pkgList.filter(e => !analyzed.has(e)).sort();
}

export default analyzeCommand;
