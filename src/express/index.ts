import express from 'express';
import lang from '../lang/zh-CN.json'
import { yellowBright } from 'chalk';
import { exec } from 'child_process';
import { join } from 'path';

export default (port: number = 5500, host: string = '127.0.0.1') => {
    const app = express();
    app.use(express.static(join(__dirname, 'public')));

    const addr = `http://${host}:${port}/index.html`;

    return app.listen(port, host, () => {
        console.log(
            lang.logs['express.ts'].start.replace('%s', yellowBright(addr))
        );
        // 自动打开网页
        exec('start ' + addr);
    })
}