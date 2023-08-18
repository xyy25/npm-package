import { LinkMeta, DiagramNode } from "../../../utils/types"
import { PosTuple } from "./utils"

export declare class Link {
    constructor(
        source: Node,
        target: Node,
        meta: LinkMeta
    )
    source: Node
    target: Node
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
    dataIndex: number
    data: DiagramNode
    temp: boolean
    vx: number
    vy: number
    x: number
    y: number
    showNode: boolean
    showRequiring: boolean
    r: number
    constructor(
        dataIndex: number, 
        data: DiagramNode,
        temp: boolean = false
    )
}