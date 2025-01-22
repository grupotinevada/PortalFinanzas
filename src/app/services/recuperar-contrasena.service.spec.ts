import { TestBed } from '@angular/core/testing';

import { RecuperarContrasenaService } from './recuperar-contrasena.service';

describe('RecuperarContrasenaService', () => {
  let service: RecuperarContrasenaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecuperarContrasenaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
