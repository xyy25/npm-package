import { Command } from 'commander';
import { error } from 'console';
import { resolve, join } from 'path';
import fs from 'fs';

import { getFiles, publicOptions as opts } from '../cli';
import inquirer, { QuestionCollection } from 'inquirer';
import inquirerAuto from "inquirer-autocomplete-prompt";

inquirer.registerPrompt('auto', inquirerAuto);

const questions = (lang: any, enable: boolean): QuestionCollection => {
    return !enable ? [] : [{
        type: 'auto',
        name: 'fileName',
        message: lang.line['input.jsonFile'],
        when: (ans) => ans['fileName'] === undefined,
        filter: (input) => input.endsWith('.json') ? input : input + '.json',
        searchText: lang.line['status.searching'],
        emptyText:  lang.line['status.noResult'],
        source: (ans: any, input: string) => 
            getFiles(ans, input, (file) => fs.lstatSync(file).isFile() && file.endsWith('.json')),
        default: '.',
        validate: (input: any) => {
            if(input?.value && fs.existsSync(resolve(input.value))) {
                return true;
            }
            return error(lang.logs['cli.ts'].dirNotExist);
        }
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
            let { fileName } = ans;

            try {
                if(!fileName.endsWith('.json')) {
                    fileName += '.json';
                }
                const uri = resolve(fileName);
                if(!fs.existsSync(uri) || !fs.lstatSync(uri).isFile()) {
                    throw lang.logs['cli.ts'].fileNotExist;
                }

                fs.cpSync(uri, join(__dirname, 'express/public/res.json'), { force: true });
                
                const { port, host } = options;
                (await import('../express')).default(port, host);

            } catch (e) {
                console.error(error(lang.commons.error + ': ' + e));
            }
        })
}

export default viewCommand;