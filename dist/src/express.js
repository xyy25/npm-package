"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zh_CN_json_1 = __importDefault(require("./lang/zh-CN.json"));
const chalk_1 = require("chalk");
const child_process_1 = require("child_process");
const path_1 = require("path");
const app = (0, express_1.default)();
app.use(express_1.default.static((0, path_1.join)(__dirname, 'public')));
const [host, port] = ['localhost', 5500];
const addr = `http://${host}:${port}/index.html`;
app.listen(port, host, () => {
    console.log(zh_CN_json_1.default.logs['express.ts'].start.replace('%s', (0, chalk_1.yellowBright)(addr)));
    // 自动打开网页
    (0, child_process_1.exec)('start ' + addr);
});
