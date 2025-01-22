import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearusuarioComponent } from './crearusuario.component';

describe('CrearusuarioComponent', () => {
  let component: CrearusuarioComponent;
  let fixture: ComponentFixture<CrearusuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CrearusuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearusuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
