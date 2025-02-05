import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobacionesComponent } from './aprobaciones.component';

describe('AprobacionesComponent', () => {
  let component: AprobacionesComponent;
  let fixture: ComponentFixture<AprobacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AprobacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
