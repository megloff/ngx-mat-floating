import {AfterViewInit, ChangeDetectorRef, ComponentFactoryResolver, ComponentRef, Directive, ElementRef, EventEmitter, Injector, Input, OnInit, Output, ViewContainerRef} from "@angular/core";

import {MatExpansionPanel} from "@angular/material/expansion";

import {
    NgxMatFloatingActivationAnimation,
    NgxMatFloatingFirstPosition,
    NgxMatFloatingPoint,
    NgxMatFloatingWrapperComponent,
    NgxMatFloatingWrapperStatus
} from "../ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";

import {NgxMatFloatingElementType, NgxMatFloatingGlobalService, NgxMatFloatingInjector, NgxMatFloatingService} from "../ngx-mat-floating.service";
import {NgxMatFloatingPinComponentInterface} from "../ngx-mat-floating-pin/ngx-mat-floating-pin.component.interface";
import {NgxMatFloatingPinComponent} from "../ngx-mat-floating-pin/ngx-mat-floating-pin.component";
import {NgxMatFloatingDirectiveInterface} from "./ngx-mat-floating.directive.interface";
import {MatCard} from "@angular/material/card";

export interface NxgMatFloatingStatusChangeEvent {
    type: NgxMatFloatingWrapperStatus;
    component: NgxMatFloatingDirective;
    position: NgxMatFloatingPoint;
}

export interface NxgMatFloatingAttachmentEvent {
    type: "attach" | "detach";
    component: NgxMatFloatingDirective;
    position: NgxMatFloatingPoint;
}

@Directive({
    selector: "[ngxMatFloating],[ngx-mat-floating]"
})
export class NgxMatFloatingDirective implements OnInit, AfterViewInit, NgxMatFloatingDirectiveInterface {
    public pinButtons: (NgxMatFloatingPinComponentInterface | HTMLButtonElement)[] = [];

    @Output("detach") detach: EventEmitter<NxgMatFloatingAttachmentEvent> = new EventEmitter();
    @Output("reattach") reattach: EventEmitter<NxgMatFloatingAttachmentEvent> = new EventEmitter();
    @Output("stateChange") stateChange: EventEmitter<NxgMatFloatingStatusChangeEvent> = new EventEmitter();

    @Input("floatingWidth") private floatingComponentWidth: string;
    @Input("floatingHeight") private floatingComponentHeight: string;
    @Input("firstPosition") private firstPosition: NgxMatFloatingFirstPosition | NgxMatFloatingPoint = NgxMatFloatingFirstPosition.Origin;
    @Input("wrapperClass") private wrapperClass: string;
    @Input("activationAnimation") private activationAnimation: boolean | string | NgxMatFloatingActivationAnimation = {active: true};
    @Input("rememberPosition") private rememberPosition: boolean = true;

    private floatingElement: HTMLElement;

    private headerTitleElement: HTMLElement;
    private floatingViewElement: HTMLElement;
    private floatingViewInstance: NgxMatFloatingWrapperComponent;

    private pinned: boolean = true;

    private readonly elementType: NgxMatFloatingElementType;
    private readonly floatingElementInstance: any;

    constructor(private el: ElementRef, private viewContainerRef: ViewContainerRef, private injector: Injector,
                private componentFactoryResolver: ComponentFactoryResolver, private service: NgxMatFloatingService,
                private changeDetector: ChangeDetectorRef) {
        try {
            this.floatingElementInstance = this.injector.get(MatExpansionPanel);
            this.elementType = NgxMatFloatingElementType.MatExpansionPanel;
        } catch {
            try {
                this.floatingElementInstance = this.injector.get(MatCard);
                this.elementType = NgxMatFloatingElementType.MatCard;
            } catch {
                this.elementType = NgxMatFloatingElementType.Generic;
            }
        }
    }

    static registerPinButton(floatingDirective: HTMLElement | ElementRef | NgxMatFloatingDirectiveInterface, pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement, errorText?: string) {
        const fd = NgxMatFloatingGlobalService.getFloatingDirective(floatingDirective);

        if (fd) {
            if (pinButton instanceof HTMLButtonElement) {
                (<any>pinButton).__ngxMatFloatingToogle = fd.togglePin.bind(fd);
                pinButton.addEventListener("click", (<any>pinButton).__ngxMatFloatingToogle);
            }
            fd.pinButtons.push(pinButton);
        } else {
            console.error(errorText || "you must pass a reference to a element marked with ngxMatFloating", floatingDirective);
        }
    }

