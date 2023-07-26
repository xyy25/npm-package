
import { requireRecur } from "./src/utils/npmUtils";

export async function main(...args: any) {
    // const pkgs = {
    //     'axios': '^1.7.0',
    //     'ws': '^8.3.0',
    //     "@types/semver": "^7.5.0",
    //     "commander": "^11.0.0",
    //     "semver": "^7.5.4"
    // }
    // const pinus = { 'pinus': '^1.7.0' }
    // const pkg = await requireRecur(pinus);
    // console.log(pkg);
    await import('./src/cli');
}

main();