import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import {NgxMatFloatingDirective} from "../directive/ngx-mat-floating.directive";
import {NgxMatFloatingService} from "../ngx-mat-floating.service";
import {Buffer} from "buffer";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";

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
export class NgxMatFloatingPinComponent implements OnInit, AfterViewInit {
    public pinned: boolean = true;
    public floatingDirective: NgxMatFloatingDirective;

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

    @Input("forFloatingElement") private floatingElement: ElementRef<HTMLElement>;
    @ViewChild("button") private button: ElementRef<HTMLDivElement>;
    @ViewChild("buttonIcon") private buttonIcon: ElementRef<HTMLDivElement>;

    private viewReady: boolean = false;

    constructor(private service: NgxMatFloatingService, private domSanitizer: DomSanitizer) {
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
        return this.viewReady && !!this.service.getRootViewContainerRef();
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

    public getDataSource(iconName: string): SafeResourceUrl {
        return this.buttonUrl[iconName];
    }

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
    }

    public unpinElement(ev: MouseEvent) {
        this.floatingDirective.unpinElement(ev);
    }

    ngOnInit(): void {
        if (this.floatingElement) {
            this.floatingDirective = (<any>this.floatingElement).__ngxMatFloatingDirective;
            if (this.floatingDirective) {
                this.floatingDirective.registerPinButton(this);
            } else {
                console.error("option [forFloatingElement] must point to an element marked with <ngxMatFloating>");
            }
        } else {
            console.error("missing mandatory [forFloatingElement] on <ngxMatFloatingPin>");
        }
    }

    ngAfterViewInit(): void {
        if (!this.options) {
            this.options = {};
        }

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
    }
}
