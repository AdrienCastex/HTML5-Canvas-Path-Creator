
class Program {
    public constructor() {

    }
    
    protected points: Point[] = [];
    protected bgImg: HTMLImageElement = undefined;
    protected options = new Options();
    protected movingPt: Point = undefined;
    protected currentType: PointType = PointType.MOVE;
    protected clickType: ClickType = ClickType.ADD;
    protected lastClickedPoint: Point = undefined;
    
    protected $canvas: JQuery<HTMLCanvasElement>;
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    
    protected historyManager: HistoryManager<Point[]> = new HistoryManager(30);

    public getPrecision() {
        return parseInt($('#precision').val().toString());
    }

    public initialize() {
        $('[data-toggle="popover"]').popover({
            trigger: 'hover',
            placement: 'bottom'
        });
        
        this.$canvas = $('#canvas');
        this.canvas = this.$canvas[0];
        this.ctx = this.canvas.getContext('2d');

        const bindCheckbox = (query: string, propertyName: string) => {
            $(query).on('change paste keyup', () => {
                this.options[propertyName] = $(`${query}:checked`).length > 0;
                this.redraw();
            })

            $(query).prop('checked', this.options[propertyName]);
        }
        
        bindCheckbox('#autoCloseShape', 'autoCloseShape');
        bindCheckbox('#showDots', 'showDots');
        bindCheckbox('#fillShape', 'fillShape');
        bindCheckbox('#wrapJS', 'wrapJS');
        bindCheckbox('#keepBezierCursorsAligned', 'keepBezierCursorsAligned');
        bindCheckbox('#hideBackgroundImage', 'hideBackgroundImage');
        bindCheckbox('#showConstructionDotsOnLastClickedPointOnly', 'showConstructionDotsOnLastClickedPointOnly');
        bindCheckbox('#reverseX', 'reverseX');
        bindCheckbox('#reverseY', 'reverseY');
        
        $('#clear').on('click', () => {
            this.points = [];
            this.storeInHistory();
            this.redraw();
        })

        $('#backInHistory').on('click', () => {
            this.points = this.historyManager.backInHistory();
            this.redraw();
        })
        $('#forewardInHistory').on('click', () => {
            this.points = this.historyManager.forewardInHistory();
            this.redraw();
        })
        
        $('#precision').on('change paste keyup', () => {
            this.redraw();
        })

        $('#clickType').on('change', () => {
            this.clickType = parseInt($('#clickType').val().toString());
        })
        $('#clickType').val(this.clickType);

        $('#currentType').on('change', () => {
            this.currentType = parseInt($('#currentType').val().toString());
        })
        $('#currentType').val(this.currentType);
        
        $('#load-image').on('click', () => {
            const url = $('#url').val().toString();

            const load = (img) => {
                img.onload = () => {
                    this.bgImg = img;
                    this.redraw();
                };
            }

            if(url) {
                const img = new Image();
                load(img);
                img.src = url;
            } else {
                const $urlFile =  $('#url-file') as JQuery<HTMLInputElement>;
                const files = $urlFile[0].files;

                if(files && files[0]) {
                    const fileReader = new FileReader();
                    fileReader.onload = (event) => {
                        const img = new Image();
                        load(img);
                        img.src = event.target.result as string;
                    }
                    fileReader.readAsDataURL(files[0]);
                }
            }
        })
        
        this.$canvas.on('dblclick', (event) => {
            const point = {
                x: event.offsetX,
                y: event.offsetY
            };

            const selectedPt = this.selectedPoint(point);
            if(Program.alignBezierCursor(selectedPt)) {
                this.redraw();
            }
        })

        this.$canvas.on('mousedown', (event) => {
            const point: Point = {
                x: event.offsetX,
                y: event.offsetY,
                type: this.currentType
            };

            const isShiftPressed = event.shiftKey;
            const isCtrlPressed = event.ctrlKey;
            const mouseClick = event.which === 1 ? 'left' : 'right';

            const selectedPt = this.selectedPoint(point);
            this.lastClickedPoint = selectedPt;
            while(this.lastClickedPoint && this.lastClickedPoint.relativeTo) {
                this.lastClickedPoint = this.lastClickedPoint.relativeTo;
            }
            
            if(selectedPt) {
                let pt = selectedPt;
                if(pt.relativeTo) {
                    pt = this.addPointsTogether(pt, pt.relativeTo);
                }

                $('#last-location').text(`(${pt.x}, ${pt.y})`);
            } else {
                $('#last-location').text(`(${point.x}, ${point.y})`);
            }
            
            if(mouseClick === 'left') {

                if(selectedPt) {
                    if(this.clickType === ClickType.REMOVE) {
                        this.removePoint(selectedPt, true);
                        this.storeInHistory();
                    } else if(!isCtrlPressed) {
                        this.movingPt = selectedPt;
                    }

                } else if(!isShiftPressed) {

                    if(this.clickType === ClickType.ADD) {
                        this.movingPt = undefined;

                        if(this.currentType === PointType.QUADRATIC_CURVE) {
                            point.c3 = {
                                x: 20,
                                y: 0,
                                relativeTo: point
                            }
                        }

                        if(this.currentType === PointType.BEZIER_CURVE) {
                            point.c1 = {
                                x: 20,
                                y: 0,
                                relativeTo: point
                            }

                            if(this.points.length > 0) {
                                const lastPoint = this.points[this.points.length - 1];

                                lastPoint.c2 = {
                                    x: 20,
                                    y: 0,
                                    relativeTo: lastPoint
                                }

                                Program.alignBezierCursor(lastPoint.c1 || lastPoint.c3);
                            }
                        }

                        this.lastClickedPoint = point;
                        this.points.push(point);
                        this.storeInHistory();

                        /////// TO REMOVE? //
                        if(this.currentType === PointType.MOVE) {
                            this.setCurrentType(PointType.BEZIER_CURVE);
                        }
                        ////////TO REMOVE? //
                    }
                }

                this.redraw();
            }
        })

        const moveMovingPt = (point: Point, isShiftPressed: boolean) => {
            if(this.movingPt.relativeTo) {
                const r = this.movingPt.relativeTo;
                const newPt = {
                    x: point.x - r.x,
                    y: point.y - r.y
                };

                if(isShiftPressed) {
                    //const mouseAngle = Math.atan2(point.y - r.y, -point.x + r.y) + Math.PI;
                    const angle = Math.atan2(this.movingPt.y, -this.movingPt.x) + Math.PI;
                    const otherAngle = angle - Math.PI / 2 + Math.PI;

                    /*const angleDiff = Math.abs(((mouseAngle + 2 * Math.PI) % (2 * Math.PI)) - ((angle + 2 * Math.PI) % (2 * Math.PI)));
                    const oppositeMouse = angleDiff > Math.PI / 2 && angleDiff < Math.PI * 3 / 2;*/

                    let otherDistance = Math.sqrt(newPt.x * newPt.x + newPt.y * newPt.y);
                    /*if(oppositeMouse) {
                        otherDistance *= -1;
                    }*/

                    this.movingPt.x = Math.sin(otherAngle) * otherDistance;
                    this.movingPt.y = Math.cos(otherAngle) * otherDistance;

                } else {
                    this.movingPt.x = newPt.x;
                    this.movingPt.y = newPt.y;
                    
                    if(this.options.keepBezierCursorsAligned) {
                        Program.alignBezierCursor(this.movingPt);
                    }
                }
            } else {
                this.movingPt.x = point.x;
                this.movingPt.y = point.y;
            }
        }

        this.$canvas.on('mouseup', (event) => {
            const point = {
                x: event.offsetX,
                y: event.offsetY
            };
            
            const isShiftPressed = event.shiftKey;

            if(this.movingPt) {
                moveMovingPt(point, isShiftPressed);
                this.movingPt = undefined;
                this.storeInHistory();
            }

            this.redraw();
        })

        this.$canvas.on('mousemove', (event) => {
            const point = {
                x: event.offsetX,
                y: event.offsetY
            };
            
            const isShiftPressed = event.shiftKey;

            $('#current-location').text(`(${point.x}, ${point.y})`);

            if(this.movingPt) {
                moveMovingPt(point, isShiftPressed);
            }

            this.redraw();
        })

        this.storeInHistory();
    }

