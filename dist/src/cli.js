"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const recur_1 = __importDefault(require("./utils/recur"));
const cmd = new commander_1.Command();
cmd.name('npmpkg-cli')
    .description('NPM Package Dependency Analyzer')
    .version('0.0.1');
cmd.command('analyze').description('Analyze node_modules recursively.')
    .argument('<string>', 'The root dir of the package that needs to be analyzed.')
    .option('-j, --json, --out-json [fileName]', 'Output result as JSON file, otherwise will print the result on the console.')
    .option('-d, --depth <depth>', 'Maximum depth of recursive searching, otherwise set it to Infinity.', 'NaN')
    .option('--diagram', 'Auto convert result to DirectedDiagram data structure.')
    .action((str, options) => {
    const cwd = process.cwd(); // 命令执行路径
    const pkgRoot = path_1.default.join(cwd, str); // 包的根目录
    let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
    depth = Number.isNaN(depth) ? Infinity : depth;
    try {
        const pkgJson = (0, utils_1.readPackageJson)(path_1.default.join(cwd, str, 'package.json'));
        const { dependencies, devDependencies } = pkgJson;
        const allDeps = Object.assign(Object.assign({}, (dependencies !== null && dependencies !== void 0 ? dependencies : {})), (devDependencies !== null && devDependencies !== void 0 ? devDependencies : {}));
        console.log(pkgRoot, allDeps, depth);
        let res = (0, recur_1.default)(pkgRoot, allDeps, depth);
        if (options.diagram) {
            res = (0, utils_1.toDiagram)(pkgJson, res);
        }
        if (options.json) { // 输出JSON文件设置
            const outFileName = options.json === true ? str : options.json;
            const outFileUri = path_1.default.join(cwd, outFileName + '.json');
            fs_1.default.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
            console.log(`Analyze result has been saved to ${outFileName}.json.`);
        }
        else {
            console.log(res);
        }
    }
    catch (e) {
        console.error(e);
    }
});
cmd.parse();
