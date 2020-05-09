import {AfterViewInit, ComponentFactoryResolver, Directive, ElementRef, EventEmitter, Input, OnInit, Output} from "@angular/core";

import {NgxMatFloatingElementType, NgxMatFloatingService} from "../ngx-mat-floating.service";
import {NgxMatFloatingPinComponentInterface} from "../ngx-mat-floating-pin/ngx-mat-floating-pin.component.interface";
import {
    NgxMatFloatingActivationAnimation,
    NgxMatFloatingFirstPosition,
    NgxMatFloatingPoint,
    NgxMatFloatingWrapperComponent,
    NgxMatFloatingWrapperStatus
} from "../ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";
import {MatExpansionPanel} from "@angular/material/expansion";
import {first} from "rxjs/operators";

interface NgxMatFloatingParentElementState {
    expanded?: boolean;
}

export interface NxgMatFloatingStatusChangeEvent {
    type: NgxMatFloatingWrapperStatus;
    component: NgxMatFloatingDirective;
    position: NgxMatFloatingPoint;
}

@Directive({
    selector: "[ngxMatFloating]"
})
export class NgxMatFloatingDirective implements OnInit, AfterViewInit {
    @Output() stateChange: EventEmitter<NxgMatFloatingStatusChangeEvent> = new EventEmitter();

    @Input("floatingWidth") private floatingComponentWidth: string;
    @Input("firstPosition") private firstPosition: NgxMatFloatingFirstPosition | NgxMatFloatingPoint = NgxMatFloatingFirstPosition.Origin;
    @Input("wrapperClass") private wrapperClass: string;
    @Input("activationAnimation") private activationAnimation: boolean | string | NgxMatFloatingActivationAnimation = {active: true};
    @Input("rememberPosition") private rememberPosition: boolean = true;

    private floatingElement: HTMLElement;
    private floatingElementMaxHeight: string;

    private headerTitleElement: HTMLElement;
    private contentContainerElement: HTMLDivElement;
    private floatingViewElement: HTMLElement;
    private floatingViewInstance: NgxMatFloatingWrapperComponent;

    private pinned: boolean = true;
    private pinButtons: (NgxMatFloatingPinComponentInterface | HTMLButtonElement)[] = [];

    private elementType: NgxMatFloatingElementType;
    private floatingElementInstance: any;
    private originalState: NgxMatFloatingParentElementState = {};

    constructor(
        private el: ElementRef,
        private componentFactoryResolver: ComponentFactoryResolver,
        private service: NgxMatFloatingService
    ) {
        // no code
    }

    static registerPinButton(floatingDirective: HTMLElement | ElementRef | NgxMatFloatingDirective, pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement, errorText?: string) {
        const fd = NgxMatFloatingDirective.getFloatingDirective(floatingDirective);

        if (fd) {
            if (pinButton instanceof HTMLButtonElement) {
                (<any>pinButton).__ngxMatFloatingToogle = fd.togglePin.bind(fd);
                pinButton.addEventListener("click", (<any>pinButton).__ngxMatFloatingToogle);
            } else if (pinButton.getFloatingElementInstance) {
                fd.floatingElementInstance = pinButton.getFloatingElementInstance();
            }
            fd.pinButtons.push(pinButton);
        } else {
            console.error(errorText || "you must pass a reference to a element marked with ngxMatFloating", floatingDirective);
        }
    }

    static unregisterPinButton(floatingDirective: HTMLElement | ElementRef | NgxMatFloatingDirective, pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement) {
        const fd = NgxMatFloatingDirective.getFloatingDirective(floatingDirective);

        if (fd) {
            if (pinButton instanceof HTMLButtonElement && (<any>pinButton).__ngxMatFloatingToogle) {
                pinButton.removeEventListener("click", (<any>pinButton).__ngxMatFloatingToogle);
                (<any>pinButton).__ngxMatFloatingToogle = null;
            }

            const idx = fd.pinButtons.findIndex((button) => {
                return button == pinButton;
            });

            if (idx >= 0) {
                fd.pinButtons.splice(idx, 1);
            }
        } else {
            console.error("you must pass a reference to a element marked with ngxMatFloating", floatingDirective);
        }
    }