    protected storeInHistory() {
        this.historyManager.storeInHistory(this.points);
    }

    protected setCurrentType(type: PointType) {
        this.currentType = type;
        
        if($('#currentType').val() != this.currentType) {
            $('#currentType').val(this.currentType);
        }
    }

    protected setClickType(type: ClickType) {
        this.clickType = type;
        
        if($('#clickType').val() != this.clickType) {
            $('#clickType').val(this.clickType);
        }
    }

    protected produceJS() {
        let js = '';

        const addLine = (line: string) => {
            js = `${js}\n${this.options.wrapJS ? '    ' : ''}${line}`.trim();
        }

        const xCoord = (c: number) => {
            if(this.options.reverseX) {
                c = -c;
            }

            return this.options.wrapJS ? `${c} * xmul + xoff` : c;
        };
        const yCoord = (c: number) => {
            if(this.options.reverseY) {
                c = -c;
            }

            return this.options.wrapJS ? `${c} * ymul + yoff` : c;
        };
        
        addLine(`ctx.beginPath()`);
        let lastPoint = undefined;
        for(const point of this.points) {
            switch(point.type) {
                case PointType.LINE:
                    addLine(`ctx.lineTo(${xCoord(point.x)}, ${yCoord(point.y)});`);
                    break;

                case PointType.MOVE:
                    addLine(`ctx.moveTo(${xCoord(point.x)}, ${yCoord(point.y)});`);
                    break;

                case PointType.BEZIER_CURVE:
                    if(lastPoint) {
                        const absoluteC2 = this.addPointsTogether(lastPoint, lastPoint.c2);
                        const absoluteC1 = this.addPointsTogether(point, point.c1);

                        addLine(`ctx.bezierCurveTo(${xCoord(absoluteC2.x)}, ${yCoord(absoluteC2.y)}, ${xCoord(absoluteC1.x)}, ${yCoord(absoluteC1.y)}, ${xCoord(point.x)}, ${yCoord(point.y)})`);
                    } else {
                        addLine(`ctx.moveTo(${xCoord(point.x)}, ${yCoord(point.y)});`);
                    }
                    break;

                case PointType.QUADRATIC_CURVE:
                    const absoluteC3 = this.addPointsTogether(point, point.c3);

                    addLine(`ctx.quadraticCurveTo(${xCoord(absoluteC3.x)}, ${yCoord(absoluteC3.y)}, ${xCoord(point.x)}, ${yCoord(point.y)});`);
                    break;
            }

            lastPoint = point;
        }

        if(this.options.autoCloseShape) {
            addLine(`ctx.closePath();`);
        }

        if(this.options.fillShape) {
            addLine(`ctx.fill();`);
        }

        addLine(`ctx.stroke();`);

        if(this.options.wrapJS) {
            js = `function draw(xoff, yoff, xmul, ymul) {\n    ${js}\n}`;
        }

        return js;
    }

