import { LinkMeta, DiagramNode } from "../../../utils/types"
import { PosTuple } from "./utils"

export declare class Link {
    constructor(
        public source: Node,
        public target: Node,
        meta: LinkMeta | null
    )
    meta: LinkMeta
    rotate: boolean
    text: string
    curve: number

    center(): PosTuple;
    length(): number;
    angle(deg: boolean = false, abs: boolean = false): number;
    ends(): [PosTuple, PosTuple];
    getLinkPath(): string;
    getNoteFilp(): boolean;
    getNoteTransform(): string;
}

export declare class Node {
    vx: number
    vy: number
    x: number
    y: number
    showNode: boolean
    showRequiring: boolean
    mate: number[]
    r: number
    s: number
    depth: number
    constructor(
        public dataIndex: number, 
        public data: DiagramNode,
        public temp: boolean = false
    )
}