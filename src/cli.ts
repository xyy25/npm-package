import { Command, Option } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson, toDiagram } from './utils';
import { getPackage } from './utils/npmUtils';
import readRecur, { detect } from './utils/recur'; 

const cmd = new Command();

cmd.name('npmpkg-cli')
    .description('NPM Package Dependency Analyzer')
    .version('0.0.1');

cmd.command('analyze').description('Analyze node_modules recursively.')
    .argument('<string>', 'The root dir of the package that needs to analyze.')
    .addOption(
        new Option('-s, --scope <scope>', 'The scope dependencies to detect')
        .choices(['all', 'norm', 'peer', 'dev'])
        .default('all')
    ).option('-j, --json, --out-json [fileName]', 'Output result as JSON file, otherwise will print the result on the console.')
    .option('-d, --depth <depth>', 'Maximum depth of recursive searching, otherwise set it to Infinity.', 'NaN')
    .option('--diagram', 'Auto convert result to DirectedDiagram data structure.')
    .action(async (str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
        depth = Number.isNaN(depth) ? Infinity : depth; 

        try {
            const pkgEx = detect(pkgRoot, depth);
            console.log('Detected', pkgEx.length, 'packages in the target directory.');

            await new Promise((res) => setTimeout(res, 1000));

            const { scope } = options;
            const scopes =
                scope === 'norm' ? [true, false, false] :
                scope === 'dev' ? [false, true, false] :
                scope === 'peer' ? [false, false, true] :
                    [true, true, true]

            console.log(pkgRoot, scopes, depth);
            let res: any = readRecur(pkgRoot, depth, scopes[0], scopes[1], scopes[2], pkgEx);
            if(options.diagram) {
                const pkgJson = readPackageJson(path.join(pkgRoot, 'package.json'));
                res = toDiagram(res, pkgJson);
            }

            if(options.json) { // 输出JSON文件设置
                let outFileName = options.json === true ? str : options.json;
                if(!outFileName.endsWith('.json')) {
                    outFileName += '.json';
                }
                const outFileUri = path.join(cwd, outFileName);
                fs.writeFileSync(outFileUri, Buffer.from(JSON.stringify(res)));
                console.log(`Analyze result has been saved to ${outFileName}.`);
            } else {
                console.log(res);
            }
        } catch(e: any) {
            console.error(e);
        }
    });

cmd.command('detect')
    .description('Recursively count the number of packages exists in the target package node_modules.')
    .argument('<string>', 'The root dir of the package that needs to count.')
    .option('-d, --depth <depth>', 'Maximum depth of recursive searching, otherwise set it to Infinity.', 'NaN')
    .option('--show', 'Show all detected packages on the console.', false)
    .action((str, options) => {
        const cwd = process.cwd(); // 命令执行路径
        const pkgRoot = path.join(cwd, str); // 包的根目录
        let depth = parseInt(options.depth); // 最大深度设置，默认为Infinity
        depth = Number.isNaN(depth) ? Infinity : depth; 

        try {
            const res = detect(pkgRoot, depth);
            if(options.show) {
                res.forEach(e => console.log('-', e));
            }
            console.log('CURRENT PACKAGES: ', res.length);
        } catch (e) {
            console.error(e);
        }
    })

cmd.command('get')
    .description('Get the information of the package from registry.npmjs.org')
    .argument('<string>', 'The name or id of the package.')
    .option('-v, --version <string>', 'The version range of the package.')
    .option('-a, --all', 'Auto get all versions of the package which satisfy the version range described by the option -v, otherwise will get the latest.')
    .action(async (str, options) => {
        const res = await getPackage(str, options.version ?? '*', !!options.all);
        console.log(res);
    })

cmd.parse();

