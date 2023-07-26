import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson } from './utils';
import readRecur from './utils/recur'; 

const cmd = new Command();

cmd.name('npmpkg-cli')
    .description('NPM Package Dependency Analyzer')
    .version('0.0.1');

cmd.command('analyze').description('analyze node_modules recursively')
    .argument('<string>', 'package uri that needs to be analyzed')
    .option('-j, --json, --out-json [fileName]', 'output result as JSON file, otherwise print the result on the console')
    .option('-d, --depth <depth>', 'maximum depth of recursive searching, otherwise set it to Infinity', 'NaN')
    .action((str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
        depth = Number.isNaN(depth) ? Infinity : depth; 

        try {
            const pkgJson = readPackageJson(path.join(cwd, str, 'package.json'));
            const { dependencies, devDependencies } = pkgJson;
            const allDeps = {
                ...(dependencies ?? {}),
                ...(devDependencies ?? {})
            };

            console.log(pkgRoot, allDeps, depth);
            const res = readRecur(pkgRoot, allDeps, depth);

            if(options.json) { // 输出JSON文件设置
                const outFileName = options.json === true ? str : options.json;
                const outFileUri = path.join(cwd, outFileName + '.json');
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
                console.log(`Analyze result has been save to ${outFileName}.json.`);
            } else {
                console.log(res);
            }
        } catch(e: any) {
            console.error(e);
        }
    });

cmd.parse();

