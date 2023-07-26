"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRecur = exports.getPackage = void 0;
const axios_1 = __importDefault(require("axios"));
const semver_1 = __importDefault(require("semver"));
// 这是从registry.npmjs.org上递归获取依赖包信息的demo
const npmApi = axios_1.default.create({
    baseURL: 'https://registry.npmjs.org',
    proxy: {
        protocol: 'http', host: '127.0.0.1', port: 7890
    }
});
const getPackage = (pkgName, version) => __awaiter(void 0, void 0, void 0, function* () {
    const reqURI = `${encodeURIComponent(pkgName)}`;
    const res = yield npmApi.get(reqURI).catch(console.error);
    if (!res || res.status !== 200)
        return null;
    const { versions } = res.data;
    const available = Object.keys(versions);
    const maxSat = semver_1.default.maxSatisfying(available, version);
    return maxSat ? versions[maxSat] : null;
});
exports.getPackage = getPackage;
const requireRecur = (pkgs, depth = Infinity, parent) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const pkgIds = Object.keys(pkgs);
    if (depth <= 0 || !pkgIds) {
        return {};
    }
    const reqList = {};
    pkgIds.forEach(id => reqList[id] = {
        version: pkgs[id],
        dependencies: {},
        subDependencies: {}
    });
    const mod = parent !== null && parent !== void 0 ? parent : reqList;
    const queue = Object.keys(pkgs).map(e => { return { id: e, ver: pkgs[e], depth: 1 }; });
    while (queue.length) {
        const p = queue.shift();
        if (!p)
            break;
        const { id, ver: verRange } = p;
        const pkg = yield (0, exports.getPackage)(id, verRange).catch(console.error);
        if (pkg) {
            const depends = (_a = pkg.dependencies) !== null && _a !== void 0 ? _a : {};
            const unsatisfiedDepends = {};
            reqList[id].dependencies = depends;
            for (const n of Object.keys(depends)) {
                const version = depends[n];
                if (!mod.hasOwnProperty(n)) {
                    mod[n] = { version, dependencies: {}, subDependencies: {} };
                    if (p.depth <= depth) {
                        queue.push({ id: n, ver: version, depth: p.depth + 1 });
                    }
                }
                else {
                    if (!semver_1.default.intersects(mod[n].version, version)) {
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
            reqList[id].subDependencies = yield (0, exports.requireRecur)(unsatisfiedDepends, depth - p.depth, reqList);
        }
        console.log(queue.length);
    }
    return reqList;
});
exports.requireRecur = requireRecur;
