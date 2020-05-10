import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {fromEvent, of, Subject} from "rxjs";
import {filter, first, map, switchMap, takeUntil} from "rxjs/operators";
import {NgxMatFloatingElementType} from "../ngx-mat-floating.service";
import {MatExpansionPanel} from "@angular/material/expansion";

export interface NgxMatFloatingPoint {
    x: number;
    y: number;
}

export enum NgxMatFloatingWrapperStatus {
    Ready, Pinned, Unpinned, InitialPosition, DragStart, Dragging, DragEnd, Destroyed
}

export enum NgxMatFloatingFirstPosition {
    Origin = "origin",
    Centered = "centered"
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
    firstPosition?: NgxMatFloatingFirstPosition | NgxMatFloatingPoint;
    width?: string | number;
    height?: string | number;
    activationAnimation?: NgxMatFloatingActivationAnimation;
}

interface NgxMatFloatingParentElementState {
    expanded?: boolean;
    position?: NgxMatFloatingPoint;
    boundingClientRect?: DOMRect;
}


@Component({
    selector: "ngx-mat-floating-component",
    templateUrl: "./ngx-mat-floating-wrapper.component.html",
    styleUrls: ["./ngx-mat-floating-wrapper.component.css"]
})
export class NgxMatFloatingWrapperComponent implements OnInit, OnDestroy, AfterViewInit {
    static floatingComponents: NgxMatFloatingWrapperComponent[] = [];
    public stateChange: EventEmitter<NgxMatFloatingWrapperStatus> = new EventEmitter();

    @ViewChild("floatingContainer") private floatingContainer: ElementRef<HTMLDivElement>;

    private pinned: boolean = true;

    private options: NgxMatFloatingContainerOptions;
    private floatingContainerAnimation: Animation;

    private floatingElementStyles: CSSStyleDeclaration;
    private floatingElementParent: HTMLElement;
    private placeHolderElement: HTMLElement;
    private zIndex: number;

    private parentElementMarginOffset: NgxMatFloatingPoint;
    private relativePosition: NgxMatFloatingPoint;
    private parentElementPosition: NgxMatFloatingPoint;

    private resized: boolean = false;
    private delta = {x: 0, y: 0};
    private destroySubject: Subject<void> = new Subject<void>();

    private allowResize: boolean = true;
    private floatingContainerHasMoved: boolean = false;

    private originalState: NgxMatFloatingParentElementState = {};

