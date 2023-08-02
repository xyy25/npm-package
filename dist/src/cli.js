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
const cmd = new commander_1.Command();
cmd.name('npmpkg-cli')
    .description('NPM Package Dependency Analyzer')
    .version('0.0.1');
cmd.command('analyze').description('Analyze node_modules recursively.')
    .argument('<string>', 'The root dir of the package that needs to analyze.')
    .addOption(new commander_1.Option('-s, --scope <scope>', 'The scope dependencies to detect')
    .choices(['all', 'norm', 'peer', 'dev'])
    .default('all')).option('-j, --json, --out-json [fileName]', 'Output result as JSON file, otherwise will print the result on the console.')
    .option('-d, --depth <depth>', 'Maximum depth of recursive searching, otherwise set it to Infinity.', 'NaN')
    .option('--diagram', 'Auto convert result to DirectedDiagram data structure.')
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    const cwd = process.cwd(); // 命令执行路径
    const pkgRoot = path_1.default.join(cwd, str); // 包的根目录
    let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
    depth = Number.isNaN(depth) ? Infinity : depth;
    try {
        const pkgCount = (0, recur_1.count)(pkgRoot, depth);
        console.log('Detected', pkgCount, 'packages in the target directory.');
        yield new Promise((res) => setTimeout(res, 1000));
        const { scope } = options;
        const scopes = scope === 'norm' ? [true, false, false] :
            scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true];
        console.log(pkgRoot, scopes, depth);
        let res = (0, recur_1.default)(pkgRoot, depth, scopes[0], scopes[1], scopes[2], pkgCount);
        if (options.diagram) {
            const pkgJson = (0, utils_1.readPackageJson)(path_1.default.join(pkgRoot, 'package.json'));
            res = (0, utils_1.toDiagram)(res, pkgJson);
        }
        if (options.json) { // 输出JSON文件设置
            let outFileName = options.json === true ? str : options.json;
            if (!outFileName.endsWith('.json')) {
                outFileName += '.json';
            }
            const outFileUri = path_1.default.join(cwd, outFileName);
            fs_1.default.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
            console.log(`Analyze result has been saved to ${outFileName}.`);
        }
        else {
            console.log(res);
        }
    }
    catch (e) {
        console.error(e);
    }
}));
cmd.command('count')
    .description('Recursively count the number of packages exists in the target package node_modules.')
    .argument('<string>', 'The root dir of the package that needs to count.')
    .option('-d, --depth <depth>', 'Maximum depth of recursive searching, otherwise set it to Infinity.', 'NaN')
    .action((str, options) => {
    const cwd = process.cwd(); // 命令执行路径
    const pkgRoot = path_1.default.join(cwd, str); // 包的根目录
    let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
    depth = Number.isNaN(depth) ? Infinity : depth;
    try {
        const res = (0, recur_1.count)(pkgRoot, depth);
        console.log('CURRENT PACKAGES: ', res);
    }
    catch (e) {
        console.error(e);
    }
});
cmd.command('get')
    .description('Get the information of the package from registry.npmjs.org')
    .argument('<string>', 'The name or id of the package.')
    .option('-v, --version <string>', 'The version range of the package.')
    .option('-a, --all', 'Auto get all versions of the package which satisfy the version range described by the option -v, otherwise will get the latest.')
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const res = yield (0, npmUtils_1.getPackage)(str, (_a = options.version) !== null && _a !== void 0 ? _a : '*', !!options.all);
    console.log(res);
}));
cmd.parse();
