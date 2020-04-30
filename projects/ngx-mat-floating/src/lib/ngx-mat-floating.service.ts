import {ApplicationRef, Injectable, Injector, ViewContainerRef} from "@angular/core";

export let NgxMatFloatingInjector: Injector;
export let NgxMatFloatingApplicationRef: ApplicationRef;

@Injectable({
    providedIn: "root"
})
export class NgxMatFloatingService {
    private rootViewContainerRef: ViewContainerRef;
    private readonly transitionEndEvenName: string;

    constructor(private injector: Injector, public applicationRef: ApplicationRef) {
        NgxMatFloatingApplicationRef = applicationRef;
        NgxMatFloatingInjector = injector;
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
