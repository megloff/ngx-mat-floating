import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {fromEvent, of, Subject} from "rxjs";
import {map, switchMap, takeUntil} from "rxjs/operators";

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
    contentContainerElement: HTMLElement;
    firstPosition?: NgxMatFloatingFirstPosition | NgxMatFloatingPoint;
    titleElement?: HTMLElement;
    width?: string | number;
    activationAnimation?: NgxMatFloatingActivationAnimation;
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
    @ViewChild("floatingWrapper") private floatingWrapper: ElementRef<HTMLDivElement>;
    @ViewChild("floatingTitle") private floatingTitle: ElementRef<HTMLDivElement>;
    @ViewChild("floatingContent") private floatingContent: ElementRef<HTMLDivElement>;

    private pinned: boolean = true;

    private options: NgxMatFloatingContainerOptions;
    private floatingContainerAnimation: Animation;

    private titleParentElement: HTMLElement;
    private contentParentElement: HTMLElement;
    private zIndex: number;

    private parentElementMarginOffset: NgxMatFloatingPoint;
    private relativePosition: NgxMatFloatingPoint;
    private parentElementPosition: NgxMatFloatingPoint;

    private resized: boolean = false;
    private delta = {x: 0, y: 0};
    private destroySubject: Subject<void> = new Subject<void>();

    private allowResize: boolean = true;
    private floatingContainerHasMoved: boolean = false;

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
            // make sure everything is properly reset
            this.hideFloatingContainer();

            const containerElementStyle = this.floatingContainer.nativeElement.style;

            if (this.options.titleElement) {
                this.titleParentElement = this.options.titleElement.parentElement;
                this.titleParentElement.replaceChild(this.createElementPlaceHolder(this.options.titleElement, "ngx-mat-floating-title-placeholder"), this.options.titleElement);
                this.floatingTitle.nativeElement.appendChild(this.options.titleElement);
            }

            this.contentParentElement = this.options.contentContainerElement.parentElement;

            this.contentParentElement.replaceChild(this.createElementPlaceHolder(this.options.contentContainerElement, "ngx-mat-floating-container-placeholder"), this.options.contentContainerElement);

            if (this.options.width) {
                containerElementStyle.width = typeof this.options.width == "number" ? this.options.width + "px" : this.options.width;
            }

            this.floatingContent.nativeElement.appendChild(this.options.contentContainerElement);

            const parentElementPosition = this.getAbsoluteOffset(this.contentParentElement);

            const styles: CSSStyleDeclaration = (<any>this.contentParentElement).currentStyle || window.getComputedStyle(this.contentParentElement);
            this.parentElementMarginOffset = {
                x: parseInt(styles.marginLeft, 10),
                y: parseInt(styles.marginTop, 10)
            };

            let firstPositionPoint: NgxMatFloatingPoint;
            let firstPosition: NgxMatFloatingFirstPosition;

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

            if (firstPositionPoint) {
                if (!this.relativePosition) {
                    this.relativePosition = {
                        y: firstPositionPoint.y - parentElementPosition.y,
                        x: firstPositionPoint.x - parentElementPosition.x
                    };
                    this.floatingContainerHasMoved = true;
                }
            } else {
                switch (firstPosition) {
                    case NgxMatFloatingFirstPosition.Centered:
                        if (!this.relativePosition) {
                            this.relativePosition = {
                                y: window.pageYOffset + window.innerHeight / 4 - parentElementPosition.y,
                                x: (window.innerWidth - this.options.contentContainerElement.clientWidth) / 2 - parentElementPosition.x
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

            this.adjustParentElementPosition(parentElementPosition);

            containerElementStyle.top = this.parentElementPosition.y + "px";
            containerElementStyle.left = this.parentElementPosition.x + "px";

            this.floatingContainer.nativeElement.classList.remove("ngx-mat-floating-component-hidden");

            if (this.options.activationAnimation.active && !this.floatingContainerHasMoved) {
                if (this.options.activationAnimation.active == "all" || firstPosition == NgxMatFloatingFirstPosition.Origin) {
                    this.floatingContainerAnimation.play();
                }
            }

            this.setPosition(this.relativePosition.x, this.relativePosition.y);

            if (this.floatingContainerHasMoved || firstPosition != NgxMatFloatingFirstPosition.Origin) {
                this.stateChange.next(NgxMatFloatingWrapperStatus.InitialPosition);
            }

            this.pinned = false;

            this.stateChange.next(NgxMatFloatingWrapperStatus.Unpinned);
        }
    }

    public changeToPinned() {
        if (!this.pinned) {
            const parentElementPosition = this.getAbsoluteOffset(this.contentParentElement);
            const floatingContainerPosition = this.getAbsoluteOffset(this.floatingContainer.nativeElement);

            this.adjustParentElementPosition(parentElementPosition);

            let x = this.parentElementPosition.x - floatingContainerPosition.x;
            let y = this.parentElementPosition.y - floatingContainerPosition.y;

            if (this.hasMoved()) {
                x += this.parentElementMarginOffset.x;
                y += this.parentElementMarginOffset.y;
            }

            this.setPosition(x, y);

            this.floatingContainerAnimation.cancel();

            this.pinned = true;
            this.stateChange.next(NgxMatFloatingWrapperStatus.Pinned);
        }
    }

    public getDragHandleElement(): HTMLElement {
        return this.floatingTitle.nativeElement;
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
            const topLeft = this.getAbsoluteOffset(this.contentParentElement);
            position.x += topLeft.x;
            position.y += topLeft.y;
        }

        return position;
    }

    public getBoundingRect(): ClientRect | DOMRect {
        return this.floatingContainer.nativeElement.getBoundingClientRect();
    }

    public setWrapperClass(wrapperClass: string) {
        this.floatingWrapper.nativeElement.classList.add(...wrapperClass.split(/ /));
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

        this.floatingContainer.nativeElement.addEventListener("transitionend", (ev) => {
            if (ev.srcElement == this.floatingContainer.nativeElement) {
                if (this.pinned) {
                    this.hideFloatingContainer();
                    this.floatingContainer.nativeElement.style.transform = "translate(0px, 0px)";
                }
            }
        });

        this.floatingContainer.nativeElement.addEventListener("animationend", (ev) => {
            if (ev.srcElement == this.floatingContainer.nativeElement) {
                this.floatingContainerAnimation.cancel();
            }
        });

        let animationKeyframes: Keyframe[] = this.options.activationAnimation.keyframes;
        if (typeof animationKeyframes != "object" || !animationKeyframes.lastIndexOf) {
            animationKeyframes = [{
                boxShadow: `0 0 5px -5px ${this.options.activationAnimation.color || "sandybrown"}`
            }, {
                boxShadow: `0 0 5px 5px ${this.options.activationAnimation.color || "sandybrown"}`
            }];
        }

        const animationOptions: KeyframeAnimationOptions = Object.assign({
            duration: 90,
            iterations: 4,
            direction: "alternate",
            easing: "ease"
        }, this.options.activationAnimation.options || {});

        this.floatingContainerAnimation = this.floatingContainer.nativeElement.animate(animationKeyframes, animationOptions);
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

    private adjustParentElementPosition(parentElementPosition: NgxMatFloatingPoint) {
        if (!this.parentElementPosition) {
            this.parentElementPosition = parentElementPosition;
        }

        const delta = {
            x: parentElementPosition.x - this.parentElementPosition.x,
            y: parentElementPosition.y - this.parentElementPosition.y
        };

        this.relativePosition.x -= delta.x;
        this.relativePosition.y -= delta.y;

        this.parentElementPosition = parentElementPosition;
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
    private createElementPlaceHolder(referenceElement: HTMLElement, tagName?: string): HTMLElement {
        const placeholderElement = document.createElement(tagName || "div");
        placeholderElement.style.display = "block";
        placeholderElement.style.height = referenceElement.clientHeight + "px";
        placeholderElement.style.width = referenceElement.clientWidth + "px";
        placeholderElement.style.marginTop = referenceElement.style.marginTop;
        placeholderElement.style.marginBottom = referenceElement.style.marginBottom;

        return placeholderElement;
    }

    private setupEvents() {
        this.zone.runOutsideAngular(() => {
            const containerMouseDownEvent = fromEvent(this.floatingContainer.nativeElement, "mousedown");
            const dragHandleMouseDownEvent = fromEvent(this.getDragHandleElement(), "mousedown");
            const mouseUpEvent = fromEvent(document, "mouseup");
            const mouseMoveEvent = fromEvent(document, "mousemove");

            containerMouseDownEvent.pipe(takeUntil(this.destroySubject)).subscribe((ev) => {
                for (let target: HTMLElement = (<HTMLElement>event.target); target; target = (<HTMLElement>target).parentElement) {
                    if (target == this.floatingContainer.nativeElement) {
                        ev.preventDefault();
                        ev.stopPropagation();
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

            mouseDragEvent.pipe(takeUntil(this.destroySubject)).subscribe(() => {
                if (!this.pinned) {
                    if (this.delta.x !== 0 && this.delta.y !== 0) {
                        this.stateChange.next(NgxMatFloatingWrapperStatus.Dragging);
                        this.contentParentElement.classList.add();
                        requestAnimationFrame(() => {
                            this.setPosition(this.relativePosition.x + this.delta.x, this.relativePosition.y + this.delta.y);
                        });
                    }
                }
            });

            mouseUpEvent.pipe(takeUntil(this.destroySubject)).subscribe(() => {
                if (!this.pinned) {
                    this.relativePosition.x += this.delta.x;
                    this.relativePosition.y += this.delta.y;
                    this.delta = {x: 0, y: 0};
                    this.changeDetector.markForCheck();

                    this.floatingContainer.nativeElement.classList.remove("ngx-mat-floating-component-dragging");
                    this.stateChange.next(NgxMatFloatingWrapperStatus.DragEnd);
                }
            });
        });
    }

    private hideFloatingContainer() {
        this.floatingContainer.nativeElement.classList.add("ngx-mat-floating-component-hidden");

        if (this.titleParentElement) {
            const titlePlaceholderElement = this.titleParentElement.querySelector("ngx-mat-floating-title-placeholder");
            if (titlePlaceholderElement) {
                this.titleParentElement.replaceChild(this.floatingTitle.nativeElement.firstElementChild, titlePlaceholderElement);
            }
            this.titleParentElement = null;
        }

        if (this.contentParentElement) {
            const contentPlaceholderElement = this.contentParentElement.querySelector("ngx-mat-floating-container-placeholder");
            if (contentPlaceholderElement) {
                this.contentParentElement.replaceChild(this.floatingContent.nativeElement.firstElementChild, contentPlaceholderElement);
            }
            this.contentParentElement = null;
        }
    }
}