    protected updateJS() {
        const js = this.produceJS();

        $('#js').val(js);
    }
    
    protected redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if(this.bgImg && !this.options.hideBackgroundImage) {
            this.ctx.drawImage(this.bgImg, 0, 0);
        }

        const setColor = (color) => {
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = color;
        }

        const p = this.getPrecision();

        setColor(this.options.drawingColor);
        this.ctx.beginPath();
        let lastPoint = undefined;
        for(const point of this.points) {
            switch(point.type) {
                case PointType.LINE:
                    this.ctx.lineTo(point.x, point.y);
                    break;

                case PointType.MOVE:
                    this.ctx.moveTo(point.x, point.y);
                    break;

                case PointType.BEZIER_CURVE:
                    if(lastPoint) {
                        const absoluteC2 = this.addPointsTogether(lastPoint, lastPoint.c2);
                        const absoluteC1 = this.addPointsTogether(point, point.c1);

                        this.ctx.bezierCurveTo(absoluteC2.x, absoluteC2.y, absoluteC1.x, absoluteC1.y, point.x, point.y);
                    } else {
                        this.ctx.moveTo(point.x, point.y);
                    }
                    break;

                case PointType.QUADRATIC_CURVE:
                    const absoluteC3 = this.addPointsTogether(point, point.c3);

                    this.ctx.quadraticCurveTo(absoluteC3.x, absoluteC3.y, point.x, point.y);
                    break;
            }

            lastPoint = point;
        }

