import { TestBed } from '@angular/core/testing';

import { NgxMatFloatingService } from './ngx-mat-floating.service';

describe('NgxMatFloatingService', () => {
  let service: NgxMatFloatingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxMatFloatingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
