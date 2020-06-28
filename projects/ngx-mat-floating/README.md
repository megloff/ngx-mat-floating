# NgxMatFloating

This Angular extension allows it to make MatDialog, MatCard and MatExpansionPanel items floating and draggable by adding a single directive.

Although is relatively easy to add basic drag support to an application using the CDK package, to make a more complex component like an Angular 
Material Expansion Panel to work seamlessly requires quite a bit of customization. With NgxMatFloating creating draggable Angular components 
with consistent behavior becomes very easy. 

With NgxMatFloating a component is usually created in its original position as "pinned". The user can "unpin" the component anytime
to make it floating and draggable and with a single click the user can re-pin the component. It will then move itself back into
its original position inside the application layout.

## Code scaffolding

Run `ng generate component component-name --project ngx-mat-floating` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project ngx-mat-floating`.
> Note: Don't forget to add `--project ngx-mat-floating` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build ngx-mat-floating` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

After building your library with `ng build ngx-mat-floating`, go to the dist folder `cd dist/ngx-mat-floating` and run `npm publish`.

## Running unit tests

Run `ng test ngx-mat-floating` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
