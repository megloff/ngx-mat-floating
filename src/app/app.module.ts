import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppComponent} from "./app.component";
import {NgxMatFloatingModule} from "../../projects/ngx-mat-floating/src/lib/ngx-mat-floating.module";
import {MatExpansionModule} from "@angular/material/expansion";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {DialogComponent} from "./dialog/dialog.component";
import {MatDialogModule} from "@angular/material/dialog";
import {DragDropModule} from "@angular/cdk/drag-drop";

@NgModule({
    declarations: [
        AppComponent,
        DialogComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,

        DragDropModule,

        NgxMatFloatingModule,

        MatExpansionModule,
        MatCardModule,
        MatButtonModule,
        MatDialogModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
