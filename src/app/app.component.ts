import {AfterViewInit, Component, Injector, ViewContainerRef} from "@angular/core";
import {NgxMatFloatingAppComponent} from "../../projects/ngx-mat-floating/src/lib/ngx-mat-floating-app-component";

@Component({
    selector: "NgxMatFloatingLibrary-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.css"]
})
export class AppComponent extends NgxMatFloatingAppComponent implements AfterViewInit {
    title = "ngx-mat-floating";

    constructor() {
        super();
    }

    public stateChangeLogger(ev) {
        console.log(ev);
    }

    ngAfterViewInit(): void {
    }
}
