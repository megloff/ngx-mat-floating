import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatFloatingPinComponent } from './ngx-mat-floating-pin.component';

describe('NgxMatFloatingPinComponent', () => {
  let component: NgxMatFloatingPinComponent;
  let fixture: ComponentFixture<NgxMatFloatingPinComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxMatFloatingPinComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxMatFloatingPinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
