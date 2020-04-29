import {Component, ElementRef, Input, OnInit, ViewChild, ViewChildren} from "@angular/core";
import {NgxMatFloatingDirective} from "../directive/ngx-mat-floating.directive";
import {NgxMatFloatingService} from "../ngx-mat-floating.service";

@Component({
    selector: "ngxMatFloatingPin",
    templateUrl: "./ngx-mat-floating-pin.component.html",
    styleUrls: ["./ngx-mat-floating-pin.component.css"]
})
export class NgxMatFloatingPinComponent implements OnInit {
    @ViewChild("button") public button: ElementRef<HTMLDivElement>;
    @ViewChild("buttonIcon") public buttonIcon: ElementRef<HTMLDivElement>;

    public pinned: boolean = true;

    @Input("forFloatingElement") public floatingElement: ElementRef<HTMLElement>;

    @Input() public disabled: boolean | string = false;
    @Input() public color: string = "#00000";

    private floatingDirective: NgxMatFloatingDirective;

    constructor(private service: NgxMatFloatingService) {
    }

    public getButtonClass(): string {
        let classNames = "ngx-mat-floating-pin-button";

        if (typeof this.disabled == "string") {
            const disabled = this.disabled.toLowerCase();
            this.disabled = disabled != "false" && disabled != "no";
        }

        if (this.disabled) {
            classNames += " ngx-mat-floating-pin-disabled";
        }

        return classNames;
    }

    public setDisabled(disabled: boolean) {
        this.disabled = disabled;
    }

    public isInitialized(): boolean {
        return !!this.service.getRootViewContainerRef();
    }

    public onClick(ev: MouseEvent) {
        if (!this.disabled) {
            if (this.pinned) {
                this.unpinElement(ev)
            } else {
                this.pinElement(ev);
            }
        }
    }

    public pinElement(ev: MouseEvent) {
        this.floatingDirective.pinElement(ev)
    }

    public unpinElement(ev: MouseEvent) {
        this.floatingDirective.unpinElement(ev)
    }

    ngOnInit(): void {
        this.floatingDirective = (<any>this.floatingElement).__ngMatFloatingDirective;

        if (this.floatingDirective) {
            this.floatingDirective.registerPinButton(this);
        } else {
            console.error("missing mandatory [forFloatingElement] on <ngxMatFloatingPin>");
        }
    }
}
