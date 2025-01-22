import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialCambiosDialogComponent } from './historial-cambios-dialog.component';

describe('HistorialCambiosDialogComponent', () => {
  let component: HistorialCambiosDialogComponent;
  let fixture: ComponentFixture<HistorialCambiosDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HistorialCambiosDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialCambiosDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
