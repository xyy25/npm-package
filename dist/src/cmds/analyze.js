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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const inquirer_autocomplete_prompt_1 = __importDefault(require("inquirer-autocomplete-prompt"));
const _1 = require(".");
const cli_1 = require("../cli");
const utils_1 = require("../utils");
const diagram_1 = require("../utils/diagram");
const detect_1 = __importDefault(require("../utils/detect"));
const evaluate_1 = require("../utils/evaluate");
const analyze_1 = __importStar(require("../utils/analyze"));
inquirer_1.default.registerPrompt('auto', inquirer_autocomplete_prompt_1.default);
const questions = (lang, enable) => {
    return !enable ? [] : [{
            type: 'auto',
            name: 'pkg',
            message: lang.line['input.dir'],
            prefix: String.fromCodePoint(0x1F4C1),
            suffix: ' >',
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
            type: 'number',
            name: 'depth',
            prefix: String.fromCodePoint(0x1F50D),
            message: lang.line['input.depth'],
            default: Infinity
        }, {
            type: 'list',
            name: 'manager',
            message: lang.line['input.manager'],
            prefix: String.fromCodePoint(0x1F9F0),
            choices: ['auto', 'npm', 'yarn', 'pnpm'],
            default: 'auto'
        }, {
            type: 'checkbox',
            name: 'scope',
            message: lang.line['input.scope'],
            prefix: String.fromCodePoint(0x1F4C7),
            choices: [
                { name: 'norm', checked: true },
                { name: 'dev', checked: true },
                { name: 'peer', checked: true }
            ],
            filter: (input) => __awaiter(void 0, void 0, void 0, function* () {
                return [
                    input.includes('norm'),
                    input.includes('dev'),
                    input.includes('peer')
                ];
            }),
            validate: (input) => input.some((e) => e)
        }, {
            type: 'confirm',
            name: 'json',
            message: lang.line['input.outJson'],
            prefix: String.fromCodePoint(0x1F4C4),
            default: false
        }, {
            type: 'input',
            name: 'json',
            message: lang.line['input.outJsonDir'],
            prefix: String.fromCodePoint(0x1F4DD),
            askAnswered: true,
            when: (ans) => ans['json'],
            default: (ans) => (0, path_1.join)('outputs', 'res-' + (0, _1.resbase)(ans['pkg'])),
            filter: (input) => (0, _1.outJsonRelUri)(input),
        }, {
            type: 'number',
            name: 'port',
            message: lang.line['input.port'],
            prefix: String.fromCodePoint(0x1F4E8),
            askAnswered: true,
            when: (ans) => !ans['json'],
            validate: (input) => {
                if (input <= 0 || input > 65536) {
                    return (0, cli_1.error)(lang.logs['cli.ts'].portInvalid);
                }
                return true;
            },
            default: 5500
        }];
};
const extraQuestion = (lang) => ({
    type: "confirm",
    name: "extra",
    suffix: " >",
    message: (0, analyze_1.orange)(lang.line['input.extraAnalyze']),
    default: true
});
function analyzeCommand(cmd, lang) {
    cmd.command('analyze').description(lang.commands.analyze.description)
        .argument('[package root]', lang.commands.analyze.argument[0].description)
        .addOption(cli_1.publicOptions.manager)
        .addOption(cli_1.publicOptions.scope)
        .addOption(cli_1.publicOptions.depth)
        .addOption(cli_1.publicOptions.json)
        .addOption(cli_1.publicOptions.pretty)
        .addOption(cli_1.publicOptions.question)
        .addOption(cli_1.publicOptions.host)
        .addOption(cli_1.publicOptions.port)
        .option('-e, --extra', lang.commands.analyze.options.extra.description, false)
        .option('-c, --console, --print', lang.commands.analyze.options.console.description)
        .option('-i, --noweb', lang.commands.analyze.options.noweb.description)
        .option('--proto', lang.commands.analyze.options.proto.description)
        .action((str, options) => action(str, options, lang));
}
const action = (str, options, lang) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const cwd = process.cwd(); // 命令执行路径
    // 询问
    let ans = yield inquirer_1.default.prompt(questions(lang, !!options.question), { pkg: str });
    ans = Object.assign(Object.assign(Object.assign({}, options), ans), { extra: options.extra });
    ans.noweb = (_a = ans.noweb) !== null && _a !== void 0 ? _a : !!ans.json;
    ans.depth !== 0 && (ans.depth || (ans.depth = Infinity));
    (_b = ans.pkg) !== null && _b !== void 0 ? _b : (ans.pkg = '.');
    let { pkg, depth, noweb, host, port, scope } = ans;
    let json = ans.json;
    let manager = ans.manager;
    const pkgRoot = (0, path_1.resolve)(pkg); // 包根目录的绝对路径
    pkg = (0, _1.resbase)(pkg); // 包的名称，如果缺省则为本目录
    console.log(ans);
    try {
        if (!fs_1.default.existsSync(pkgRoot)) { // 目录不存在
            throw lang.logs['cli.ts'].dirNotExist;
        }
        const pkgJson = (0, utils_1.readPackageJson)((0, path_1.join)(pkgRoot, 'package.json'));
        if (!pkgJson) { // package.json不存在
            throw lang.logs['cli.ts'].pkgJsonNotExist.replace('%s', pkgRoot);
        }
        if (manager === 'auto') {
            manager = (0, utils_1.getManagerType)(pkgRoot);
        }
        const pkgEx = (0, detect_1.default)(pkgRoot, manager, depth);
        const desc = lang.logs['cli.ts'];
        console.log((0, chalk_1.cyan)(desc.detected.replace("%s", (0, chalk_1.yellow)(pkgEx.length))));
        yield new Promise((res) => setTimeout(res, 1000));
        const depEval = (0, analyze_1.default)(pkgRoot, manager, depth, scope[0], scope[1], scope[2], pkgEx.length);
        console.log('\n' + (0, chalk_1.cyan)(desc.analyzed.replace("%len", (0, chalk_1.yellowBright)(depEval.analyzed.size))));
        let outEvalRes = {};
        // 评估分析结果并打印至控制台，该函数返回因没有被依赖而没有被分析到的包
        const unused = (0, evaluate_1.evaluate)(depEval, pkgEx, outEvalRes);
        let notAnalyzed = unused;
        // 弹出询问是否需要以这些包为起点继续检测其依赖关系
        const extra = options.question ? yield inquirer_1.default.prompt(extraQuestion(lang)) : options.extra;
        if (unused.length && extra) {
            notAnalyzed = analyzeExtra(depEval, unused, pkgEx, desc);
        }
        const { result: res } = depEval, evalRes = __rest(depEval, ["result"]);
        const sres = options.proto ? res : (0, diagram_1.toDiagram)(res);
        if (!Object.keys(res).length) {
            console.log(lang.logs['cli.ts'].noDependency);
            return;
        }
        if (options.console) {
            console.log(sres);
        }
        outEvalRes = Object.assign(Object.assign(Object.assign(Object.assign({ name: pkg }, evalRes), { detected: pkgEx.length, analyzed: evalRes.analyzed.size, coverage: evalRes.analyzed.size / pkgEx.length }), outEvalRes), { notAnalyzed });
        if (json) { // 输出JSON文件设置
            // 自动创建outputs文件夹
            if (!fs_1.default.existsSync((0, path_1.resolve)('outputs'))) {
                fs_1.default.mkdirSync((0, path_1.resolve)('outputs'));
            }
            // 如果json为布尔值true，则转换为目标文件路径字符串
            const evalJson = (0, _1.outJsonRelUri)((0, path_1.join)('outputs', 'eval-' + (json === true ? pkg : (0, path_1.basename)(json))));
            json = json === true ? (0, _1.outJsonRelUri)((0, path_1.join)('outputs', 'res-' + pkg)) : json;
            const buffer = Buffer.from(JSON.stringify(sres, null, options.format ? "\t" : ""));
            const bufferEval = Buffer.from(JSON.stringify(outEvalRes, null, options.format ? "\t" : ""));
            fs_1.default.writeFileSync(json, buffer);
            fs_1.default.writeFileSync(evalJson, bufferEval);
            console.log((0, chalk_1.cyan)(desc.jsonSaved
                .replace('%len', (0, chalk_1.yellowBright)(Object.keys(sres).length))
                .replace('%s', (0, chalk_1.yellowBright)((0, path_1.relative)(cwd, json)))
                .replace('%e', (0, chalk_1.yellowBright)((0, path_1.relative)(cwd, evalJson)))));
        }
        if (!noweb) {
            const dres = options.proto ? (0, diagram_1.toDiagram)(res) : sres;
            if (depth === Infinity && !extra) {
                dres.push(...unused.map(e => (0, utils_1.toDepItemWithId)(e)));
            }
            const buffer = Buffer.from(JSON.stringify(dres));
            const bufferEval = Buffer.from(JSON.stringify(outEvalRes));
            fs_1.default.writeFileSync((0, path_1.join)(__dirname, '../express/public/res.json'), buffer);
            fs_1.default.writeFileSync((0, path_1.join)(__dirname, '../express/public/eval.json'), bufferEval);
            (yield Promise.resolve().then(() => __importStar(require('../express')))).default(port, host);
        }
    }
    catch (e) {
        console.error((0, cli_1.error)(lang.commons.error + ':' + e));
    }
});
function analyzeExtra(depEval, notAnalyzed, pkgList, desc) {
    const { pkgRoot, manager, depth, analyzed } = depEval;
    console.log((0, chalk_1.cyan)(desc.extraAnalyzeStart.replace("%len", (0, chalk_1.yellow)(notAnalyzed.length))));
    for (const itemStr of notAnalyzed) {
        const { id, dir } = (0, utils_1.toDepItemWithId)(itemStr);
        const relDir = (0, path_1.join)(dir, id);
        // console.log(relDir);
        (0, analyze_1.default)(pkgRoot, manager, depth, true, false, false, pkgList.length, relDir, {
            result: depEval.result, analyzed
        });
    }
    console.log('\n' + (0, chalk_1.cyan)(desc.analyzed.replace("%len", (0, chalk_1.yellowBright)(depEval.analyzed.size))));
    return pkgList.filter(e => !analyzed.has(e)).sort();
}
exports.default = analyzeCommand;
