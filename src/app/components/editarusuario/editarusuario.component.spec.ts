import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarusuarioComponent } from './editarusuario.component';

describe('EditarusuarioComponent', () => {
  let component: EditarusuarioComponent;
  let fixture: ComponentFixture<EditarusuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditarusuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarusuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
