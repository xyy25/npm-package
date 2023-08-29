##### Options
- `-h, --help`
- `-V, --version`

##### Commands
- `$ ts-node index.ts analyze [option][package root]` 基于依赖关系递归分析当前目录下的node_modules.
- `$ ts-node index.ts detect [options] [package root]` 基于文件递归扫描当前目录下的node_modules.
- `$ ts-node index.ts view|show [options] [JSON uri]` 打开一个依赖关系数据JSON文件的网页视图.
- `$ ts-node index.ts get [options] <package name>` 从'registry.npmjs.org'获取包的信息.
- `$ ts-node index.ts help [command]` 查看命令帮助.
##### demo
- `$ ts-node index.ts analyze <根目录> [--json [输出JSON文件名]] [--depth [最大递归深度]]`

##### analyze
###### Arguments
- `package root`所需分析的根目录
###### Options
- `-m, --manager <packageManager>` 指定该项目的包管理器. (choices: "auto", "npm", "yarn", "pnpm", default: "auto")
- `-s, --scope <scope>`  设置依赖包检测的scope. (choices: "all", "norm", "peer", "dev", default: "all") 
- `-d, --depth <depth>` 设置最大递归深度. (default: 不设深度.)
- `-j, --json [fileName]` 将结果输出为JSON文件, 否则打开网页视图.
- `--pretty, --format` 自动格式化JSON文件.
- `-q, --question` 询问各种选项配置. (default: false)
- `-h, --host <host>` 视图网页开启的地址. (default: "127.0.0.1")
- `-p, --port <port>` 视图网页开启的端口号. (default: 5500)
- `-e, --extra` 分析未使用包的依赖关系. (default: false)
- `-c, --console, --print` 将结果打印至控制台.
- `-i, --noweb` 完成分析后不启动网页视图.
- `--noresource` 不启动包目录静态资源服务器. (default: false)
- `--proto` 输出树形的递归结果(不转化为可视化用的有向图结构).
- `--help` display help for command

##### detect

###### Arguments:
- `package root`所需扫描的根目录.
###### Options:
- `-m, --manager <packageManager>`  指定该项目的包管理器. (choices: "auto", "npm", "yarn", "pnpm", default: "auto")
- `-d, --depth <depth>` 设置最大递归深度. (default: 不设深度.)
- `-q, --question` 询问各种选项配置. (default: false)
- `-r, --raw` 按行打印检测结果, 不转化成树图. (default: false)
- `-c, --count` 扫描完后仅显示检测到的包文件数量. (default: false)
- `-h, --help` display help for command

##### view
###### Arguments:
- `JSON uri` 需要加载的JSON输出文件路径
###### Options:
- `-h, --host <host>`  视图网页开启的地址. (default: "127.0.0.1")
- `-p, --port <port>` 视图网页开启的端口号. (default: 5500)
- `--help` display help for command

##### get
###### Arguments:
- `package name` 查询的包名或id.

###### Options:
- `-v, --version <string>` 指定获取的包版本范围（遵循semver）.
- `-a, --all` 获取所有符合-v选项指定版本范围的包, 否则自动获取符合范围的最新版本.
- `-h, --help` display help for command
