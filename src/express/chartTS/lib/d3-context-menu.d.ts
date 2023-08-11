import * as d3 from 'd3';

export default ContextMenuInitializer;

declare module 'd3-context-menu' {
    declare interface ContextMenuInitializer {
        (d3instance: d3): ContextMenuFactor
    }
    declare interface ContextMenuFactor<T extends d3.BaseType> {
        (this: T, menuItems: MenuItems<T>, config: MenuConfig): ContextMenuResult<T>
    }
    declare type MenuItems<T extends d3.BaseType> = MenuItem<T>[];
    declare type Resolved<T extends d3.BaseType, R> = R | ((value: d3.ValueFn<T, d3.Datum, string | null>) => R);
    
    declare interface MenuItem<T extends d3.BaseType> {
        title?: Resolved<T, string>,
        action?: (value: d3.ValueFn<T, d3.Datum, string | null>) => void,
        divider?: Resolved<T, boolean>,
        disabled?: Resolved<T, boolean>,
        children?: Resolved<T, MenuItems<T>>,
        className?: string
    }

    declare interface MenuConfig {
        onOpen: () => void
        onClose: () => void
    }

    declare type ContextMenuResult<T extends d3.BaseType> = 
        (value: d3.ValueFn<T, Datum, string | null>) => void

}