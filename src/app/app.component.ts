import {AfterViewInit, Component, ElementRef, Injector, ViewChild, ViewContainerRef} from "@angular/core";
import {NgxMatFloatingAppComponent} from "../../projects/ngx-mat-floating/src";
import {NgxMatFloatingActivationAnimation, NgxMatFloatingPosition} from "../../projects/ngx-mat-floating/src/lib/ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";
import {NgxMatFloatingDirective} from "../../projects/ngx-mat-floating/src";
import {NgxMatFloatingPinOptions} from "../../projects/ngx-mat-floating/src";
import {DialogComponent, DialogData, DialogResult} from "./dialog/dialog.component";
import {MatDialog} from "@angular/material/dialog";

@Component({
    selector: "NgxMatFloatingLibrary-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.css"]
})
export class AppComponent extends NgxMatFloatingAppComponent implements AfterViewInit {
    @ViewChild("TheCommand") theCommand: ElementRef<HTMLElement>;
    @ViewChild("TestButton") testButton: ElementRef<HTMLButtonElement>;

    // the component
    @ViewChild("MatCardExample") matCardExample;

    // reference to the dom element
    @ViewChild("MatCardExample", {read: ElementRef, static: true}) matCardExampleRef;

    public title = "ngx-mat-floating";
    public testButtonHasListener: boolean;

    public closingPosition: NgxMatFloatingPosition;

    public theCommandPinOptions: NgxMatFloatingPinOptions = {
        color: "white",
        iconType: "html",
        pinnedIcon: "<span style='font-size: 12px;'>😎</span>",
        unpinnedIcon: "<span style='font-size: 12px;'>😜</span>"
        // pinnedIcon: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="ngx-mat-floating-pin-button-icon" focusable="false" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">` +
        //    `<path style="pointer-events: none" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill="red"/>` +
        //    `</svg>`
    };

    public activationAnimationOptions: NgxMatFloatingActivationAnimation = {
        active: true,
        keyframes: [{
            boxShadow: "0 0 5px -5px red"
        }, {
            boxShadow: "0 0 5px 5px red"
        }],
        options: {
            duration: 80,
            iterations: 6,
            direction: "alternate",
            easing: "ease"
        }
    };

    constructor(private dialog: MatDialog) {
        super();
    }

    public showFloatingDialog() {
        this.closingPosition = null;

        const dialogRef = this.dialog.open(DialogComponent, {
            width: "250px",
            data: <DialogData>{
                message: "I am the most wonderful floating dialog!"
            }
        });

        dialogRef.afterClosed().subscribe((result: DialogResult) => {
            this.closingPosition = result && result.position;
        });
    }

    public stateChangeLogger(ev) {
        // console.log(ev);
    }

    public attachButton() {
        NgxMatFloatingDirective.registerPinButton(this.theCommand, this.testButton.nativeElement);
        this.testButtonHasListener = true;
    }

    public detachButton() {
        NgxMatFloatingDirective.unregisterPinButton(this.theCommand, this.testButton.nativeElement);
        this.testButtonHasListener = false;
    }

    public onReattach(ev) {
        // console.log("reattach", ev);
    }

    ngAfterViewInit(): void {

    }
}
