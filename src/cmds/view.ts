import { Command } from 'commander';
import { error } from 'console';
import { resolve, join } from 'path';
import fs from 'fs';
import inquirer, { QuestionCollection } from 'inquirer';
import inquirerAuto from "inquirer-autocomplete-prompt";

import { publicOptions as opts } from '../cli';
import { getFiles } from '.';

inquirer.registerPrompt('auto', inquirerAuto);

const questions = (lang: any, enable: boolean): QuestionCollection => {
    return !enable ? [] : [{
        type: 'auto',
        name: 'fileName',
        message: lang.line['input.jsonFile'],
        prefix: String.fromCodePoint(0x1F4D1), // 📑
        when: (ans) => ans['fileName'] === undefined,
        filter: (input) => input.endsWith('.json') ? input : input + '.json',
        searchText: lang.line['status.searching'],
        emptyText:  lang.line['status.noResult'],
        source: (ans: any, input: string) => 
            getFiles(ans, input, 1, (file) => fs.lstatSync(file).isFile() && file.endsWith('.json')),
        default: '.',
        validate: (input: any) => {
            if(input?.value && fs.existsSync(resolve(input.value))) {
                return true;
            }
            return error(lang.logs['cli.ts'].dirNotExist);
        }
    }, {
        type: 'number',
        name: 'port',
        message: lang.line['input.port'],
        prefix: String.fromCodePoint(0x1F4E8), // 📨
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

function viewCommand(cmd: Command, lang: any) {
    cmd.command("view")
        .alias("show")
        .description(lang.commands.view.description)
        .argument('[JSON uri]', lang.commands.view.argument[0].description)
        .addOption(opts.host)
        .addOption(opts.port)
        .action(async (str, options) => {
            let ans = await inquirer.prompt(
                questions(lang, true), { fileName: str }
            );
            ans = { ...options, ...ans };
            let { fileName, host, port } = ans;

            try {
                if(!fileName.endsWith('.json')) {
                    fileName += '.json';
                }
                const uri = resolve(fileName);
                if(!fs.existsSync(uri) || !fs.lstatSync(uri).isFile()) {
                    throw lang.logs['cli.ts'].fileNotExist;
                }

                fs.cpSync(uri, join(__dirname, '../express/public/res.json'), { force: true });
                
                (await import('../express')).default(port, host);

            } catch (e) {
                console.error(error(lang.commons.error + ': ' + e));
            }
        })
}

export default viewCommand;
