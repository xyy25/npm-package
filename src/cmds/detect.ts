import chalk from "chalk";
import { Command } from "commander";
import { resolve } from "path";
import fs from 'fs';

import { error, publicOptions as opts, resbase } from "../cli";
import { getManagerType } from "../utils";
import detect, { detectPnpm } from "../utils/detect";
import { PackageManager } from "../utils/types";
import inquirer, { QuestionCollection } from "inquirer";

const { cyanBright, green, cyan } = chalk;

const questions = (lang: any, enable: boolean): QuestionCollection => {
    return !enable ? [] : [{
        type: 'input',
        name: 'pkgName',
        message: lang.line['input.dir'],
        validate: (input: string) => {
            if(fs.existsSync(resolve(input))) {
                return true;
            }
            return error(lang.logs['cli.ts'].dirNotExist);
        },
        default: '.'
    }, {
        type: 'list',
        name: 'manager',
        message: lang.line['input.manager'],
        when: (ans) => !ans['manager'],
        choices: ['auto', 'npm', 'yarn', 'pnpm'],
        default: 'auto'
    }, {
        type: 'number',
        name: 'depth',
        message: lang.line['input.depth'],
        when: (ans) => ans['manager'] !== 'npm',
        default: Infinity
    }]
}

function detectCommand(cmd: Command, lang: any) {
    cmd.command('detect')
        .description(lang.commands.detect.description)
        .argument('[package root]', lang.commands.detect.argument[0].description)
        .addOption(opts.manager)
        .addOption(opts.depth)
        .addOption(opts.question)
        .option('--show', lang.commands.detect.options.show.description, false)
        .action(async (str, options) => {
            const cwd = process.cwd(); // 命令执行路径
            
            // 询问
            let ans = await inquirer.prompt(
                questions(lang, !!options.question || !str), { pkgName: str }
            );
            ans = {
                ...options,
                ...ans
            }
            ans.depth ||= Infinity;

            let { pkgName, depth } = ans;
            let manager: PackageManager | 'auto' = ans.manager;

            try {
                const pkgRoot = resolve(pkgName); // 包的根目录
                pkgName = resbase(pkgName);

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
}

export default detectCommand;