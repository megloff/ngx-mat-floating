import {ElementRef} from "@angular/core";

export interface NgxMatFloatingPinComponentInterface {
    setLocalPinnedFlag(pinned): void;

    setPinned(pinned): void;

    pinElement(ev: MouseEvent): void;

    unpinElement(ev: MouseEvent): void;

     getFloatingElementInstance(): ElementRef<HTMLElement> | any;

}