    static unregisterPinButton(floatingDirective: HTMLElement | ElementRef | NgxMatFloatingDirectiveInterface, pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement) {
        const fd = NgxMatFloatingGlobalService.getFloatingDirective(floatingDirective);

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

        this.floatingViewInstance.changeToUnpinned();
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

        this.pinned = true;
    }

    public registerPinButton(pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement, errorText?: string) {
        NgxMatFloatingDirective.registerPinButton(this, pinButton, errorText);
    }

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

        if (!this.headerTitleElement) {
            if (this.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
                this.headerTitleElement = this.floatingElement.querySelector(".mat-expansion-panel-header");
            } else if (this.elementType == NgxMatFloatingElementType.MatCard) {
                this.headerTitleElement = this.floatingElement.querySelector(".mat-card-title");
            }
        }
    }

    /**
     * @hidden
     * @exclude
     * @ignore
     * @internal
     */
    ngAfterViewInit() {
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

            this.floatingViewElement = component.location.nativeElement;
            this.floatingViewInstance = component.instance;

//            this.floatingViewElement.style.display = this.floatingElement.parentElement.style.display;

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

            if (this.pinButtons.length === 0) {
                if (this.headerTitleElement) {
                    if (this.elementType == NgxMatFloatingElementType.MatExpansionPanel) {
                        const titleElement: HTMLElement = this.headerTitleElement.querySelector(".mat-expansion-panel-header-title");
                        let descriptionElement: HTMLElement = this.headerTitleElement.querySelector(".mat-expansion-panel-header-description");
                        if (!descriptionElement) {
                            if (titleElement) {
                                descriptionElement = document.createElement("MAT-PANEL-DESCRIPTION");
                                descriptionElement.classList.add("mat-expansion-panel-header-description");
                                titleElement.parentElement.appendChild(descriptionElement);
                            }
                        }

                        if (descriptionElement) {
                            const pinComponentRef = this.getPinButtonComonent();
                            descriptionElement.appendChild(pinComponentRef.location.nativeElement);
                        }
                    } else if (this.elementType == NgxMatFloatingElementType.MatCard) {
                        const pinComponentRef = this.getPinButtonComonent();
                        (<HTMLElement>pinComponentRef.location.nativeElement).style.float = "right";

                        this.headerTitleElement.appendChild(pinComponentRef.location.nativeElement);
                    }
                }
            }

            this.floatingViewInstance.setOptions({
                floatingElement: this.floatingElement,
                floatingElementInstance: this.floatingElementInstance,
                elementType: this.elementType,
                dragHandle: this.headerTitleElement,
                elementClassList: this.floatingElement.classList.toString().replace(/(mat-focus-indicator\s*|ng-trigger-\S+\s*)/g, ""),
                width: this.floatingComponentWidth,
                height: this.floatingComponentHeight,
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

                    case NgxMatFloatingWrapperStatus.Pinned:
                        this.reattach.emit({
                            type: "attach",
                            component: this,
                            position: this.floatingViewInstance.getPosition()
                        });
                        console.log("attach");
                        break;

                    case NgxMatFloatingWrapperStatus.Unpinned:
                        console.log("detach");
                        this.detach.emit({
                            type: "detach",
                            component: this,
                            position: this.floatingViewInstance.getPosition()
                        });
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

    private getPinButtonComonent(): ComponentRef<NgxMatFloatingPinComponent> {
        const componentFactoryResolver = NgxMatFloatingInjector.get(ComponentFactoryResolver);

        let pinComponentRef: ComponentRef<NgxMatFloatingPinComponent>;
        const pinFactory = componentFactoryResolver.resolveComponentFactory(NgxMatFloatingPinComponent);
        pinComponentRef = pinFactory.create(this.viewContainerRef.parentInjector);

        pinComponentRef.instance.floatingDirective = this;
        pinComponentRef.instance.ngOnInit();
        pinComponentRef.instance.ngAfterViewInit();

        return pinComponentRef;
    }
}
