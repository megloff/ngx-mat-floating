import {ChangeDetectorRef, Component, Inject, OnInit} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {NxgMatFloatingStatusChangeEvent} from "../../../projects/ngx-mat-floating/src/lib/directive/ngx-mat-floating.directive";
import {NgxMatFloatingPosition} from "../../../projects/ngx-mat-floating/src/lib/ngx-mat-floating-wrapper/ngx-mat-floating-wrapper.component";

export interface DialogData {
    message: string;
}

export interface DialogResult {
    position: {
        x: number,
        y: number
    };
}

@Component({
    selector: "NgxMatFloatingLibrary-dialog",
    templateUrl: "./dialog.component.html",
    styleUrls: ["./dialog.component.css"]
})
export class DialogComponent implements OnInit {
    public lastPosition: NgxMatFloatingPosition;

    constructor(public dialogRef: MatDialogRef<DialogComponent>, @Inject(MAT_DIALOG_DATA) public data: DialogData, private changeDetector: ChangeDetectorRef) {
    }

    public closeDialog() {
        const result: DialogResult = {
            position: this.lastPosition
        };

        this.dialogRef.close(result);
    }

    public stateChangeLogger(event: NxgMatFloatingStatusChangeEvent) {
        // console.log("event", event.type, event.position);
        this.lastPosition = event.position;

        this.changeDetector.detectChanges();
    }

    ngOnInit(): void {
    }
}
