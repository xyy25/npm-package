#!/usr/bin/env node -r "ts-node/register"
// linux下若要npm link请将第一行换成：
// #!/usr/bin/env ts-node-script

export async function main() {
    await import('./src/cli');
}

main();