    static getFloatingDirective(floatingElement: HTMLElement | ElementRef | NgxMatFloatingDirective): NgxMatFloatingDirective {
        let floatingDirective: NgxMatFloatingDirective;

        if (floatingElement instanceof NgxMatFloatingDirective) {
            floatingDirective = floatingElement;
        } else if (floatingElement) {
            if ((<any>floatingElement).nativeElement) {
                (<any>floatingElement) = (<any>floatingElement).nativeElement;
            }

            if ((<any>floatingElement).__ngxMatFloatingDirective) {
                floatingDirective = (<any>floatingElement).__ngxMatFloatingDirective;
            } else if ((<any>floatingElement)._viewContainerRef) {
                if ((<any>floatingElement)._viewContainerRef.element) {
                    if ((<any>floatingElement)._viewContainerRef.element.__ngxMatFloatingDirective) {
                        floatingDirective = (<any>floatingElement)._viewContainerRef.element.__ngxMatFloatingDirective;
                    } else if ((<any>floatingElement)._viewContainerRef.element.nativeElement && (<any>floatingElement)._viewContainerRef.element.nativeElement.__ngxMatFloatingDirective) {
                        floatingDirective = (<any>floatingElement)._viewContainerRef.element.nativeElement.__ngxMatFloatingDirective;
                    }
                }
            }
        }

        return floatingDirective instanceof NgxMatFloatingDirective ? floatingDirective : null;
    }

    // noinspection JSUnusedGlobalSymbols
    public isPinned(): boolean {
        return this.pinned;
    }

    public togglePin(ev?: MouseEvent) {
        if (this.pinned) {
            this.unpinElement(ev);
        } else {
            this.pinElement(ev);
        }
    }

    // noinspection JSUnusedGlobalSymbols
    public setPinned(pinned, ev?: MouseEvent) {
        if (pinned) {
            this.pinElement(ev);
        } else {
            this.unpinElement(ev);
        }
    }

    public unpinElement(ev?: MouseEvent) {
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }

        this.pinButtons.forEach((button: NgxMatFloatingPinComponentInterface) => {
            if (button.setLocalPinnedFlag) {
                button.setLocalPinnedFlag(false);
            }
        });

        this.pinned = false;

        if (this.floatingElementMaxHeight === undefined) {
            this.floatingElementMaxHeight = this.floatingElement.style.maxHeight;
        }

        this.floatingElement.style.maxHeight = this.floatingElement.clientHeight + "px";
        this.floatingElement.classList.add("ngx-mat-floating-placeholder");

