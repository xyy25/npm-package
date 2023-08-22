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
const chalk_1 = __importDefault(require("chalk"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const inquirer_autocomplete_prompt_1 = __importDefault(require("inquirer-autocomplete-prompt"));
const cli_1 = require("../cli");
const _1 = require(".");
const utils_1 = require("../utils");
const detect_1 = __importStar(require("../utils/detect"));
const { cyanBright, green, cyan } = chalk_1.default;
inquirer_1.default.registerPrompt('auto', inquirer_autocomplete_prompt_1.default);
const questions = (lang, enable) => {
    return !enable ? [] : [{
            type: 'auto',
            name: 'pkg',
            message: lang.line['input.dir'],
            prefix: String.fromCodePoint(0x1F4C1),
            searchText: lang.line['status.searching'],
            emptyText: lang.line['status.noResult'],
            source: _1.getDirs,
            default: '.',
            validate: (input) => {
                if ((input === null || input === void 0 ? void 0 : input.value) && fs_1.default.existsSync((0, path_1.resolve)(input.value))) {
                    return true;
                }
                return (0, cli_1.error)(lang.logs['cli.ts'].dirNotExist);
            }
        }, {
            type: 'list',
            name: 'manager',
            message: lang.line['input.manager'],
            prefix: String.fromCodePoint(0x1F9F0),
            when: (ans) => !ans['manager'],
            choices: ['auto', 'npm', 'yarn', 'pnpm'],
            default: 'auto'
        }, {
            type: 'number',
            name: 'depth',
            message: lang.line['input.depth'],
            prefix: String.fromCodePoint(0x1F50D),
            when: (ans) => ans['manager'] !== 'pnpm',
            default: Infinity
        }];
};
function detectCommand(cmd, lang) {
    cmd.command('detect')
        .description(lang.commands.detect.description)
        .argument('[package root]', lang.commands.detect.argument[0].description)
        .addOption(cli_1.publicOptions.manager)
        .addOption(cli_1.publicOptions.depth)
        .addOption(cli_1.publicOptions.question)
        .option('--show', lang.commands.detect.options.show.description, false)
        .action((str, options) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        // 询问
        let ans = yield inquirer_1.default.prompt(questions(lang, !!options.question), { pkg: str });
        ans = Object.assign(Object.assign({}, options), ans);
        ans.depth || (ans.depth = Infinity);
        (_a = ans.pkg) !== null && _a !== void 0 ? _a : (ans.pkg = '.');
        let { pkg, depth } = ans;
        let manager = ans.manager;
        const pkgRoot = (0, path_1.resolve)(pkg); // 包根目录的绝对路径
        pkg = (0, _1.resbase)(pkg);
        console.log(ans);
        try {
            const dirEx = fs_1.default.existsSync(pkgRoot);
            if (!dirEx) {
                throw lang.logs['cli.ts'].dirNotExist;
            }
            if (manager === 'auto') {
                manager = (0, utils_1.getManagerType)(pkgRoot);
            }
            let res = [];
            if (manager === 'pnpm') {
                res = (0, detect_1.detectPnpm)(pkgRoot);
                options.show && res.forEach(([o, l]) => {
                    console.log('*', cyanBright(o));
                    l.forEach(e => console.log(' ->', green(e)));
                });
            }
            else {
                res = (0, detect_1.default)(pkgRoot, manager, depth);
                options.show && res.forEach(e => console.log('-', green(e)));
            }
            console.log(cyan(lang.logs["cli.ts"].detectPkg), res.length);
        }
        catch (e) {
            console.error((0, cli_1.error)(lang.commons.error + ':', e));
        }
    }));
}
exports.default = detectCommand;
