import { TestBed } from '@angular/core/testing';

import { MiperfilService } from './miperfil.service';

describe('MiperfilService', () => {
  let service: MiperfilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MiperfilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
