import {ApplicationRef, ElementRef, Injectable, Injector, ViewContainerRef} from "@angular/core";
import {NgxMatFloatingDirectiveInterface} from "./directive/ngx-mat-floating.directive.interface";

export let NgxMatFloatingInjector: Injector;
export let NgxMatFloatingApplicationRef: ApplicationRef;

export enum NgxMatFloatingElementType { Generic, MatExpansionPanel}

@Injectable({
    providedIn: "root"
})
export class NgxMatFloatingService {
    private rootViewContainerRef: ViewContainerRef;

    constructor(private injector: Injector, public applicationRef: ApplicationRef) {
        NgxMatFloatingApplicationRef = applicationRef;
        NgxMatFloatingInjector = injector;
    }

    static getFloatingDirective(floatingElement: HTMLElement | ElementRef | NgxMatFloatingDirectiveInterface): NgxMatFloatingDirectiveInterface {
        let floatingDirective: NgxMatFloatingDirectiveInterface;

        if ((<NgxMatFloatingDirectiveInterface>floatingElement).pinButtons) {
            floatingDirective = floatingElement as NgxMatFloatingDirectiveInterface;
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

        return floatingDirective.pinButtons ? floatingDirective : null;
    }

    public setRootViewContainerRef(rootViewContainerRef: ViewContainerRef) {
        this.rootViewContainerRef = rootViewContainerRef;
    }

    public getRootViewContainerRef(): ViewContainerRef {
        return this.rootViewContainerRef;
    }

    public getBooleanValue(value: boolean | string | number, defaultValue?: boolean): boolean {
        if (value === "" || value === undefined) {
            value = !!defaultValue;
        } else if (typeof value == "string") {
            value = value.toLowerCase();
            value = value != "false" && value != "no" && value != "0";
        }

        return !!value;
    }

}
