import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarproyectodialogComponent } from './agregarproyectodialog.component';

describe('AgregarproyectodialogComponent', () => {
  let component: AgregarproyectodialogComponent;
  let fixture: ComponentFixture<AgregarproyectodialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgregarproyectodialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarproyectodialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
