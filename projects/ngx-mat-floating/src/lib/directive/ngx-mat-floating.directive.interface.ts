import {NgxMatFloatingPinComponentInterface} from "../ngx-mat-floating-pin/ngx-mat-floating-pin.component.interface";

export interface NgxMatFloatingDirectiveInterface {
    pinButtons: (NgxMatFloatingPinComponentInterface | HTMLButtonElement)[];

    togglePin(ev?: MouseEvent);

    setPinned(pinned, ev?: MouseEvent);

    unpinElement(ev?: MouseEvent);

    pinElement(ev?: MouseEvent);

    registerPinButton(pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement, errorText?: string);

    unregisterPinButton(pinButton: NgxMatFloatingPinComponentInterface | HTMLButtonElement);
}
