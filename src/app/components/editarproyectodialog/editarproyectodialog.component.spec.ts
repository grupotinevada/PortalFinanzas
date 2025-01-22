import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarproyectodialogComponent } from './editarproyectodialog.component';

describe('EditarproyectodialogComponent', () => {
  let component: EditarproyectodialogComponent;
  let fixture: ComponentFixture<EditarproyectodialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditarproyectodialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarproyectodialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
