import {ApplicationRef, ElementRef, Injectable, Injector, ViewContainerRef} from "@angular/core";
import {NgxMatFloatingDirectiveInterface} from "./directive/ngx-mat-floating.directive.interface";
import {NgxMatFloatingHtmlElement} from "./directive/ngx-mat-floating.directive";

export let NgxMatFloatingInjector: Injector;
export let NgxMatFloatingApplicationRef: ApplicationRef;
export let NgxMatFloatingGlobalService: NgxMatFloatingService;

export enum NgxMatFloatingElementType { Generic, MatCard, MatExpansionPanel, MatDialog}

@Injectable({
    providedIn: "root"
})
export class NgxMatFloatingService {
    // noinspection JSUnusedGlobalSymbols
    public floatingDirectives: { [id: string]: NgxMatFloatingDirectiveInterface } = {};

    private rootViewContainerRef: ViewContainerRef;

    constructor(private injector: Injector, public applicationRef: ApplicationRef) {
        NgxMatFloatingGlobalService = this;
        NgxMatFloatingApplicationRef = applicationRef;
        NgxMatFloatingInjector = injector;
    }

    // noinspection OverlyComplexFunctionJS
    public getFloatingDirective(floatingElement: NgxMatFloatingHtmlElement | ElementRef | NgxMatFloatingDirectiveInterface): NgxMatFloatingDirectiveInterface {
        let floatingDirective: NgxMatFloatingDirectiveInterface;

        if ((<NgxMatFloatingDirectiveInterface>floatingElement).pinButtons) {
            floatingDirective = floatingElement as NgxMatFloatingDirectiveInterface;
        } else if (floatingElement) {
            if ((<ElementRef>floatingElement).nativeElement) {
                floatingElement = (<ElementRef>floatingElement).nativeElement;
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
            } else {
                for (let e: NgxMatFloatingHtmlElement = floatingElement as NgxMatFloatingHtmlElement; e; e = e.parentElement as NgxMatFloatingHtmlElement) {
                    if (e.__ngxMatFloatingDirective) {
                        floatingDirective = e.__ngxMatFloatingDirective;
                        break;
                    }
                }
            }
        }

        return floatingDirective && floatingDirective.pinButtons ? floatingDirective : null;
    }

    // noinspection JSUnusedGlobalSymbols,FunctionWithMultipleLoopsJS
    public getTagPathId(element: HTMLElement): string {
        let id = "";

        for (let e = element; e; e = e.parentElement) {
            let idx: number = 0;
            for (let s: HTMLElement = e.previousSibling as HTMLElement; s; s = s.previousSibling as HTMLElement) {
                if (s.nodeType == 1 && s.tagName == e.tagName) {
                    idx++;
                }
            }

            if (idx > 0) {
                id = "." + e.tagName + "[" + idx + "]" + id;
            } else {
                id = "." + e.tagName + id;
            }
        }

        return id.replace(/\.$/, "");
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