    constructor(private zone: NgZone, private changeDetector: ChangeDetectorRef) {
        this.zIndex = 900 + NgxMatFloatingWrapperComponent.floatingComponents.length;
        NgxMatFloatingWrapperComponent.floatingComponents.push(this);
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
                container.floatingContainer.nativeElement.style.zIndex = zIndex.toString();
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
                        matExpansionPanel.afterExpand.pipe(first()).subscribe((_message) => {
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
            const floatingContainerPosition = this.getAbsoluteOffset(this.floatingContainer.nativeElement);

            this.parentElementPosition = this.getAbsoluteOffset(this.placeHolderElement);

            const x = this.parentElementPosition.x + this.parentElementMarginOffset.x - floatingContainerPosition.x;
            const y = this.parentElementPosition.y + this.parentElementMarginOffset.y - floatingContainerPosition.y;

            this.setPosition(x, y);

            this.floatingContainerAnimation.cancel();

            const matExpansionPanel: MatExpansionPanel = this.options.floatingElementInstance;
            if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel && matExpansionPanel.expanded != this.originalState.expanded) {
                matExpansionPanel.expanded = this.originalState.expanded;
                matExpansionPanel.afterExpand.pipe(first()).subscribe((_message) => {
                    this.stateChange.next(NgxMatFloatingWrapperStatus.Pinned);
                });
            } else {
                this.stateChange.next(NgxMatFloatingWrapperStatus.Pinned);
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
        if (x != 0 || y != 0) {
            this.floatingContainerHasMoved = true;
        }

        this.floatingContainer.nativeElement.style.transform = `translate(${x}px, ${y}px)`;
    }

    public getPosition(relative?: boolean): NgxMatFloatingPoint {
        const position: NgxMatFloatingPoint = Object.assign({}, this.relativePosition || {x: 0, y: 0});

        if (!relative) {
            const topLeft = this.getAbsoluteOffset(this.floatingContainer.nativeElement);
            position.x += topLeft.x;
            position.y += topLeft.y;
        }

        return position;
    }

    public getBoundingRect(): ClientRect | DOMRect {
        return this.floatingContainer.nativeElement.getBoundingClientRect();
    }

    public setWrapperClass(wrapperClass: string) {
        this.floatingContainer.nativeElement.classList.add(...wrapperClass.split(/ /));
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
        this.floatingContainer.nativeElement.style.zIndex = this.zIndex.toString();

        // reacts to floating container translations
        this.floatingContainer.nativeElement.addEventListener("transitionend", (ev) => {
            if (ev.srcElement == this.floatingContainer.nativeElement) {
                if (this.pinned) {
                    this.hideFloatingContainer();
                } else {
                    this.stateChange.next(NgxMatFloatingWrapperStatus.Unpinned);
                }
            }
        });

        this.floatingContainer.nativeElement.addEventListener("animationend", (ev) => {
            if (ev.srcElement == this.floatingContainer.nativeElement) {
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
        this.stateChange.next(NgxMatFloatingWrapperStatus.Ready);
    }

    ngOnDestroy(): void {
        if (this.destroySubject && !this.destroySubject.closed) {
            this.destroySubject.next();
            this.destroySubject.complete();
        }

        this.stateChange.next(NgxMatFloatingWrapperStatus.Destroyed);
    }

    private performChangeToUnpinned() {
        this.floatingContainer.nativeElement.classList.remove("ngx-mat-floating-component-hidden");

        this.placeHolderElement = this.createElementPlaceHolder();
        this.placeHolderElement.classList.add("ngx-mat-floating-placeholder");

        this.floatingElementParent = this.options.floatingElement.parentElement;

        this.floatingElementParent.replaceChild(this.placeHolderElement, this.options.floatingElement);

        this.floatingContainer.nativeElement.appendChild(this.options.floatingElement);

        if (this.options.width) {
            this.floatingContainer.nativeElement.style.width = typeof this.options.width == "number" ? this.options.width + "px" : this.options.width;
        } else {
            this.floatingContainer.nativeElement.style.width = this.originalState.boundingClientRect.width + "px";
        }

        if (this.options.height) {
            this.floatingContainer.nativeElement.style.height = typeof this.options.height == "number" ? this.options.height + "px" : this.options.height;
        } else {
            this.floatingContainer.nativeElement.style.height = this.options.floatingElement.style.height;
        }

        let firstPosition: NgxMatFloatingFirstPosition;
        let firstPositionPoint: NgxMatFloatingPoint;

        if (this.options.firstPosition) {
            if (this.options.firstPosition.hasOwnProperty("x") && this.options.firstPosition.hasOwnProperty("y")) {
                firstPositionPoint = this.options.firstPosition as NgxMatFloatingPoint;
            } else {
                // make sure the passed argument is in correct case
                firstPosition = (this.options.firstPosition as NgxMatFloatingFirstPosition).toLowerCase() as NgxMatFloatingFirstPosition;
            }
        } else {
            firstPosition = NgxMatFloatingFirstPosition.Origin;
        }

        const containerElementStyle = this.floatingContainer.nativeElement.style;

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
                case NgxMatFloatingFirstPosition.Centered:
                    if (!this.relativePosition) {
                        this.relativePosition = {
                            y: window.pageYOffset + window.innerHeight / 4 - this.originalState.position.y,
                            x: (window.innerWidth - this.floatingContainer.nativeElement.clientWidth) / 2 - this.originalState.position.x
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

        this.floatingContainer.nativeElement.classList.remove("ngx-mat-floating-component-hidden");

        if (this.options.activationAnimation.active && !this.hasMoved()) {
            if (this.options.activationAnimation.active == "all" || firstPosition == NgxMatFloatingFirstPosition.Origin) {
                this.floatingContainerAnimation.play();
            }
        }

        this.setPosition(this.relativePosition.x, this.relativePosition.y);

        if (this.hasMoved() || firstPosition != NgxMatFloatingFirstPosition.Origin) {
            this.stateChange.next(NgxMatFloatingWrapperStatus.InitialPosition);
            this.hidePlaceHolderElement();
        }

        if (this.options.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
            const matExpansionPanel: MatExpansionPanel = this.options.floatingElementInstance;
            matExpansionPanel.afterExpand.pipe(
                takeUntil(this.stateChange.pipe(filter((state: NgxMatFloatingWrapperStatus) => {
                    return state == NgxMatFloatingWrapperStatus.Pinned;
                })))
            ).subscribe((expandedStatus) => {
                this.adjustPlaceHolderHeight();
                // console.log("expand", expandedStatus, this.originalState);
            });

            matExpansionPanel.afterCollapse.pipe(
                takeUntil(this.stateChange.pipe(filter((state: NgxMatFloatingWrapperStatus) => {
                    return state == NgxMatFloatingWrapperStatus.Pinned;
                })))
            ).subscribe((expandedStatus) => {
                this.adjustPlaceHolderHeight();
                // console.log("collapse", expandedStatus, this.originalState);
            });
        }

        const dragHandleElement = this.getDragHandleElement();
        dragHandleElement.classList.add("ngx-mat-floating-drag-handle");

        this.pinned = false;
    }

    // noinspection JSMethodCanBeStatic
    private getAbsoluteOffset(element: HTMLElement): NgxMatFloatingPoint {
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
            if (ev.srcElement == placeholderElement) {
                this.placeHolderElement.classList.add("ngx-mat-floating-transition");
            }
        });

        return placeholderElement;
    }

    private setupEvents() {
        this.zone.runOutsideAngular(() => {
            const containerMouseDownEvent = fromEvent(this.floatingContainer.nativeElement, "mousedown");
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

            containerMouseDownEvent.pipe(takeUntil(this.destroySubject)).subscribe((_ev) => {
                for (let target: HTMLElement = (<HTMLElement>event.target); target; target = (<HTMLElement>target).parentElement) {
                    if (target == this.floatingContainer.nativeElement) {
                        hasDragged = false;
                        this.bringToFront();
                        break;
                    }
                }
            });

            const mouseDragEvent = dragHandleMouseDownEvent.pipe(takeUntil(this.destroySubject)).pipe(
                switchMap((ev: MouseEvent) => {
                    const targetClassList = (<HTMLElement>ev.target).classList;
                    if (this.pinned || targetClassList.contains("ngx-mat-floating-pin-button-icon") || targetClassList.contains("ngx-mat-floating-pin-button")) {
                        return mouseMoveEvent;
                    } else {
                        this.stateChange.next(NgxMatFloatingWrapperStatus.DragStart);

                        this.floatingContainer.nativeElement.classList.add("ngx-mat-floating-component-dragging");
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

                        this.stateChange.next(NgxMatFloatingWrapperStatus.Dragging);
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

                    this.floatingContainer.nativeElement.classList.remove("ngx-mat-floating-component-dragging");
                    this.stateChange.next(NgxMatFloatingWrapperStatus.DragEnd);
                }

                return !hasDragged;
            });
        });
    }

    private hideFloatingContainer() {
        if (this.floatingElementParent) {
            this.floatingElementParent.replaceChild(this.options.floatingElement, this.placeHolderElement);
            this.floatingContainer.nativeElement.classList.add("ngx-mat-floating-component-hidden");
            this.floatingElementParent = null;
        }
    }

    private hidePlaceHolderElement() {
        this.placeHolderElement.style.maxHeight = this.placeHolderElement.clientHeight + "px";
        setTimeout(() => {
            this.placeHolderElement.classList.add("ngx-mat-floating-transition");
            this.placeHolderElement.style.maxHeight = "0";
        }, 1);
    }

    private unHidePlaceHolderElement() {
        setTimeout(() => {
            this.placeHolderElement.classList.add("ngx-mat-floating-transition");
            this.placeHolderElement.style.maxHeight = this.originalState.boundingClientRect.height + parseFloat(this.floatingElementStyles.marginTop) + parseFloat(this.floatingElementStyles.marginBottom) + "px";
        }, 1);
    }

    private adjustPlaceHolderHeight() {
        if (!this.hasMoved()) {
            this.placeHolderElement.style.maxHeight = this.options.floatingElement.clientHeight + parseFloat(this.floatingElementStyles.marginTop) + parseFloat(this.floatingElementStyles.marginBottom) + "px";
        }
    }
}
