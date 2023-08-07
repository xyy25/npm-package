import express from 'express';
import lang from './lang/zh-CN.json'
import { yellowBright } from 'chalk';
import { exec } from 'child_process';
import { join } from 'path';

const app = express();
app.use(express.static(join(__dirname, 'public')));

const [host, port] = ['localhost', 5500];
const addr = `http://${host}:${port}/index.html`;

app.listen(port, host, () => {
    console.log(
        lang.logs['express.ts'].start.replace('%s', yellowBright(addr))
    );
    // 自动打开网页
    exec('start ' + addr);
})