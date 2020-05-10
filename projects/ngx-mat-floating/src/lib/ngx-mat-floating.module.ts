import {NgModule} from "@angular/core";
import {NgxMatFloatingDirective} from "./directive/ngx-mat-floating.directive";
import {NgxMatFloatingPinComponent} from "./ngx-mat-floating-pin/ngx-mat-floating-pin.component";
import {NgxMatFloatingWrapperComponent} from "./ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";
import {NgxMatFloatingTitleDirective} from "./directive/ngx-mat-floating-title.directive";
import {NgxMatFloatingService} from "./ngx-mat-floating.service";
import {CommonModule} from "@angular/common";

@NgModule({
    declarations: [
        NgxMatFloatingDirective,
        NgxMatFloatingPinComponent,
        NgxMatFloatingWrapperComponent,
        NgxMatFloatingTitleDirective
    ],
    imports: [
        CommonModule
    ],
    exports: [
        NgxMatFloatingDirective,
        NgxMatFloatingTitleDirective,
        NgxMatFloatingPinComponent
    ]
})
export class NgxMatFloatingModule {
}
