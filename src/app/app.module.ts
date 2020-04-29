import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {NgxMatFloatingModule} from "../../projects/ngx-mat-floating/src/lib/ngx-mat-floating.module";

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        NgxMatFloatingModule
     ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
