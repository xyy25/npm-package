export type Dependencies = {
    [id: string]: string
}

export type RequireItem = {
    version: string //当前选择的版本
    dependencies?: { 
        [id: string]: string
    },
    subDependencies: RequireList
}

export type RequireList = {
    [id: string]: RequireItem
}