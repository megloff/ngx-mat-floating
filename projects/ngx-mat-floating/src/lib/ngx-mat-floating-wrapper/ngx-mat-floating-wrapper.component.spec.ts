import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatFloatingWrapperComponent } from './ngx-mat-floating-wrapper.component';

describe('NgxMatFloatingWrapperComponent', () => {
  let component: NgxMatFloatingWrapperComponent;
  let fixture: ComponentFixture<NgxMatFloatingWrapperComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxMatFloatingWrapperComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxMatFloatingWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
