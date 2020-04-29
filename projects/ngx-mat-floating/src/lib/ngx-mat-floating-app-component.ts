import {Optional, ViewContainerRef} from "@angular/core";
import {NgxMatApplicationRef, NgxMatFloatingInjector, NgxMatFloatingService} from "./ngx-mat-floating.service";

export class NgxMatFloatingAppComponent {
    constructor(@Optional() maxPollingTimeout?: number) {
        this.grabRootViewContainerRef(maxPollingTimeout || 10000);
    }

    /**
     * Wait for NgxMatAppServices to initialise and once the service is ready obtain the root view content reference
     * and make it available via the service.
     *
     * In case the application component inherits from NgxMatFloatingAppComponent, but no ngxMatFloating
     * element has yet been added to the application, the services will never become available and we can
     * safely stop polling. Without using injection, there is no way of knowing exactly when the application
     * is stable. As the is now harm done in polling so slowly, we assume that 5 seconds should be enough for any
     * application to start up.
     */
    private grabRootViewContainerRef(pollingTimeout: number) {
        let pollRetryTime = 10; // retry every 10ms

        if (NgxMatFloatingInjector && NgxMatApplicationRef && NgxMatApplicationRef.components.length > 0) {
            const appRootInjector = NgxMatApplicationRef.components[0].injector;
            const rootViewContainerRef = appRootInjector.get(ViewContainerRef);

            const ngxMatFloatingService = NgxMatFloatingInjector.get(NgxMatFloatingService);
            ngxMatFloatingService.setRootViewContainerRef(rootViewContainerRef);
        } else {
            if (pollingTimeout > 0) {
                // noinspection JSUnusedAssignment
                setTimeout(() => {
                    this.grabRootViewContainerRef(pollingTimeout - pollRetryTime);
                }, pollRetryTime);
            } else {
                console.warn(
                    "Your application component inherits from NgxMatFloatingAppComponent, " +
                    "but no ngxMatFloating element has yet been added to the application."
                );
            }
        }
    }
}

