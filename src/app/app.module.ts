import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {NgxMatFloatingModule} from "../../projects/ngx-mat-floating/src/lib/ngx-mat-floating.module";
import {MatExpansionModule} from "@angular/material/expansion";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        NgxMatFloatingModule,
        MatExpansionModule,
        BrowserAnimationsModule
     ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
