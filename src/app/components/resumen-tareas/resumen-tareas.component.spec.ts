import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenTareasComponent } from './resumen-tareas.component';

describe('ResumenTareasComponent', () => {
  let component: ResumenTareasComponent;
  let fixture: ComponentFixture<ResumenTareasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResumenTareasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumenTareasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
