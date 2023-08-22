"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const inquirer_autocomplete_prompt_1 = __importDefault(require("inquirer-autocomplete-prompt"));
const cli_1 = require("../cli");
const _1 = require(".");
inquirer_1.default.registerPrompt('auto', inquirer_autocomplete_prompt_1.default);
const questions = (lang, enable) => {
    return !enable ? [] : [{
            type: 'auto',
            name: 'fileName',
            message: lang.line['input.jsonFile'],
            prefix: String.fromCodePoint(0x1F4D1),
            when: (ans) => ans['fileName'] === undefined,
            filter: (input) => input.endsWith('.json') ? input : input + '.json',
            searchText: lang.line['status.searching'],
            emptyText: lang.line['status.noResult'],
            source: (ans, input) => (0, _1.getFiles)(ans, input, 1, (file) => fs_1.default.lstatSync(file).isFile() && file.endsWith('.json')),
            default: '.',
            validate: (input) => {
                if ((input === null || input === void 0 ? void 0 : input.value) && fs_1.default.existsSync((0, path_1.resolve)(input.value))) {
                    return true;
                }
                return (0, console_1.error)(lang.logs['cli.ts'].dirNotExist);
            }
        }, {
            type: 'number',
            name: 'port',
            message: lang.line['input.port'],
            prefix: String.fromCodePoint(0x1F4E8),
            when: (ans) => !ans['json'],
            validate: (input) => {
                if (input <= 0 || input > 65536) {
                    return (0, console_1.error)(lang.logs['cli.ts'].portInvalid);
                }
                return true;
            },
            default: 5500
        }];
};
function viewCommand(cmd, lang) {
    cmd.command("view")
        .alias("show")
        .description(lang.commands.view.description)
        .argument('[JSON uri]', lang.commands.view.argument[0].description)
        .addOption(cli_1.publicOptions.host)
        .addOption(cli_1.publicOptions.port)
        .action((str, options) => __awaiter(this, void 0, void 0, function* () {
        let ans = yield inquirer_1.default.prompt(questions(lang, true), { fileName: str });
        ans = Object.assign(Object.assign({}, options), ans);
        let { fileName, host, port } = ans;
        try {
            if (!fileName.endsWith('.json')) {
                fileName += '.json';
            }
            const uri = (0, path_1.resolve)(fileName);
            if (!fs_1.default.existsSync(uri) || !fs_1.default.lstatSync(uri).isFile()) {
                throw lang.logs['cli.ts'].fileNotExist;
            }
            fs_1.default.cpSync(uri, (0, path_1.join)(__dirname, '../express/public/res.json'), { force: true });
            (yield Promise.resolve().then(() => __importStar(require('../express')))).default(port, host);
        }
        catch (e) {
            console.error((0, console_1.error)(lang.commons.error + ': ' + e));
        }
    }));
}
exports.default = viewCommand;
