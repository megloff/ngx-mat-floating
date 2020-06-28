import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {fromEvent, Observable, of} from "rxjs";
import {filter, map, switchMap, takeUntil, take} from "rxjs/operators";
import {NgxMatFloatingElementType} from "../ngx-mat-floating.service";
import {MatExpansionPanel} from "@angular/material/expansion";

export interface NgxMatFloatingPosition {
    x: number;
    y: number;
}

export enum NgxMatFloatingWrapperStatus {
    Ready, Pinned, Unpinned, InitialPosition, DragStart, Dragging, DragEnd, Destroyed
}

export enum NgxMatFloatingFirstPosition {
    Origin = "origin",
    Center = "center"
}

export interface NgxMatFloatingActivationAnimation {
    active: true | false | "all";
    color?: string;
    keyframes?: Keyframe[];
    options?: KeyframeAnimationOptions;
}

export interface NgxMatFloatingContainerOptions {
    floatingElement: HTMLElement;
    floatingElementInstance: HTMLElement | any;
    elementType: NgxMatFloatingElementType;
    dragHandle: HTMLElement;
    elementClassList?: string;
    firstPosition?: NgxMatFloatingFirstPosition | NgxMatFloatingPosition;
    width?: string | number;
    height?: string | number;
    activationAnimation?: NgxMatFloatingActivationAnimation;
}

interface NgxMatFloatingParentElementState {
    expanded?: boolean;
    position?: NgxMatFloatingPosition;
    boundingClientRect?: DOMRect;
}


@Component({
    selector: "ngx-mat-floating-component",
    templateUrl: "./ngx-mat-floating-wrapper.component.html",
    styleUrls: ["./ngx-mat-floating-wrapper.component.css"]
})
export class NgxMatFloatingWrapperComponent implements OnInit, OnDestroy, AfterViewInit {
    static floatingComponents: NgxMatFloatingWrapperComponent[] = [];
    public wrapperStateChange: EventEmitter<NgxMatFloatingWrapperStatus> = new EventEmitter();

    @ViewChild("floatingContainer") private floatingContainer: ElementRef<HTMLDivElement>;

    private floatingContainerElement: HTMLElement;

    private pinned: boolean = true;

    private options: NgxMatFloatingContainerOptions;
    private floatingContainerAnimation: Animation;

    private floatingElementStyles: CSSStyleDeclaration;
    private floatingElementParent: HTMLElement;
    private placeHolderElement: HTMLElement;
    private zIndex: number;

    private parentElementMarginOffset: NgxMatFloatingPosition;
    private relativePosition: NgxMatFloatingPosition;
    private parentElementPosition: NgxMatFloatingPosition;

    private resized: boolean = false;
    private delta = {x: 0, y: 0};

    private allowResize: boolean = true;
    private floatingContainerHasMoved: boolean = false;

    private originalState: NgxMatFloatingParentElementState = {};

    private readonly destroySubject: Observable<NgxMatFloatingWrapperStatus>;

    constructor(private zone: NgZone, private changeDetector: ChangeDetectorRef) {
        this.zIndex = 900 + NgxMatFloatingWrapperComponent.floatingComponents.length;
        NgxMatFloatingWrapperComponent.floatingComponents.push(this);

        this.destroySubject = this.wrapperStateChange.pipe(
            filter((status: NgxMatFloatingWrapperStatus) => {
                return status == NgxMatFloatingWrapperStatus.Destroyed;
            }),
            take(1)
        );
    }

    // noinspection JSUnusedGlobalSymbols
    public isPinned(): boolean {
        return this.pinned;
    }

    public bringToFront() {
        if (NgxMatFloatingWrapperComponent.floatingComponents[NgxMatFloatingWrapperComponent.floatingComponents.length - 1] !== this) {
            const idx = NgxMatFloatingWrapperComponent.floatingComponents.findIndex((c) => {
                return c === this;
            });
            if (idx != -1) {
                NgxMatFloatingWrapperComponent.floatingComponents.splice(idx, 1);
            }

            NgxMatFloatingWrapperComponent.floatingComponents.push(this);

            let zIndex = 900;
            NgxMatFloatingWrapperComponent.floatingComponents.forEach((container) => {
                container.floatingContainerElement.style.zIndex = zIndex.toString();
                zIndex++;
            });
        }
    }