        if(this.options.autoCloseShape) {
            this.ctx.closePath();
        }

        if(this.options.fillShape) {
            this.ctx.fill();
        }

        this.ctx.stroke();
        
        if(this.options.showDots) {
            const drawDot = (point: Point) => {
                this.ctx.fillRect(point.x - p / 2, point.y - p / 2, p, p);
            }

            for(const point of this.points) {
                drawDot(point);

                const subPoints = (pt: Point) => {
                    if(pt) {
                        const absolute = this.addPointsTogether(point, pt);

                        drawDot(absolute);

                        this.ctx.beginPath();
                        this.ctx.moveTo(point.x, point.y);
                        this.ctx.lineTo(absolute.x, absolute.y);
                        this.ctx.stroke();
                    }
                }
                
                if(!this.options.showConstructionDotsOnLastClickedPointOnly || this.lastClickedPoint === point) {
                    setColor(this.options.subDrawingColor);

                    subPoints(point.c1)
                    subPoints(point.c2)
                    subPoints(point.c3)

                    setColor(this.options.drawingColor);
                }
            }
        }

        this.updateJS();
    }
    
    protected addPointsTogether(pt1: Point, pt2: Point) {
        return {
            x: pt1.x + pt2.x,
            y: pt1.y + pt2.y
        }
    }

    protected interesct(point: Point, location: Point, pointPrecision?: number) {
        if(pointPrecision === undefined) {
            pointPrecision = this.getPrecision();
        }

        return point.x - pointPrecision / 2 <= location.x
            && point.x + pointPrecision / 2 >= location.x
            && point.y - pointPrecision / 2 <= location.y
            && point.y + pointPrecision / 2 >= location.y;
    }

    protected selectedPoints(location: Point, precision?: number) {
        const selectedPts = [];

        const addIfValid = (point) => {
            if(!this.options.showDots || this.options.showConstructionDotsOnLastClickedPointOnly && point.relativeTo && point.relativeTo !== this.lastClickedPoint) {
                return;
            }

            let absolutePoint = point;
            if(point.relativeTo) {
                absolutePoint = this.addPointsTogether(point, point.relativeTo);
            }

            if(this.interesct(absolutePoint, location, precision)) {
                selectedPts.push(point);
            }
        }

        for(const point of this.points) {
            addIfValid(point);
            
            if(point.c1) {
                addIfValid(point.c1)
            }

            if(point.c2) {
                addIfValid(point.c2)
            }

            if(point.c3) {
                addIfValid(point.c3)
            }
        }

        return selectedPts;
    }

    protected selectedPoint(location: Point, precision?: number) {
        const pts = this.selectedPoints(location, precision);
        
        return pts[0];
    }

    protected removePoint(point: Point, useInstance?: boolean) {
        for(let i = 0; i < this.points.length; ++i) {
            const pt = this.points[i];

            if(!useInstance && pt.x === point.x && pt.y === point.y || useInstance && pt === point) {
                this.points.splice(i, 1);
                return pt;
            }
        }

        return undefined;
    }

    protected static alignBezierCursor(cursorPoint: Point) {
        if(cursorPoint && cursorPoint.relativeTo) {
            const parentPoint = cursorPoint.relativeTo;
            let adjustPoint;

            if(parentPoint.c1 === cursorPoint) {
                adjustPoint = parentPoint.c2 || parentPoint.c3;
            } else if(parentPoint.c2 === cursorPoint) {
                adjustPoint = parentPoint.c1 || parentPoint.c3;
            } else if(parentPoint.c3 === cursorPoint) {
                adjustPoint = parentPoint.c1 || parentPoint.c2;
            }

            if(adjustPoint) {
                const angle = Math.atan2(cursorPoint.y, -cursorPoint.x) + Math.PI;
                const otherAngle = angle - Math.PI / 2;

                const otherDistance = Math.sqrt(adjustPoint.x * adjustPoint.x + adjustPoint.y * adjustPoint.y);

                adjustPoint.x = Math.sin(otherAngle) * otherDistance;
                adjustPoint.y = Math.cos(otherAngle) * otherDistance;

                return true;
            }
        }

        return false;
    }
}
