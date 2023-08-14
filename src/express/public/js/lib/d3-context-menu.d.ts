import * as d3 from 'd3';

namespace d3 {
    declare function contextMenu<T extends d3.BaseType, Datum>
        (this: T, menuItems: MenuItems<T, Datum>, config: Partial<MenuConfig> = {}): d3.ValueFn<T, Datum, void>
    declare type MenuItems<T extends d3.BaseType, Datum> = MenuItem<T, Datum>[];
    declare type Resolved<T extends d3.BaseType, Datum, R = string | null> = R | d3.ValueFn<T, Datum, R>;
    
    declare interface MenuItem<T extends d3.BaseType, Datum> {
        title?: Resolved<T, Datum, string>,
        action?: d3.ValueFn<T, Datum, void>,
        divider?: Resolved<T, Datum, boolean>,
        disabled?: Resolved<T, Datum, boolean>,
        children?: Resolved<T, Datum, MenuItems<T, Datum>>,
        className?: string
    }

    declare interface MenuConfig {
        onOpen: () => void
        onClose: () => void
    }
}