import { cyan, red } from 'chalk';
import { spawn, exec } from 'child_process';
import { existsSync } from 'fs';

export function run(
    prefix: string, 
    command: string, 
    args: string[] = [], 
    callback?: (out: string | null, code: number) => void
) {
    console.log(cyan(`<${prefix}> 子进程创建中.`));
    const child = spawn(command, args);

    let scriptOutput: string = "";

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data: any) {
        console.log(`- ` + data);

        data = data.toString();
        scriptOutput += data;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data: any) {
        console.log(red.bgBlack(`- ERROR: ` + data));

        data = data.toString();
        scriptOutput += data;
    });

    child.on('close', function(code: number) {
        callback?.(scriptOutput, code);
    });
}

export function checkStartNginx(): boolean {
    if(existsSync('/home/runner/app/scripts/nginx-start.sh')) {
        console.log('nginx 已启动');
        exec('~/app/scripts/nginx-start.sh;');
        return true;
    }
    return false;
}