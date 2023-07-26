import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { readPackageJson } from './utils';
import readRecur from './utils/recur'; 

const cmd = new Command();

cmd.name('npmpkg-cli')
    .description('NPM Package Dependency Analyzer')
    .version('0.0.1');

cmd.argument('<string>', 'package uri')
    .option('-j, --json, --out-json [fileName]', 'output result as JSON file')
    .option('-d, --depth <depth>', 'recursive searching maximum depth', 'NaN')
    .action((str, options) => {
        const cwd = process.cwd();
        const pkgRoot = path.join(cwd, str);
        let depth = parseInt(options.depth);
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

            if(options.json) {
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

