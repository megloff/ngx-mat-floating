import {AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, ElementRef, Input, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {NgxMatFloatingDirectiveInterface} from "../directive/ngx-mat-floating.directive.interface";
import {NgxMatFloatingInjector, NgxMatFloatingService} from "../ngx-mat-floating.service";
import {Buffer} from "buffer";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {NgxMatFloatingPinComponentInterface} from "./ngx-mat-floating-pin.component.interface";

export interface NgxMatFloatingPinOptions {
    iconType?: "svg" | "html" | "uri" | "url";
    color?: string;
    pinnedIcon?: string;
    unpinnedIcon?: string;
}

@Component({
    selector: "ngxMatFloatingPin",
    templateUrl: "./ngx-mat-floating-pin.component.html",
    styleUrls: ["./ngx-mat-floating-pin.component.css"]
})
export class NgxMatFloatingPinComponent implements NgxMatFloatingPinComponentInterface, OnInit, AfterViewInit, OnDestroy {
    public pinned: boolean = true;
    public floatingDirective: NgxMatFloatingDirectiveInterface;

    /**
     * @hidden
     * @ignore
     * @exclude
     * @internal
     */
    public buttonUrl: { [name: string]: SafeResourceUrl } = {};

    /**
     * @hidden
     * @ignore
     * @exclude
     * @internal
     */
    public buttonHtml: { [name: string]: SafeResourceUrl } = {};

    @Input() public disabled: boolean | string | number = false;
    @Input() public options: NgxMatFloatingPinOptions;

    @Input("forFloatingElement") private floatingElement: ElementRef<HTMLElement> | any;
    @ViewChild("button") private button: ElementRef<HTMLDivElement>;
    @ViewChild("buttonIcon") private buttonIcon: ElementRef<HTMLDivElement>;

    private viewReady: boolean = false;

    constructor(private elementRef: ElementRef, private service: NgxMatFloatingService, private domSanitizer: DomSanitizer, private changeDetector: ChangeDetectorRef) {
    }

    public getButtonClass(): string {
        let classNames = "ngx-mat-floating-pin-button";

        if (this.service.getBooleanValue(this.disabled)) {
            classNames += " ngx-mat-floating-pin-disabled";
        }

        return classNames;
    }

    // noinspection JSUnusedGlobalSymbols
    public setDisabled(disabled: boolean) {
        this.disabled = disabled;
    }

    public isInitialized(): boolean {
        return this.viewReady;
    }

    public onClick(ev: MouseEvent) {
        if (!this.disabled) {
            if (this.pinned) {
                this.unpinElement(ev);
            } else {
                this.pinElement(ev);
            }
        }
    }

    // noinspection JSUnusedGlobalSymbols
    public getDataSource(iconName: string): SafeResourceUrl {
        return this.buttonUrl[iconName];
    }

    // noinspection JSUnusedGlobalSymbols
    public isPinned(): boolean {
        return this.pinned;
    }

    /**
     * @ignore
     * @hidden
     * @exclude
     * @internal
     */
    public setLocalPinnedFlag(pinned) {
        this.pinned = pinned;
    }

    public setPinned(pinned) {
        if (pinned) {
            this.pinElement(null);
        } else {
            this.unpinElement(null);
        }
    }

    public pinElement(ev: MouseEvent) {
        this.floatingDirective.pinElement(ev);

        // include manual change detection, because it might be an injected and detached component
        this.changeDetector.detectChanges();
    }

    public unpinElement(ev: MouseEvent) {
        this.floatingDirective.unpinElement(ev);

        // include manual change detection, because it might be an injected and detached component
        this.changeDetector.detectChanges();
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
        this.floatingDirective.unregisterPinButton(this);
    }

    ngAfterViewInit(): void {
        const element = this.floatingElement || this.elementRef;
        if (element && !this.floatingDirective) {
            this.floatingDirective = this.service.getFloatingDirective(element);
        }

        if (this.floatingDirective) {
            this.floatingDirective.registerPinButton(this, "option [forFloatingElement] must point to an element marked with <ngxMatFloating>");
        } else {
            console.error("either place <ngxMatFloatingPin> inside an element marked with 'ngxMatFloating' or supply [forFloatingElement]", this.elementRef.nativeElement);
        }

        this.options = Object.assign({
            iconType: "svg",
            color: "#777777"
        }, this.options || {});

        ["pinnedIcon", "unpinnedIcon"].forEach((name) => {
            switch (this.options.iconType) {
                case "svg":
                    if (this.options[name]) {
                        this.buttonUrl[name] = this.domSanitizer.bypassSecurityTrustResourceUrl("data:image/svg+xml;base64," + Buffer.from(this.options[name]).toString("base64"));
                    }
                    break;

                case "uri":
                case "url":
                    if (this.options[name]) {
                        this.buttonUrl[name] = this.domSanitizer.bypassSecurityTrustResourceUrl(this.options[name]);
                    }
                    break;

                case "html":
                    if (this.options[name]) {
                        this.buttonHtml[name] = this.domSanitizer.bypassSecurityTrustHtml("<div class=\"ngx-mat-floating-pin-button-icon ngx-mat-floating-pin-injected\">" + this.options[name] + "</div>");
                    }
                    break;
            }
        });

        this.viewReady = true;

        // include manual change detection, because it might be an injected and detached component
        this.changeDetector.detectChanges();
    }
}
