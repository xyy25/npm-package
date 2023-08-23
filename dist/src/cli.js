"use strict";
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
exports.publicOptions = exports.error = void 0;
const commander_1 = require("commander");
const demo_1 = require("./utils/demo");
const chalk_1 = __importDefault(require("chalk"));
const zh_CN_json_1 = __importDefault(require("./lang/zh-CN.json"));
const analyze_1 = __importDefault(require("./cmds/analyze"));
const detect_1 = __importDefault(require("./cmds/detect"));
const view_1 = __importDefault(require("./cmds/view"));
const cmds_1 = require("./cmds");
exports.error = chalk_1.default.bgBlack.bold.redBright;
const cmd = new commander_1.Command();
cmd.name('pkg-cli')
    .description(zh_CN_json_1.default.description)
    .version('0.0.1', undefined, zh_CN_json_1.default.version)
    .addHelpCommand(true, (_a = zh_CN_json_1.default.commands.help) === null || _a === void 0 ? void 0 : _a.description)
    .showSuggestionAfterError(true);
exports.publicOptions = {
    manager: new commander_1.Option('-m, --manager <packageManager>', zh_CN_json_1.default.commands.analyze.options.manager.description)
        .choices(['auto', 'npm', 'yarn', 'pnpm'])
        .default('auto'),
    scope: new commander_1.Option('-s, --scope <scope>', zh_CN_json_1.default.commands.analyze.options.scope.description)
        .choices(['all', 'norm', 'peer', 'dev'])
        .default([true, true, true], '"all"')
        .argParser((v) => ({
        all: [true, true, true], norm: [true, false, false],
        peer: [false, false, true], dev: [false, true, false]
    })[v]),
    depth: new commander_1.Option('-d, --depth <depth>', zh_CN_json_1.default.commands.analyze.options.depth.description)
        .default(NaN, zh_CN_json_1.default.commands.analyze.options.depth.default)
        .argParser((v) => parseInt(v)),
    json: new commander_1.Option('-j, --json [fileName]', zh_CN_json_1.default.commands.analyze.options.json.description)
        .argParser((v) => typeof v === 'string' ? (0, cmds_1.outJsonRelUri)(v) : v),
    pretty: new commander_1.Option('--pretty, --format', zh_CN_json_1.default.commands.analyze.options.format.description),
    question: new commander_1.Option('-q, --question', zh_CN_json_1.default.commands.analyze.options.question.description)
        .default(false),
    host: new commander_1.Option('-h, --host <host>', zh_CN_json_1.default.commands.analyze.options.host.description)
        .default("127.0.0.1"),
    port: new commander_1.Option('-p, --port <port>', zh_CN_json_1.default.commands.analyze.options.port.description)
        .default(5500)
        .argParser((v) => parseInt(v))
};
(0, analyze_1.default)(cmd, zh_CN_json_1.default);
(0, detect_1.default)(cmd, zh_CN_json_1.default);
(0, view_1.default)(cmd, zh_CN_json_1.default);
cmd.command('get')
    .description(zh_CN_json_1.default.commands.get.description)
    .argument('<package name>', zh_CN_json_1.default.commands.get.argument[0].description)
    .option('-v, --version <string>', zh_CN_json_1.default.commands.get.options.version.description)
    .option('-a, --all', zh_CN_json_1.default.commands.get.options.all.description)
    .action((str, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const res = yield (0, demo_1.getPackage)(str, (_b = options.version) !== null && _b !== void 0 ? _b : '*', !!options.all);
    console.log(res);
}));
cmd.parse();
