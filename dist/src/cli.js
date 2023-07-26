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
cmd.argument('<string>', 'package uri')
    .option('-j, --json, --out-json [fileName]', 'output result as JSON file')
    .option('-d, --depth <depth>', 'recursive searching maximum depth', 'NaN')
    .action((str, options) => {
    const cwd = process.cwd();
    const pkgRoot = path_1.default.join(cwd, str);
    let depth = parseInt(options.depth);
    depth = Number.isNaN(depth) ? Infinity : depth;
    try {
        const pkgJson = (0, utils_1.readPackageJson)(path_1.default.join(cwd, str, 'package.json'));
        const { dependencies, devDependencies } = pkgJson;
        const allDeps = Object.assign(Object.assign({}, (dependencies !== null && dependencies !== void 0 ? dependencies : {})), (devDependencies !== null && devDependencies !== void 0 ? devDependencies : {}));
        console.log(pkgRoot, allDeps, depth);
        const res = (0, recur_1.default)(pkgRoot, allDeps, depth);
        if (options.json) {
            const outFileName = options.json === true ? str : options.json;
            const outFileUri = path_1.default.join(cwd, outFileName + '.json');
            fs_1.default.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
            console.log(`Analyze result has been save to ${outFileName}.json.`);
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
