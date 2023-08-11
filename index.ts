#!/usr/bin/env node -r "ts-node/register"

export async function main() {
    await import('./src/cli');
}

main();