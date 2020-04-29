import {AfterViewInit, ComponentFactoryResolver, Directive, ElementRef, EventEmitter, Input, OnInit, Output} from "@angular/core";

import {NgxMatFloatingWrapperComponent, NgxMatFloatingWrapperStatus, RelativeReference} from "../ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";
import {NgxMatFloatingPinComponent} from "../ngx-mat-floating-pin/ngx-mat-floating-pin.component";
import {NgxMatFloatingService} from "../ngx-mat-floating.service";

export interface NxgMatFloatingStatusChangeEvent {
    type: NgxMatFloatingWrapperStatus;
    component: NgxMatFloatingDirective;
}

@Directive({
    selector: "[ngxMatFloating]"
})
export class NgxMatFloatingDirective implements OnInit, AfterViewInit {
    @Input("floatingWidth") floatingComponentWidth: string;
    @Input("relativeTo") floatingComponentRelative: RelativeReference = RelativeReference.origin;
    @Input("wrapperClass") wrapperClass: string;

    @Output() stateChange: EventEmitter<NxgMatFloatingStatusChangeEvent> = new EventEmitter();

    private floatingElement: HTMLElement;
    private floatingElementMaxHeight: string;

    private headerTitleElement: HTMLElement;
    private contentContainerElement: HTMLDivElement;
    private floatingViewElement: HTMLElement;
    private floatingViewInstance: NgxMatFloatingWrapperComponent;

    private pinButtons: NgxMatFloatingPinComponent[] = [];

    constructor(
        private el: ElementRef,
        private componentFactoryResolver: ComponentFactoryResolver,
        private service: NgxMatFloatingService
    ) {
        // no code
    }

    public unpinElement(ev?: MouseEvent) {
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }

        this.pinButtons.forEach((button) => {
            button.pinned = false;
        });

        this.floatingElementMaxHeight = this.floatingElement.style.maxHeight;
        this.floatingElement.style.maxHeight = this.floatingElement.clientHeight + "px";

        this.floatingViewInstance.changeToUnpinned({
            titleElement: this.headerTitleElement,
            contentContainerElement: this.contentContainerElement,
            width: this.floatingComponentWidth,
            relativeReference: this.floatingComponentRelative
        });
    }

    public pinElement(ev?: MouseEvent) {
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }

        this.floatingViewInstance.changeToPinned();

        this.pinButtons.forEach((button) => {
            button.pinned = true;
        });
    }

    public registerPinButton(pinButton: NgxMatFloatingPinComponent) {
        this.pinButtons.push(pinButton);
    }

    ngOnInit() {
        (<any>this.el.nativeElement).__ngMatFloatingDirective = this;

        this.floatingElement = this.el.nativeElement;
        this.headerTitleElement = this.floatingElement.querySelector("[ngxMatFloatingTitle]");
        this.contentContainerElement = this.floatingElement.querySelector("[ngxMatFloatingContent]");

        if (!this.contentContainerElement) {
            console.warn("you must mark your content element with ngxMatFloatingContent")
        }
    }

    ngAfterViewInit() {
        this.floatingElement.addEventListener("transitionend", (ev) => {
            if (ev.srcElement == this.floatingElement) {
                this.floatingElement.classList.remove("ngx-mat-floating-transition");
                if (this.floatingViewInstance.isPinned()) {
                    this.floatingElement.style.maxHeight = this.floatingElementMaxHeight;
                }
            }
        });

        // 30 ms of polling is enough, because once NgxMatAppServices is available, it should initialize the
        // root view container reference within 10ms.
        this.insertFloatingWrapper(30);
    }

    private insertFloatingWrapper(pollingTimeout: number) {
        let pollRetryTime = 10; // retry every 10ms

        // the root view might not be present yet when we're initializing -> try again a few ticks later
        const rootContainerViewRef = this.service.getRootViewContainerRef();
        if (rootContainerViewRef) {
            const factory = this.componentFactoryResolver.resolveComponentFactory(NgxMatFloatingWrapperComponent);
            const component = factory.create(rootContainerViewRef.parentInjector);

            this.floatingViewElement = component.location.nativeElement;
            this.floatingViewInstance = component.instance;

            this.floatingViewElement.style.display = this.floatingElement.parentElement.style.display;

            rootContainerViewRef.insert(component.hostView);

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
                        this.floatingElement.classList.add("ngx-mat-floating-transition");
                        this.floatingElement.classList.remove("ngx-mat-floating-unpinned");
                        break;
                }

                this.stateChange.emit({
                    type: status,
                    component: this
                });
            });
        } else {
            if (pollingTimeout > 0) {
                setTimeout(() => {
                    this.insertFloatingWrapper(pollingTimeout - pollRetryTime);
                }, pollRetryTime);
            } else {
                console.warn("To use an element with ngxMatFloating, your application component must inherit from NgxMatFloatingAppComponent!");
            }
        }
    }
}
