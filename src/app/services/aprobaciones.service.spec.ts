import { TestBed } from '@angular/core/testing';

import { AprobacionesService } from './aprobaciones.service';

describe('AprobacionesService', () => {
  let service: AprobacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AprobacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
