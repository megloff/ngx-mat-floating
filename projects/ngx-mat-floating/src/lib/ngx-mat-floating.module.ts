import {NgModule} from "@angular/core";
import {NgxMatFloatingDirective} from "./directive/ngx-mat-floating.directive";
import {CommonModule} from "@angular/common";
import {NgxMatFloatingPinComponent} from "./ngx-mat-floating-pin/ngx-mat-floating-pin.component";
import {NgxMatFloatingWrapperComponent} from "./ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";
import {NgxMatFloatingTitleDirective} from "./directive/ngx-mat-floating-title.directive";
import {NgxMatFloatingService} from "./ngx-mat-floating.service";

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
    providers:[NgxMatFloatingService],
    exports: [
        NgxMatFloatingDirective,
        NgxMatFloatingPinComponent
    ]
})
export class NgxMatFloatingModule {
}
