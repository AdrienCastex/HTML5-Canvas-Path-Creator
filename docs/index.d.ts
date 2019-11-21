/// <reference types="jquery" />
/// <reference types="bootstrap" />
declare enum PointType {
    BEZIER_CURVE = 1,
    QUADRATIC_CURVE = 4,
    LINE = 2,
    MOVE = 3
}
declare enum ClickType {
    ADD = 1,
    REMOVE = 2,
    MOVE = 3
}
interface RootPoint extends Point {
    type: PointType;
}
interface Point {
    x: number;
    y: number;
    relativeTo?: Point;
    c1?: Point;
    c2?: Point;
    c3?: Point;
    type?: PointType;
}
declare class Options {
    autoCloseShape: boolean;
    showDots: boolean;
    fillShape: boolean;
    wrapJS: boolean;
    keepBezierCursorsAligned: boolean;
    hideBackgroundImage: boolean;
    showConstructionDotsOnLastClickedPointOnly: boolean;
    reverseY: boolean;
    reverseX: boolean;
    drawingColor: string;
    subDrawingColor: string;
}
/**
 * @see https://stackoverflow.com/a/40293777
 */
declare function deepClone(obj: any, hash?: WeakMap<object, any>): any;
declare class Program {
    constructor();
    protected points: Point[];
    protected bgImg: HTMLImageElement;
    protected options: Options;
    protected movingPt: Point;
    protected currentType: PointType;
    protected clickType: ClickType;
    protected lastClickedPoint: Point;
    protected $canvas: JQuery<HTMLCanvasElement>;
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected historyManager: HistoryManager<Point[]>;
    getPrecision(): number;
    initialize(): void;
    protected storeInHistory(): void;
    protected setCurrentType(type: PointType): void;
    protected setClickType(type: ClickType): void;
    protected produceJS(): string;
    protected updateJS(): void;
    protected redraw(): void;
    protected addPointsTogether(pt1: Point, pt2: Point): {
        x: number;
        y: number;
    };
    protected interesct(point: Point, location: Point, pointPrecision?: number): boolean;
    protected selectedPoints(location: Point, precision?: number): any[];
    protected selectedPoint(location: Point, precision?: number): any;
    protected removePoint(point: Point, useInstance?: boolean): Point;
    protected static alignBezierCursor(cursorPoint: Point): boolean;
}
declare class HistoryManager<T> {
    constructor(maxHistorySize?: number);
    protected maxHistorySize: number;
    protected history: T[];
    protected historyPtr: T;
    protected historyForeward: T[];
    storeInHistory(value: T): void;
    backInHistory(): T;
    forewardInHistory(): T;
}
