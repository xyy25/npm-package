import express from 'express';
import lang from '../lang/zh-CN.json'
import { yellowBright } from 'chalk';
import { exec } from 'child_process';
import { join } from 'path';
import { existsSync, lstatSync } from 'fs';

export function createResourceServer(rootDir: string, port: number = 5501, host: string = '127.0.0.1') {
    const resrc = express();
    resrc.use(express.static(rootDir));

    const addr = `http://${host}:${port}/`;

    return resrc.listen(port, host, () => {
        console.log(lang.logs['express.ts'].staticStart.replace('%s', yellowBright(addr)));
    })
}

export default function(port: number = 5500, host: string = '127.0.0.1', staticRoot?: string) {
    const app = express();
    app.use(express.static(join(__dirname, 'public')));

    const addr = `http://${host}:${port}/index.html`;

    return app.listen(port, host, () => {
        console.log(
            lang.logs['express.ts'].start.replace('%s', yellowBright(addr))
        );
        // 自动打开网页
        exec('start ' + addr);
        if(staticRoot && existsSync(staticRoot) && lstatSync(staticRoot).isDirectory()) {
            createResourceServer(staticRoot);
        }
        if(existsSync('/home/runner/app/scripts/nginx-start.sh')) {
            console.log('nginx 已启动');
            exec('~/app/scripts/nginx-start.sh;');
        }
    })
}