    public changeToUnpinned() {
        if (this.options && this.pinned) {
            this.originalState.boundingClientRect = this.options.floatingElement.getBoundingClientRect();

            this.originalState.position = this.getAbsoluteOffset(this.options.floatingElement);
            this.originalState.position.x -= parseFloat(this.floatingElementStyles.marginLeft);
            this.originalState.position.y -= parseFloat(this.floatingElementStyles.marginTop);

            if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
                const matExpansionPanel: MatExpansionPanel = this.options.floatingElementInstance;
                this.originalState.expanded = matExpansionPanel.expanded;

                if (matExpansionPanel.expanded) {
                    this.performChangeToUnpinned();
                } else {
                    if (this.hasMoved()) {
                        this.performChangeToUnpinned();
                    } else {
                        matExpansionPanel.afterExpand.pipe(take(1)).subscribe((_message) => {
                            this.performChangeToUnpinned();
                        });
                    }

                    matExpansionPanel.expanded = true;
                }
            } else {
                this.performChangeToUnpinned();
            }
        }
    }

    public changeToPinned() {
        if (!this.pinned) {
            const floatingContainerPosition = this.getAbsoluteOffset(this.floatingContainerElement);

            this.parentElementPosition = this.getAbsoluteOffset(this.placeHolderElement);

            const x = this.parentElementPosition.x + this.parentElementMarginOffset.x - floatingContainerPosition.x;
            const y = this.parentElementPosition.y + this.parentElementMarginOffset.y - floatingContainerPosition.y;

            this.setPosition(x, y);

            this.floatingContainerAnimation.cancel();

            const matExpansionPanel: MatExpansionPanel = this.options.floatingElementInstance;
            if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel && matExpansionPanel.expanded != this.originalState.expanded) {
                matExpansionPanel.expanded = this.originalState.expanded;
            }

            if (this.hasMoved()) {
                this.unHidePlaceHolderElement();
            } else {
                this.hideFloatingContainer();
            }

            this.options.floatingElement.classList.remove("ngx-mat-floating-unpinned");

            const dragHandleElement = this.getDragHandleElement();
            dragHandleElement.classList.remove("ngx-mat-floating-drag-handle");

            this.pinned = true;
        }
    }

    public getDragHandleElement(): HTMLElement {
        return this.options.dragHandle || this.options.floatingElement;
    }

    public hasMoved(): boolean {
        return this.floatingContainerHasMoved;
    }

    public setPosition(x: number, y: number) {
        if (x !== 0 || y !== 0) {
            this.floatingContainerHasMoved = true;
        }

        // can't use 'translate' for MatDialog, because it messes with this style option on close
        if (this.options.elementType == NgxMatFloatingElementType.MatDialog) {
            this.floatingContainerElement.style.top = y + "px";
            this.floatingContainerElement.style.left = x + "px";
        } else {
            this.floatingContainerElement.style.transform = `translate(${x}px, ${y}px)`;
        }
    }

    public getPosition(relative?: boolean): NgxMatFloatingPosition {
        let position: NgxMatFloatingPosition;
        if (this.options.elementType == NgxMatFloatingElementType.MatDialog) {
            position = {
                x: parseFloat(this.floatingContainerElement.style.left || "0"),
                y: parseFloat(this.floatingContainerElement.style.top || "0")
            };
        } else {
            position = Object.assign({}, this.relativePosition || {x: 0, y: 0});
        }

        if (!relative) {
            const topLeft = this.originalState.position || this.getAbsoluteOffset(this.floatingContainerElement);
            position.x += topLeft.x;
            position.y += topLeft.y;
        }

        return position;
    }

    public getBoundingRect(): ClientRect | DOMRect {
        return this.floatingContainerElement.getBoundingClientRect();
    }

    public setWrapperClass(wrapperClass: string) {
        this.floatingContainerElement.classList.add(...wrapperClass.split(/ /));
    }

    public setOptions(options: NgxMatFloatingContainerOptions) {
        this.options = Object.assign(<NgxMatFloatingContainerOptions>{}, options || {});

        if (!options.activationAnimation) {
            options.activationAnimation = {
                active: true
            };
        }
    }

    ngOnInit() {
    }

    ngAfterViewInit(): void {
        this.floatingContainerElement = this.options.elementType == NgxMatFloatingElementType.MatDialog ? this.options.floatingElement : this.floatingContainer.nativeElement;

        this.floatingContainerElement.style.zIndex = this.zIndex.toString();

        // reacts to floating container translations
        this.floatingContainerElement.addEventListener("transitionend", (ev) => {
            if (ev.target == this.floatingContainerElement) {
                if (this.pinned) {
                    this.hideFloatingContainer();
                } else {
                    this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.Unpinned);
                }
            }
        });

        this.floatingContainerElement.addEventListener("animationend", (ev) => {
            if (ev.target == this.floatingContainerElement) {
                if (this.floatingContainerAnimation) {
                    this.floatingContainerAnimation.cancel();
                }
            }
        });

        this.floatingElementStyles = Object.assign({}, window.getComputedStyle(this.options.floatingElement));

        this.parentElementMarginOffset = {
            x: parseFloat(this.floatingElementStyles.marginLeft),
            y: parseFloat(this.floatingElementStyles.marginTop)
        };

        // ${-parseFloat(this.floatingElementStyles.marginLeft)}px ${-parseFloat(this.floatingElementStyles.marginTop)}px
        let animationKeyframes: Keyframe[] = this.options.activationAnimation.keyframes;
        if (typeof animationKeyframes != "object" || !animationKeyframes.lastIndexOf) {
            animationKeyframes = [{
                boxShadow: `0 0 5px -5px ${this.options.activationAnimation.color || "#3F51B5"}`
            }, {
                boxShadow: `0 0 5px 5px ${this.options.activationAnimation.color || "#3F51B5"}`
            }];
        }

        const animationOptions: KeyframeAnimationOptions = Object.assign({
            duration: 150,
            iterations: 4,
            direction: "alternate",
            easing: "ease"
        }, this.options.activationAnimation.options || {});

        this.floatingContainerAnimation = this.options.floatingElement.animate(animationKeyframes, animationOptions);
        this.floatingContainerAnimation.cancel();

        this.setupEvents();
        this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.Ready);
    }

    ngOnDestroy(): void {
        this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.Destroyed);
        this.wrapperStateChange.complete();
    }

    // noinspection OverlyComplexFunctionJS,FunctionTooLongJS
    private performChangeToUnpinned() {
        if (this.options.elementType == NgxMatFloatingElementType.MatDialog) {
            this.floatingContainerElement.style.position = "relative";
            this.relativePosition = {x: 0, y: 0};
        } else {
            this.floatingContainerElement.classList.remove("ngx-mat-floating-component-hidden");

            this.placeHolderElement = this.createElementPlaceHolder();
            this.placeHolderElement.classList.add("ngx-mat-floating-placeholder");

            this.floatingElementParent = this.options.floatingElement.parentElement;

            this.floatingElementParent.replaceChild(this.placeHolderElement, this.options.floatingElement);

            this.floatingContainerElement.appendChild(this.options.floatingElement);

            if (this.options.width) {
                this.floatingContainerElement.style.width = typeof this.options.width == "number" ? this.options.width + "px" : this.options.width;
            } else {
                this.floatingContainerElement.style.width = this.originalState.boundingClientRect.width + "px";
            }

            if (this.options.height) {
                this.floatingContainerElement.style.height = typeof this.options.height == "number" ? this.options.height + "px" : this.options.height;
            } else {
                this.floatingContainerElement.style.height = this.options.floatingElement.style.height;
            }

            let firstPosition: NgxMatFloatingFirstPosition;
            let firstPositionPoint: NgxMatFloatingPosition;

            if (this.options.firstPosition) {
                if (this.options.firstPosition.hasOwnProperty("x") && this.options.firstPosition.hasOwnProperty("y")) {
                    firstPositionPoint = this.options.firstPosition as NgxMatFloatingPosition;
                } else {
                    // make sure the passed argument is in correct case
                    firstPosition = (this.options.firstPosition as NgxMatFloatingFirstPosition).toLowerCase() as NgxMatFloatingFirstPosition;
                }
            } else {
                firstPosition = NgxMatFloatingFirstPosition.Origin;
            }

            const containerElementStyle = this.floatingContainerElement.style;

            if (firstPositionPoint) {
                if (!this.relativePosition) {
                    this.relativePosition = {
                        y: firstPositionPoint.y - this.originalState.position.y,
                        x: firstPositionPoint.x - this.originalState.position.x
                    };
                    this.floatingContainerHasMoved = true;
                }
            } else {
                switch (firstPosition) {
                    case NgxMatFloatingFirstPosition.Center:
                        if (!this.relativePosition) {
                            this.relativePosition = {
                                y: window.pageYOffset + window.innerHeight / 4 - this.originalState.position.y,
                                x: (window.innerWidth - this.floatingContainerElement.clientWidth) / 2 - this.originalState.position.x
                            };
                            this.floatingContainerHasMoved = true;
                        }
                        containerElementStyle.position = "fixed";
                        break;

                    case NgxMatFloatingFirstPosition.Origin:
                        if (!this.relativePosition) {
                            this.relativePosition = {x: 0, y: 0};
                        }
                        containerElementStyle.position = "absolute";
                        break;
                }
            }

            this.parentElementPosition = {
                x: this.originalState.position.x + parseFloat(this.floatingElementStyles.marginLeft),
                y: this.originalState.position.y + parseFloat(this.floatingElementStyles.marginTop)
            };

            containerElementStyle.top = this.parentElementPosition.y + "px";
            containerElementStyle.left = this.parentElementPosition.x + "px";

            this.floatingContainerElement.classList.remove("ngx-mat-floating-component-hidden");

            if (this.options.activationAnimation.active && !this.hasMoved()) {
                if (this.options.activationAnimation.active == "all" || firstPosition == NgxMatFloatingFirstPosition.Origin) {
                    this.floatingContainerAnimation.play();
                }
            }

            this.setPosition(this.relativePosition.x, this.relativePosition.y);

            if (this.hasMoved() || firstPosition != NgxMatFloatingFirstPosition.Origin) {
                this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.InitialPosition);
                this.hidePlaceHolderElement();
            }

            if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
                const matExpansionPanel: MatExpansionPanel = this.options.floatingElementInstance;
                matExpansionPanel.afterExpand.pipe(
                    takeUntil(this.wrapperStateChange.pipe(filter((state: NgxMatFloatingWrapperStatus) => {
                        return state == NgxMatFloatingWrapperStatus.Pinned;
                    })))
                ).subscribe((_expandedStatus) => {
                    this.adjustPlaceHolderHeight();
                    // console.log("expand", expandedStatus, this.originalState);
                });

                matExpansionPanel.afterCollapse.pipe(
                    takeUntil(this.wrapperStateChange.pipe(filter((state: NgxMatFloatingWrapperStatus) => {
                        return state == NgxMatFloatingWrapperStatus.Pinned;
                    })))
                ).subscribe((_expandedStatus) => {
                    this.adjustPlaceHolderHeight();
                    // console.log("collapse", expandedStatus, this.originalState);
                });
            }
        }

        const dragHandleElement = this.getDragHandleElement();
        dragHandleElement.classList.add("ngx-mat-floating-drag-handle");

        this.pinned = false;
    }

    // noinspection JSMethodCanBeStatic
    private getAbsoluteOffset(element: HTMLElement): NgxMatFloatingPosition {
        let x: number = 0;
        let y: number = 0;

        for (let el: HTMLElement = element; el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop); el = el.offsetParent as HTMLElement) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
        }

        return {y: y, x: x};
    }

    // noinspection JSMethodCanBeStatic
    private createElementPlaceHolder(): HTMLElement {
        const placeholderElement = document.createElement("ngx-mat-floating-container-placeholder");
        const rect = this.options.floatingElement.getBoundingClientRect();

        placeholderElement.style.display = "block";
        placeholderElement.style.width = (rect.width + parseFloat(this.floatingElementStyles.marginLeft) + parseFloat(this.floatingElementStyles.marginRight)) + "px";
        placeholderElement.style.height = (rect.height + parseFloat(this.floatingElementStyles.marginTop) + parseFloat(this.floatingElementStyles.marginBottom)) + "px";

        placeholderElement.addEventListener("transitionend", (ev) => {
            if (ev.target == placeholderElement) {
                this.placeHolderElement.classList.add("ngx-mat-floating-transition");
            }
        });

        return placeholderElement;
    }

    private setupEvents() {
        this.zone.runOutsideAngular(() => {
            const containerMouseDownEvent = fromEvent(this.floatingContainerElement, "mousedown");
            const dragHandleMouseDownEvent = fromEvent(this.getDragHandleElement(), "mousedown");
            const mouseUpEvent = fromEvent(document, "mouseup");
            const mouseMoveEvent = fromEvent(document, "mousemove");

            let hasDragged: boolean = false;

            if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
                // prevent expansion panel toggle if the panel has been dragged
                this.getDragHandleElement().addEventListener("click", (ev) => {
                    if (hasDragged) {
                        ev.preventDefault();
                        ev.stopPropagation();
                    }
                }, {
                    capture: true
                });
            }

            containerMouseDownEvent.pipe(takeUntil(this.destroySubject)).subscribe((ev: MouseEvent) => {
                for (let target: HTMLElement = (<HTMLElement>ev.target); target; target = (<HTMLElement>target).parentElement) {
                    if (target == this.floatingContainerElement) {
                        hasDragged = false;
                        this.bringToFront();
                        break;
                    }
                }
            });

            // noinspection FunctionWithMultipleReturnPointsJS
            const mouseDragEvent = dragHandleMouseDownEvent.pipe(takeUntil(this.destroySubject)).pipe(
                switchMap((ev: MouseEvent) => {
                    const targetClassList = (<HTMLElement>ev.target).classList;
                    if (this.pinned || targetClassList.contains("ngx-mat-floating-pin-button-icon") || targetClassList.contains("ngx-mat-floating-pin-button")) {
                        return mouseMoveEvent;
                    } else {
                        this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.DragStart);

                        this.floatingContainerElement.classList.add("ngx-mat-floating-component-dragging");
                        this.bringToFront();

                        const startX = ev.clientX;
                        const startY = ev.clientY;

                        if (this.allowResize) {
                            const rectX = this.getBoundingRect();

                            if (
                                // if the user is clicking on the bottom-right corner, he will resize the dialog
                                startY > rectX.bottom - 15 &&
                                startY <= rectX.bottom &&
                                startX > rectX.right - 15 &&
                                startX <= rectX.right
                            ) {
                                this.resized = true;
                                return of(null);
                            }
                        }

                        return mouseMoveEvent.pipe(
                            map((innerEvent: MouseEvent) => {
                                innerEvent.preventDefault();
                                innerEvent.stopPropagation();
                                this.delta = {
                                    x: innerEvent.clientX - startX,
                                    y: innerEvent.clientY - startY,
                                };
                            }),
                            takeUntil(mouseUpEvent)
                        );
                    }
                }),
                takeUntil(this.destroySubject)
            );

            mouseDragEvent.pipe(takeUntil(this.destroySubject)).subscribe((_ev: MouseEvent) => {
                if (!this.pinned) {
                    if (this.delta.x !== 0 && this.delta.y !== 0) {
                        if (!hasDragged) {
                            this.hidePlaceHolderElement();
                            hasDragged = true;
                        }

                        this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.Dragging);
                        requestAnimationFrame(() => {
                            this.setPosition(this.relativePosition.x + this.delta.x, this.relativePosition.y + this.delta.y);
                        });
                    }
                }
            });

            mouseUpEvent.pipe(takeUntil(this.destroySubject)).subscribe((_ev: MouseEvent) => {
                if (!this.pinned) {
                    this.relativePosition.x += this.delta.x;
                    this.relativePosition.y += this.delta.y;
                    this.delta = {x: 0, y: 0};
                    this.changeDetector.markForCheck();

                    this.floatingContainerElement.classList.remove("ngx-mat-floating-component-dragging");
                    this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.DragEnd);
                }

                return !hasDragged;
            });
        });
    }

    private hideFloatingContainer() {
        if (this.floatingElementParent) {
            if (this.placeHolderElement) {
                this.floatingElementParent.replaceChild(this.options.floatingElement, this.placeHolderElement);
            }

            this.floatingContainerElement.classList.add("ngx-mat-floating-component-hidden");
            this.floatingElementParent = null;
        }

        this.wrapperStateChange.next(NgxMatFloatingWrapperStatus.Pinned);
    }

    private hidePlaceHolderElement() {
        if (this.placeHolderElement) {
            this.placeHolderElement.style.maxHeight = this.placeHolderElement.clientHeight + "px";
            setTimeout(() => {
                this.placeHolderElement.classList.add("ngx-mat-floating-transition");
                this.placeHolderElement.style.maxHeight = "0";
            }, 1);
        }
    }

    private unHidePlaceHolderElement() {
        if (this.placeHolderElement) {
            setTimeout(() => {
                this.placeHolderElement.classList.add("ngx-mat-floating-transition");
                this.placeHolderElement.style.maxHeight = this.originalState.boundingClientRect.height + parseFloat(this.floatingElementStyles.marginTop) + parseFloat(this.floatingElementStyles.marginBottom) + "px";
            }, 1);
        }
    }

    private adjustPlaceHolderHeight() {
        if (this.placeHolderElement && !this.hasMoved()) {
            this.placeHolderElement.style.maxHeight = this.options.floatingElement.clientHeight + parseFloat(this.floatingElementStyles.marginTop) + parseFloat(this.floatingElementStyles.marginBottom) + "px";
        }
    }
}
