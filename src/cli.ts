import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson, toDiagram } from './utils';
import { getPackage } from './utils/npmUtils';
import readRecur from './utils/recur'; 

const cmd = new Command();

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
            let res: any = readRecur(pkgRoot, allDeps, depth);
            if(options.diagram) {
                res = toDiagram(res, pkgJson);
            }

            if(options.json) { // 输出JSON文件设置
                const outFileName = options.json === true ? str : options.json;
                const outFileUri = path.join(cwd, outFileName + '.json');
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
                console.log(`Analyze result has been saved to ${outFileName}.json.`);
            } else {
                console.log(res);
            }
        } catch(e: any) {
            console.error(e);
        }
    });

cmd.command('get').description('Get the information of the package from registry.npmjs.org')
    .argument('<string>', 'The name or id of the package.')
    .option('-v, --version <string>', 'The version range of the package.')
    .option('-a, --all', 'Auto get all versions of the package which satisfy the version range described by the option -v, otherwise will get the latest.')
    .action(async (str, options) => {
        const res = await getPackage(str, options.version ?? '*', !!options.all);
        console.log(res);
    })

cmd.parse();

