import chalk from "chalk";
import { Command } from "commander";
import { resolve } from "path";
import fs from 'fs';
import inquirer, { QuestionCollection } from "inquirer";
import inquirerAuto from "inquirer-autocomplete-prompt";

import { error, publicOptions as opts } from "../cli";
import { getDirs, resbase } from '.';
import { getManagerType } from "../utils";
import detect, { detectPnpm } from "../utils/detect";
import { PackageManager } from "../utils/types";
import { printItemStrs } from "../utils/evaluate";

const { cyanBright, green, cyan } = chalk;

inquirer.registerPrompt('auto', inquirerAuto);

const questions = (lang: any, enable: boolean): QuestionCollection => {
    return !enable ? [] : [{
        type: 'auto',
        name: 'pkg',
        message: lang.line['input.dir'],
        prefix: String.fromCodePoint(0x1F4C1), // 📁
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
        type: 'list',
        name: 'manager',
        message: lang.line['input.manager'],
        prefix: String.fromCodePoint(0x1F9F0), // 🧰
        when: (ans) => !ans['manager'],
        choices: ['auto', 'npm', 'yarn', 'pnpm'],
        default: 'auto'
    }, {
        type: 'number',
        name: 'depth',
        message: lang.line['input.depth'],
        prefix: String.fromCodePoint(0x1F50D), // 🔍
        when: (ans) => ans['manager'] !== 'pnpm',
        default: Infinity
    }];
}

function detectCommand(cmd: Command, lang: any) {
    cmd.command('detect')
        .description(lang.commands.detect.description)
        .argument('[package root]', lang.commands.detect.argument[0].description)
        .addOption(opts.manager)
        .addOption(opts.depth)
        .addOption(opts.question)
        .option('-r, --raw', lang.commands.detect.options.raw.description, false)
        .option('-c, --count', lang.commands.detect.options.count.description, false)
        .action(async (str, options) => {    
            // 询问
            let ans = await inquirer.prompt(
                questions(lang, !!options.question), { pkg: str }
            );
            ans = { ...options, ...ans };
            ans.depth ||= Infinity;
            ans.pkg ??= '.';

            let { pkg, depth } = ans;
            let manager: PackageManager | 'auto' = ans.manager;

            const pkgRoot = resolve(pkg); // 包根目录的绝对路径
            pkg = resbase(pkg);

            console.log(ans);

            try {
                const dirEx = fs.existsSync(pkgRoot);
                if(!dirEx) {
                    throw lang.logs['cli.ts'].dirNotExist;
                }

                if(manager === 'auto') {
                    manager = getManagerType(pkgRoot);
                }

                let res: string[] | [string, string[]][] = [];
                
                if(manager === 'pnpm') {
                    res = detectPnpm(pkgRoot);
                    if(!options.count && options.raw) {
                        res.forEach(([o, l]) => {
                            console.log('*', cyanBright(o));
                            l.forEach(e => console.log(' ->', green(e)));
                        });
                    }
                } else {
                    res = detect(pkgRoot, manager, depth);
                    if(!options.count && options.raw) 
                        res.forEach(e => console.log('-', green(e)));
                }
                if(!options.count && !options.raw) printItemStrs(res);
                console.log(cyan(lang.logs["cli.ts"].detectPkg), res.length);
            } catch (e) {
                console.error(error(lang.commons.error + ':', e));
            }
        });
}

export default detectCommand;