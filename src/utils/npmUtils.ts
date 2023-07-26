import axios from 'axios';
import semver from 'semver';
import { Dependencies, RequireList } from './types';

// 这是从registry.npmjs.org上递归获取依赖包信息的demo

const npmApi = axios.create({
    baseURL: 'https://registry.npmjs.org',
    proxy: {
        protocol: 'http', host: '127.0.0.1', port: 7890
    }
})

export const getPackage = async (pkgName: string, version: string): Promise<any> => {
    const reqURI = `${encodeURIComponent(pkgName)}`;
    const res = await npmApi.get(reqURI).catch(console.error);
    if (!res || res.status !== 200) return null;
    const { versions } = res.data;
    const available = Object.keys(versions);
    const maxSat = semver.maxSatisfying(available, version);

    return maxSat ? versions[maxSat] : null;
}

export const requireRecur = async (
    pkgs: Dependencies, 
    depth: number = Infinity, 
    parent?: RequireList
    ): Promise<RequireList> => 
{
    const pkgIds = Object.keys(pkgs);
    if(depth <= 0 || !pkgIds) {
        return {};
    }
    const reqList: RequireList = {};
    pkgIds.forEach(
        id => reqList[id] = {
            version: pkgs[id],
            dependencies: {},
            subDependencies: {}
        }
    );
    const mod = parent ?? reqList;

    const queue: { id: string, ver: string, depth: number }[] =
        Object.keys(pkgs).map(e => { return { id: e, ver: pkgs[e], depth: 1 } });
    while (queue.length) {
        const p = queue.shift(); if (!p) break;
        const { id, ver: verRange } = p;
        const pkg = await getPackage(id, verRange).catch(console.error);
        if (pkg) {
            const depends = pkg.dependencies ?? {};
            const unsatisfiedDepends: Dependencies = {};
            reqList[id].dependencies = depends;
            for(const n of Object.keys(depends)) {
                const version = depends[n];
                
                if (!mod.hasOwnProperty(n)) {
                    mod[n] = { version, dependencies: {}, subDependencies: {} };
                    if(p.depth <= depth) {
                        queue.push({ id: n, ver: version, depth: p.depth + 1 });
                    }
                } else {
                    if(!semver.intersects(mod[n].version, version)) {
                        console.log(`[${n}] current`, mod[n].version, 'does not satisfy', version, '!');
                        unsatisfiedDepends[n] = version;
                    }
                }
            }
            // console.log(mod);
            // const unsatis = Object.keys(unsatisfiedDepends);
            // if(unsatis.length) {
            //     console.log('-'.repeat(20), unsatis, '-'.repeat(20));
            // }
            reqList[id].subDependencies = await requireRecur(unsatisfiedDepends, depth - p.depth, reqList);
        }
        console.log(queue.length);
    }
    return reqList;
}