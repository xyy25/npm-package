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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importStar(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const npmUtils_1 = require("./utils/npmUtils");
const analyze_1 = __importDefault(require("./utils/analyze"));
const recurUtils_1 = require("./utils/recurUtils");
const detect_1 = __importStar(require("./utils/detect"));
const readline_1 = __importDefault(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const zh_CN_json_1 = __importDefault(require("./lang/zh-CN.json"));
const { cyan, cyanBright, green, yellow, yellowBright } = chalk_1.default;
const error = chalk_1.default.bgBlack.bold.red;
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
const readInput = (prompt, inputDesc = '', def = '') => __awaiter(void 0, void 0, void 0, function* () {
    if (inputDesc || def) {
        prompt += ' (';
        inputDesc && (prompt += inputDesc + (def && ', '));
        def && (prompt += `${zh_CN_json_1.default.line.default}: ${def}`);
        prompt += ')';
    }
    rl.setPrompt(prompt + cyan('> '));
    rl.prompt();
    return yield new Promise(res => rl.on('line', (line) => res(line || def)));
});
const cmd = new commander_1.Command();
cmd.name('npmpkg-cli')
    .description(zh_CN_json_1.default.description)
    .version('0.0.1', undefined, zh_CN_json_1.default.version)
    .addHelpCommand(true, (_a = zh_CN_json_1.default.commands.help) === null || _a === void 0 ? void 0 : _a.description)
    .showSuggestionAfterError(true);
const managerOption = new commander_1.Option('-m, --manager <packageManager>', zh_CN_json_1.default.commands.analyze.options.manager.description)
    .choices(['auto', 'npm', 'yarn', 'pnpm'])
    .default('auto');
const scopeOption = new commander_1.Option('-s, --scope <scope>', zh_CN_json_1.default.commands.analyze.options.scope.description)
    .choices(['all', 'norm', 'peer', 'dev'])
    .default('all');
const depthOption = new commander_1.Option('-d, --depth <depth>', zh_CN_json_1.default.commands.analyze.options.depth.description)
    .default(NaN, zh_CN_json_1.default.commands.analyze.options.depth.default);
const jsonOption = new commander_1.Option('-j, --json [fileName]', zh_CN_json_1.default.commands.analyze.options.json.description);
const jsonPrettyOption = new commander_1.Option('--pretty, --format', zh_CN_json_1.default.commands.analyze.options.format.description);
const defaultOption = new commander_1.Option('-y, --default', zh_CN_json_1.default.commands.analyze.options.default.description)
    .default(false);
cmd.command('analyze').description(zh_CN_json_1.default.commands.analyze.description)
    .argument('[package root]', zh_CN_json_1.default.commands.analyze.argument[0].description)
    .addOption(managerOption)
    .addOption(scopeOption)
    .addOption(depthOption)
    .addOption(jsonOption)
    .addOption(jsonPrettyOption)
    .addOption(defaultOption)
    .option('-c, --console, --print', zh_CN_json_1.default.commands.analyze.options.console.description)
    .option('-i, --noweb', zh_CN_json_1.default.commands.analyze.options.noweb.description)
    .option('-h, --host', zh_CN_json_1.default.commands.analyze.options.host.description)
    .option('-p, --port', zh_CN_json_1.default.commands.analyze.options.port.description)
    .option('--proto', zh_CN_json_1.default.commands.analyze.options.proto.description)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    const cwd = process.cwd(); // 命令执行路径
    let { depth, noweb, default: def, host, port } = options; // 最大深度设置，默认为Infinity
    let json = options.json;
    let manager = options.manager;
    // 询问
    while (!str) {
        str = yield readInput(zh_CN_json_1.default.line['input.dir']);
        if (str === '.exit') {
            rl.close();
            return;
        }
        if (!fs_1.default.existsSync((0, path_1.join)(cwd, str))) {
            console.error(error(zh_CN_json_1.default.logs['cli.ts'].dirNotExist));
            str = undefined;
        }
    }
    const defOutFileName = (0, path_1.join)('outputs', `res-${path_1.default.basename((0, path_1.join)(cwd, str))}.json`);
    if (!def) { // 如果不设置使用默认设置-y，则询问一些问题
        if (Number.isNaN(depth)) {
            depth = parseInt(yield readInput(zh_CN_json_1.default.line['input.depth'], '', 'Infinity')) || Infinity;
        }
        if (json === undefined) {
            const input = yield readInput(zh_CN_json_1.default.line['input.outJson'], 'y/n', 'n');
            json = input === 'y';
            if (json) {
                json = (yield readInput(zh_CN_json_1.default.line['input.outJsonDir'], '', defOutFileName)) || true;
                if (noweb === undefined) { // 输出json则默认不打开网页
                    noweb = true;
                }
            }
            else if (!noweb) {
                port = port !== null && port !== void 0 ? port : parseInt(yield readInput(zh_CN_json_1.default.line['input.port'], '', '5500'));
                host = host !== null && host !== void 0 ? host : '127.0.0.1';
            }
        }
    }
    noweb !== null && noweb !== void 0 ? noweb : (noweb = json);
    depth || (depth = Infinity);
    rl.close();
    const pkgRoot = (0, path_1.join)(cwd, str); // 包的根目录
    try {
        if (!fs_1.default.existsSync(pkgRoot)) { // 目录不存在
            throw zh_CN_json_1.default.logs['cli.ts'].dirNotExist;
        }
        const pkgJson = (0, utils_1.readPackageJson)((0, path_1.join)(pkgRoot, 'package.json'));
        if (!pkgJson) { // package.json不存在
            throw zh_CN_json_1.default.logs['cli.ts'].pkgJsonNotExist.replace('%s', str);
        }
        if (manager === 'auto') {
            manager = (0, utils_1.getManagerType)(pkgRoot);
        }
        const pkgEx = (0, detect_1.default)(pkgRoot, manager, depth);
        const desc = zh_CN_json_1.default.logs['cli.ts'];
        console.log(cyan(desc.detected.replace("%s", yellow(pkgEx.length))));
        yield new Promise((res) => setTimeout(res, 1000));
        const { scope } = options;
        const scopes = scope === 'norm' ? [true, false, false] :
            scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true];
        console.log(pkgRoot, scopes, manager, depth);
        const depEval = (0, analyze_1.default)(pkgRoot, manager, depth, scopes[0], scopes[1], scopes[2], pkgEx.length);
        // 评估分析结果并打印至控制台，该函数返回没有被依赖的包
        const notRequired = (0, recurUtils_1.evaluate)(depEval, pkgEx);
        let res = depEval.result;
        if (!options.proto) {
            res = (0, utils_1.toDiagram)(res, pkgRoot, pkgJson);
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
        if (!fs_1.default.existsSync((0, path_1.join)(cwd, 'outputs'))) {
            fs_1.default.mkdirSync((0, path_1.join)(cwd, 'outputs'));
        }
        if (json) { // 输出JSON文件设置
            // 自动创建outputs文件夹
            let outFileName = json === true ? defOutFileName : json;
            if (!outFileName.endsWith('.json')) {
                outFileName += '.json';
            }
            const outFileUri = (0, path_1.join)(cwd, outFileName);
            fs_1.default.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res, null, options.format ? "\t" : "")));
            console.log(cyan(desc.jsonSaved.replace('%s', yellowBright(outFileName))));
        }
        if (!noweb) {
            if (options.proto)
                res = (0, utils_1.toDiagram)(res, pkgRoot, pkgJson);
            const buffer = Buffer.from(JSON.stringify(res));
            fs_1.default.writeFileSync((0, path_1.join)(__dirname, 'express/public/res.json'), buffer);
            (yield Promise.resolve().then(() => __importStar(require('./express')))).default(port, host);
        }
    }
    catch (e) {
        console.error(error(zh_CN_json_1.default.commons.error + ':' + e));
    }
}));
cmd.command('detect')
    .description(zh_CN_json_1.default.commands.detect.description)
    .argument('[package root]', zh_CN_json_1.default.commands.detect.argument[0].description)
    .addOption(managerOption)
    .addOption(depthOption)
    .addOption(defaultOption)
    .option('--show', zh_CN_json_1.default.commands.detect.options.show.description, false)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    const cwd = process.cwd(); // 命令执行路径
    let { depth, default: def } = options;
    let manager = options.manager;
    depth = parseInt(depth);
    try {
        // 询问
        if (!str) {
            str = yield readInput(zh_CN_json_1.default.line['input.dir']);
        }
        const pkgRoot = (0, path_1.join)(cwd, str); // 包的根目录
        const dirEx = fs_1.default.existsSync(pkgRoot);
        if (!dirEx) {
            throw zh_CN_json_1.default.logs['cli.ts'].dirNotExist;
        }
        if (manager === 'auto') {
            manager = (0, utils_1.getManagerType)(pkgRoot);
        }
        if (manager !== 'pnpm' && !def) {
            depth = parseInt(yield readInput(zh_CN_json_1.default.line['input.depth'], '', 'Infinity')) || Infinity;
        }
        rl.close();
        depth || (depth = Infinity);
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
        console.log(cyan(zh_CN_json_1.default.logs["cli.ts"].detectPkg), res.length);
    }
    catch (e) {
        console.error(error(zh_CN_json_1.default.commons.error + ':', e));
    }
}));
cmd.command('get')
    .description(zh_CN_json_1.default.commands.get.description)
    .argument('[package name]', zh_CN_json_1.default.commands.get.argument[0].description)
    .option('-v, --version <string>', zh_CN_json_1.default.commands.get.options.version.description)
    .option('-a, --all', zh_CN_json_1.default.commands.get.options.all.description)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const res = yield (0, npmUtils_1.getPackage)(str, (_b = options.version) !== null && _b !== void 0 ? _b : '*', !!options.all);
    // 询问
    if (!str) {
        str = yield readInput(zh_CN_json_1.default.line['input.name']);
    }
    rl.close();
    console.log(res);
}));
cmd.parse();
