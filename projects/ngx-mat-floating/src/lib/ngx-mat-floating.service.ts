import {ApplicationRef, Injectable, Injector, ViewContainerRef} from "@angular/core";

export let NgxMatFloatingInjector: Injector;
export let NgxMatApplicationRef: ApplicationRef;

@Injectable({
    providedIn: "root"
})
export class NgxMatFloatingService {
    private rootViewContainerRef: ViewContainerRef;
    private readonly transitionEndEvenName: string;

    constructor(private injector: Injector, public applicationRef: ApplicationRef) {
        NgxMatApplicationRef = applicationRef;
        NgxMatFloatingInjector = injector;
    }

    public setRootViewContainerRef(rootViewContainerRef: ViewContainerRef) {
        this.rootViewContainerRef = rootViewContainerRef;
    }

    public getRootViewContainerRef(): ViewContainerRef {
        return this.rootViewContainerRef;
    }
}
