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
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const npmUtils_1 = require("./utils/npmUtils");
const recur_1 = __importStar(require("./utils/recur"));
const chalk_1 = __importDefault(require("chalk"));
const zh_CN_json_1 = __importDefault(require("./lang/zh-CN.json"));
const { cyan, green, yellow, yellowBright } = chalk_1.default;
const error = chalk_1.default.bgBlack.bold.red;
const cmd = new commander_1.Command();
cmd.name('npmpkg-cli')
    .description(zh_CN_json_1.default.description)
    .version('0.0.1');
const scopeOption = new commander_1.Option('-s, --scope <scope>', zh_CN_json_1.default.commands.analyze.options.scope.description)
    .choices(['all', 'norm', 'peer', 'dev'])
    .default('all');
const depthOption = new commander_1.Option('-d, --depth <depth>', zh_CN_json_1.default.commands.analyze.options.depth.description)
    .default(Infinity, zh_CN_json_1.default.commands.analyze.options.depth.default)
    .argParser((value) => { const r = parseInt(value); return Number.isNaN(r) ? Infinity : r; });
const jsonOption = new commander_1.Option('-j, --json [fileName]', zh_CN_json_1.default.commands.analyze.options.json.description);
const jsonPrettyOption = new commander_1.Option('--pretty, --format', zh_CN_json_1.default.commands.analyze.options.format.description);
cmd.command('analyze').description(zh_CN_json_1.default.commands.analyze.description)
    .argument('<string>', zh_CN_json_1.default.commands.analyze.argument[0].description)
    .addOption(scopeOption)
    .addOption(depthOption)
    .addOption(jsonOption)
    .addOption(jsonPrettyOption)
    .option('-c, --console, --print', zh_CN_json_1.default.commands.analyze.options.console.description)
    .option('--diagram', zh_CN_json_1.default.commands.analyze.options.diagram.description)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    const cwd = process.cwd(); // 命令执行路径
    const pkgRoot = path_1.default.join(cwd, str); // 包的根目录
    const { depth } = options; // 最大深度设置，默认为Infinity
    try {
        if (!fs_1.default.existsSync(pkgRoot)) { // 目录不存在
            console.error(error(zh_CN_json_1.default.commons.error + ':', zh_CN_json_1.default.logs['cli.ts'].dirNotExist));
            return;
        }
        const pkgJson = (0, utils_1.readPackageJson)(path_1.default.join(pkgRoot, 'package.json'));
        if (!pkgJson) { // package.json不存在
            console.error(error(zh_CN_json_1.default.commons.error + ":", zh_CN_json_1.default.logs['cli.ts'].pkgJsonNotExist.replace('%s', str)));
            return;
        }
        const pkgEx = (0, recur_1.detect)(pkgRoot, depth);
        const desc = zh_CN_json_1.default.logs['cli.ts'];
        console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));
        yield new Promise((res) => setTimeout(res, 1000));
        const { scope } = options;
        const scopes = scope === 'norm' ? [true, false, false] :
            scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true];
        console.log(pkgRoot, scopes, depth);
        const depEval = (0, recur_1.default)(pkgRoot, depth, scopes[0], scopes[1], scopes[2], pkgEx.length);
        // 评估分析结果并打印至控制台，该函数返回没有被依赖的包
        const notRequired = (0, recur_1.evaluate)(depEval, pkgEx);
        let res = depEval.result;
        if (options.diagram) {
            res = (0, utils_1.toDiagram)(res, pkgJson);
            // 如果未设置最大深度，有向图结构会自动附加上存在于node_modules中但没有被依赖覆盖到的包
            if (depth === Infinity) {
                res.push(...notRequired.map(e => (0, utils_1.toDepItemWithId)(e)));
            }
        }
        if (!Object.keys(res).length) {
            console.log(zh_CN_json_1.default.logs['cli.ts'].noDependency);
            return;
        }
        if (options.console) {
            console.log(res);
        }
        if (!fs_1.default.existsSync(path_1.default.join(cwd, 'outputs'))) {
            fs_1.default.mkdirSync(path_1.default.join(cwd, 'outputs'));
        }
        if (options.json) { // 输出JSON文件设置
            // 自动创建outputs文件夹
            let outFileName = options.json === true ?
                path_1.default.join('outputs', 'res-' + pkgJson.name) : options.json;
            if (!outFileName.endsWith('.json')) {
                outFileName += '.json';
            }
            const outFileUri = path_1.default.join(cwd, outFileName);
            fs_1.default.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
            console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(outFileName))));
        }
        else {
            if (!options.diagram)
                res = (0, utils_1.toDiagram)(res, pkgJson);
            fs_1.default.writeFileSync(path_1.default.join(__dirname, 'public', 'res.json'), Buffer.from(JSON.stringify(res)));
            yield Promise.resolve().then(() => __importStar(require('./express')));
        }
    }
    catch (e) {
        console.error(e);
    }
}));
cmd.command('detect')
    .description(zh_CN_json_1.default.commands.detect.description)
    .argument('<string>', zh_CN_json_1.default.commands.detect.argument[0].description)
    .addOption(depthOption)
    .option('--show', zh_CN_json_1.default.commands.detect.options.show.description, false)
    .action((str, options) => {
    const cwd = process.cwd(); // 命令执行路径
    const pkgRoot = path_1.default.join(cwd, str); // 包的根目录
    const { depth } = options;
    try {
        const dirEx = fs_1.default.existsSync(pkgRoot);
        if (!dirEx) {
            console.error(error(zh_CN_json_1.default.commons.error + ':', zh_CN_json_1.default.logs['cli.ts'].dirNotExist));
            return;
        }
        const res = (0, recur_1.detect)(pkgRoot, depth);
        if (options.show) {
            res.forEach(e => console.log('-', green(e)));
        }
        console.log(cyan(zh_CN_json_1.default.logs["cli.ts"].detectPkg), res.length);
    }
    catch (e) {
        console.error(e);
    }
});
cmd.command('get')
    .description(zh_CN_json_1.default.commands.get.description)
    .argument('<string>', zh_CN_json_1.default.commands.get.argument[0].description)
    .option('-v, --version <string>', zh_CN_json_1.default.commands.get.options.version.description)
    .option('-a, --all', zh_CN_json_1.default.commands.get.options.all.description)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const res = yield (0, npmUtils_1.getPackage)(str, (_a = options.version) !== null && _a !== void 0 ? _a : '*', !!options.all);
    console.log(res);
}));
cmd.parse();
