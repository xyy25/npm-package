import * as d3 from 'd3';
import { LinkMeta, DiagramNode } from '../../../utils/types';

export = Chart;

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

    length(): number;
    getNoteTransform(rotate: boolean): string;
}

export declare class Node {
    dataIndex: number
    data: DiagramNode
    vx: number
    vy: number
    x: number
    y: number
    showNode: boolean
    showRequiring: boolean
    r: number
    constructor(
        dataIndex: number, 
        data: DiagramNode
    )
}

export declare type ChartOption = {
    showDesc: boolean,
    showExtraneous: boolean,
    highlightRequiring: boolean,
    highlightRequiredBy: boolean,
    highlightPath: boolean,
    fading: boolean,
    simulationStop: boolean
}

export declare type Scale = {
    width: number,
    height: number
}

declare class Chart {
    constructor(
        svg: d3.Selection<any, any, any, any>, 
        data: DirectedDiagram, 
        initOptions: Partial<ChartOption> = {}
    )
    svg: d3.Selection<any, any, any, any>
    data: DirectedDiagram
    initOptions: Partial<ChartOption>
    scale: Scale
    options: ChartOption
    nodes: Node[]
    vsbNodes: Node[]
    vsbLinks: Link[]
    requirePaths: number[][]
    g: d3.Selection<SVGGElement, any, any, any>
    desc: d3.Selection<SVGTextElement, any, any, any>
    linkg: d3.Selection<SVGGElement, any, any, any>
    nodeg: d3.Selection<SVGGElement, any, any, any>
    link: d3.Selection<SVGLineElement | d3.BaseType, Link, any, any>
    linkNote: d3.Selection<SVGTextElement | d3.BaseType, Link, any, any>
    circle: d3.Selection<SVGCircleElement | d3.BaseType, Node, any, any>
    label: d3.Selection<SVGTextElement | d3.BaseType, Node, any, any>
    simulation: d3.Simulation<Node, Link>

    init(): void;
    initData(): void;
    resetNodes(): void;
    updateNodes(): void;
    updateLinks(): void;
    initDiagram(): void;
    initSimulation(): void;
    tick(): void;
    getNodeClass<I extends number, L extends NodeClassifyArray[0][I]>(
        node: Node, 
        vi: I, 
        append: boolean = true
    ): ResolveNode<L>;
    getLinkClass<I extends number, L extends LinkClassifyArray[0][I]>(
        link: Link, 
        vi: I, 
        append: boolean = true
    ): ResolveLink<L>;
    showLinkNote(
        linkFilter: d3.ValueFn<any, Link, boolean>, 
        text: d3.ValueFn<any, Link, string> = 
            (d: Link) => this.getLinkClass(d, 1, false) ?? ''
    ): void;
    hideLinkNote(): void;
    showNode(index: number, hideOthers: boolean = false): void;
    showRequiring(index: number): void;
    hideNode(node: Node, keepNode: boolean = false, excludes: Node[] = []): void;
    hideBorders(node: Node): void;
    updateOptions(): void;
    update(): void;
    clickNode(eThis: any, node: Node): void;
    mouseOverNode(eThis: any, node: Node): void;
}

declare type ResolveNode<T> = T extends NodeIterCallback<infer P> ? P : T;
declare type NodeIterCallback<RetType = string> = (n: Node, i: number, li: d3.Selection<any, Link, any, any>, lo: typeof li) => RetType;
declare type NodeClassifyArray = [
    boolean | NodeIterCallback<boolean>, 
    string | NodeIterCallback | undefined | null, 
    string | NodeIterCallback | undefined | null
][];

declare type ResolveLink<T> = T extends LinkIterCallback<infer P> ? P : T;
declare type LinkIterCallback<RetType = string> = (link: Link, source: Node, target: Node) => RetType;
declare type LinkClassifyArray = [
    boolean | LinkIterCallback<boolean>, 
    string | LinkIterCallback | undefined | null, 
    string | LinkIterCallback | undefined | null
][];

declare const drag: (simulation: d3.Simulation<any, any>) => void;
declare const appendLine: (
    target: d3.Selection<any, any, any, any>, 
    text: any, 
    style: string = '', 
    lineHeight: string = '1.2em'
) => void;
declare const limitLen: (link: Link) => number;
declare const defs: (container: d3.Selection<any, any, any, any>) =>
    d3.Selection<d3.BaseType, any, any, any>;