        if (this.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
            const matExpansionPanel: MatExpansionPanel = this.floatingElementInstance;
            this.originalState.expanded = matExpansionPanel.expanded;

            if (matExpansionPanel.expanded) {
                this.floatingViewInstance.changeToUnpinned();
            } else {
                matExpansionPanel.afterExpand.pipe(first()).subscribe((message) => {
                    this.floatingViewInstance.changeToUnpinned();
                });

                matExpansionPanel.expanded = true;
            }
        } else {
            this.floatingViewInstance.changeToUnpinned();
        }
    }

    public pinElement(ev?: MouseEvent) {
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }

        this.floatingViewInstance.changeToPinned();

        this.pinButtons.forEach((button: NgxMatFloatingPinComponentInterface) => {
            if (button.setLocalPinnedFlag) {
                button.setLocalPinnedFlag(true);
            }
        });

        if (this.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
            const matExpansionPanel: MatExpansionPanel = this.floatingElementInstance;
            if (!this.originalState.expanded) {
                matExpansionPanel.expanded = false;
            }
        }

        this.pinned = true;
    }

    // noinspection JSUnusedGlobalSymbols
    public registerPinButton(pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement) {
        NgxMatFloatingDirective.registerPinButton(this, pinButton);
    }

    // noinspection JSUnusedGlobalSymbols
    public unregisterPinButton(pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement) {
        NgxMatFloatingDirective.unregisterPinButton(this, pinButton);
    }

    /**
     * @hidden
     * @exclude
     * @ignore
     * @internal
     */
    ngOnInit() {
        (<any>this.el.nativeElement).__ngxMatFloatingDirective = this;

        this.floatingElement = this.el.nativeElement;
        this.headerTitleElement = this.floatingElement.querySelector("[ngxMatFloatingTitle]");
        this.contentContainerElement = this.floatingElement.querySelector("[ngxMatFloatingContent]");

        switch (this.floatingElement.tagName) {
            case "MAT-EXPANSION-PANEL":
                this.elementType = NgxMatFloatingElementType.MatExpansionPanel;
                break;
            case "DIV":
                this.elementType = NgxMatFloatingElementType.Generic;
                break;

            default:
                console.log("untested element type", this.floatingElement.tagName);
                this.elementType = NgxMatFloatingElementType.Generic;
                break;
        }

        if (!this.contentContainerElement) {
            console.warn("you must mark your content element with ngxMatFloatingContent");
        }
    }

    /**
     * @hidden
     * @exclude
     * @ignore
     * @internal
     */
    ngAfterViewInit() {
        this.floatingElement.addEventListener("transitionend", (ev) => {
            if (ev.srcElement == this.floatingElement) {
                this.floatingElement.classList.remove("ngx-mat-floating-transition");
                if (this.floatingViewInstance.isPinned()) {
                    this.floatingElement.style.maxHeight = this.floatingElementMaxHeight;
                    this.floatingElement.classList.remove("ngx-mat-floating-placeholder");
                }
            }
        });

        // 30 ms of polling is enough, because once NgxMatFloatingAppServices is available, it should initialize the
        // root view container reference within the next 10ms.
        this.insertFloatingWrapper(30);
    }

    private insertFloatingWrapper(pollingTimeout: number) {
        const pollRetryTime = 10; // retry every 10ms

        // the root view might not be present yet when we're initializing -> try again a few ticks later
        const rootContainerViewRef = this.service.getRootViewContainerRef();
        if (rootContainerViewRef) {
            const factory = this.componentFactoryResolver.resolveComponentFactory(NgxMatFloatingWrapperComponent);
            const component = factory.create(rootContainerViewRef.parentInjector);

            this.floatingViewElement = component.location.nativeElement.firstElementChild;
            this.floatingViewInstance = component.instance;

            const rect = this.floatingElement.getBoundingClientRect();

            this.floatingViewElement.style.width = rect.width + "px";
            this.floatingViewElement.style.display = this.floatingElement.parentElement.style.display;

            rootContainerViewRef.insert(component.hostView);

            let activationAnimation: NgxMatFloatingActivationAnimation;
            if (this.activationAnimation) {
                if (this.activationAnimation == "all") {
                    activationAnimation = {
                        active: "all"
                    };
                } else if (typeof this.activationAnimation != "object") {
                    activationAnimation = {
                        active: this.service.getBooleanValue(this.activationAnimation as (string | number | boolean), true)
                    };
                } else {
                    this.activationAnimation = Object.assign({
                        active: true
                    }, this.activationAnimation);

                    activationAnimation = this.activationAnimation as NgxMatFloatingActivationAnimation;
                }
            }

            this.floatingViewInstance.setOptions({
                floatingElement: this.floatingElement,
                elementType: this.elementType,
                titleElement: this.headerTitleElement,
                elementClassList: this.floatingElement.classList.toString().replace(/(mat-focus-indicator\s*|ng-trigger-\S+\s*)/g, ""),
                contentContainerElement: this.contentContainerElement,
                width: this.floatingComponentWidth,
                firstPosition: this.firstPosition,
                activationAnimation: activationAnimation
            });

            this.floatingViewInstance.stateChange.subscribe((status: NgxMatFloatingWrapperStatus) => {
                switch (status) {
                    case NgxMatFloatingWrapperStatus.Ready:
                        if (this.wrapperClass) {
                            this.floatingViewInstance.setWrapperClass(this.wrapperClass);
                        }
                        break;

                    case NgxMatFloatingWrapperStatus.InitialPosition:
                    case NgxMatFloatingWrapperStatus.DragStart:
                            this.floatingElement.classList.add("ngx-mat-floating-transition");
                            this.floatingElement.classList.add("ngx-mat-floating-unpinned");
                        break;

                    case NgxMatFloatingWrapperStatus.Pinned:
                        if (this.floatingViewInstance.hasMoved()) {
                            this.floatingElement.classList.add("ngx-mat-floating-transition");
                        } else {
                            this.floatingElement.style.maxHeight = this.floatingElementMaxHeight;
                            this.floatingElement.classList.remove("ngx-mat-floating-placeholder");
                        }
                        this.floatingElement.classList.remove("ngx-mat-floating-unpinned");
                        break;
                }

                this.stateChange.emit({
                    type: status,
                    component: this,
                    position: this.floatingViewInstance.getPosition()
                });
            });
        } else {
            if (pollingTimeout > 0) {
                setTimeout(() => {
                    this.insertFloatingWrapper(pollingTimeout - pollRetryTime);
                }, pollRetryTime);
            } else {
                console.error("To use an element with ngxMatFloating, your application component must inherit from NgxMatFloatingAppComponent!");
            }
        }
    }
}
