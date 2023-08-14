import { PosTuple } from "./utils";

const fontSize: number;
const symbolSize: number;
const padding: number;
const that: typeof this;

export = Topo;

export declare interface Edge<Datum> {
    source: Datum,
    target: Datum
}

export declare interface Pos {
    x: number,
    y: number
}

namespace global {
    dialogVisible: boolean
}

declare class Topo<Datum> {
    constructor(
        svg: d3.Selection<any, any, any, any>,
        data: Datum[]
    )
    svg: d3.Selection<any, any, any, any>
    data: Datum
    edge?: Edge<Datum>[]
    scale?: number
    container?: d3.Selection<any, any, any, any>
    nodes?: d3.Selection<any, Datum, any, any>
    nodeCodes?: d3.Selection<any, Datum, any, any>
    lineGroup?: d3.Selection<any, any, any, any>
    lineTextGroup?: d3.Selection<any, any, any, any>
    lineTextsGroup?: d3.Selection<any, typeof this.edge, any, any>

    initPosition(): void
    getVertices(n: number): Pos[]
    getCenter(x1: number, y1: number, x2: number, y2: number): PosTuple
    getAngle(x1: number, y1: number, x2: number, y2: number): number
    initZoom(): void
    initDefineSymbol(): void
    initLink(): void
    initNode(): void
    drawNodeCode(): void
    drawNodeSymbol(): void
    drawNodeTitle(): void
    drawLinkLine(): void
    drawLinkText(): void
    update(): void
    onDrag(ele: Element, d: Datum): void
    onZoom(ele: Element): void
    render(): void
}