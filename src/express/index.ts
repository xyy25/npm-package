import express from 'express';
import cors from 'cors';
import lang from '../lang/zh-CN.json'
import { yellow, yellowBright } from 'chalk';
import { exec } from 'child_process';
import { join } from 'path';
import { existsSync, lstatSync } from 'fs';

export function createResourceServer(
    rootDir: string, 
    port: number = 5501, 
    host: string = 'localhost',
    callback?: () => void
) {
    const resrc = express();
    const allowlist = [
        'http://127.0.0.1:5500', 
        'http://localhost:5500', 
        'http://127.0.0.1:5502', 
        'http://localhost:5502',
        'http://127.0.0.1:8080', 
        'http://localhost:8080', 
    ];
    const corsSet = cors({ 
        origin: (org, cb) => cb(null, org && allowlist.includes(org))
    });
    resrc.use('/', corsSet, express.static(rootDir));

    const addr = `http://${host}:${port}`;

    return resrc.listen(port, () => {
        console.log(lang.logs['express.ts'].staticStart
                .replace('%root', yellow(rootDir))
                .replace('%s', yellowBright(addr)));
        if(callback) {
            callback();
        }
    })
}

export default function(
    port: number = 5500, 
    host: string = '127.0.0.1', 
    callback?: () => void
) {
    const app = express();
    app.use(express.static(join(__dirname, 'public')));

    const addr = `http://${host}:${port}/index.html`;

    return app.listen(port, host, () => {
        console.log(
            lang.logs['express.ts'].start.replace('%s', yellowBright(addr))
        );
        // 自动打开网页
        exec('start ' + addr);
        if(existsSync('/home/runner/app/scripts/nginx-start.sh')) {
            console.log('nginx 已启动');
            exec('~/app/scripts/nginx-start.sh;');
        }
        if(callback) {
            callback();
        }
    })
}