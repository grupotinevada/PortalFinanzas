import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProyectoComponent } from './proyecto.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ProyectoService, Proyecto } from '../../services/proyecto.service';
import { AuthService } from '../../services/auth.service';

describe('ProyectoComponent', () => {
  let component: ProyectoComponent;
  let fixture: ComponentFixture<ProyectoComponent>;
  let proyectoServiceMock: jasmine.SpyObj<ProyectoService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Crear mocks para los servicios
    proyectoServiceMock = jasmine.createSpyObj('ProyectoService', ['getProyectos', 'deleteProyecto', 'getProyectoPorId']);
    authServiceMock = jasmine.createSpyObj('AuthService', ['getUsuario']);

    await TestBed.configureTestingModule({
      declarations: [ProyectoComponent],
      imports: [
        MatDialogModule,
        MatTableModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: ProyectoService, useValue: proyectoServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el componente y cargar proyectos', () => {
    // Mock de usuario y proyectos
    const mockUsuario = { id: 1, idRol: 2, nombreArea: 'Desarrollo', idArea: 1 };
    const mockProyectos: Proyecto[] = [
      {
        idProyecto: 1,
        nombreProyecto: 'Proyecto A',
        descripcion: 'Descripción del Proyecto A',
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-06-01'),
        porcentajeAvance: 50,
        idUsuario: 1,
        nombreUsuario: 'Usuario 1',
        correoUsuario: 'usuario1@example.com',
        idArea: 1,
        nombreArea: 'Área 1',
        idEstado: 1,
        fechaReal: new Date('2025-05-01'),
        descripcionEstado: 'En progreso',
        fechaCreacion: new Date('2024-12-01'),
        fechaModificacion: new Date('2024-12-15'),
        editable: true,
      },
      {
        idProyecto: 2,
        nombreProyecto: 'Proyecto B',
        descripcion: 'Descripción del Proyecto B',
        fechaInicio: new Date('2025-02-01'),
        fechaFin: null,
        porcentajeAvance: 30,
        idUsuario: 2,
        nombreUsuario: 'Usuario 2',
        correoUsuario: 'usuario2@example.com',
        idArea: 2,
        nombreArea: 'Área 2',
        idEstado: 2,
        fechaReal: new Date('2025-06-01'),
        descripcionEstado: 'Pendiente',
        fechaCreacion: new Date('2024-12-10'),
        fechaModificacion: new Date('2024-12-20'),
        editable: false,
      },
    ];

    authServiceMock.getUsuario.and.returnValue(mockUsuario);
    proyectoServiceMock.getProyectos.and.returnValue(of(mockProyectos));

    component.ngOnInit();

    expect(component.rol).toBe(2);
    expect(component.area).toBe('Desarrollo');
    expect(component.proyectos.length).toBe(2);
    expect(component.dataSource.data).toEqual(mockProyectos);
    expect(component.showSpinner).toBeFalse();
  });

  it('debería manejar errores al cargar proyectos', () => {
    authServiceMock.getUsuario.and.returnValue({ id: 1, idRol: 2, idArea: 1 });
    proyectoServiceMock.getProyectos.and.returnValue(throwError(() => new Error('Error al cargar proyectos')));

    component.cargarProyectos();

    expect(component.showSpinner).toBeFalse();
    expect(component.proyectos.length).toBe(0);
  });

  it('debería eliminar un proyecto', () => {
    spyOn(window, 'confirm').and.returnValue(true); // Mock para el confirm
    proyectoServiceMock.deleteProyecto.and.returnValue(of({ success: true }));

    component.proyectos = [{ idProyecto: 1, nombreProyecto: 'Proyecto A' } as any];
    component.eliminarProyecto(1);

    expect(component.proyectos.length).toBe(0);
    expect(proyectoServiceMock.deleteProyecto).toHaveBeenCalledWith(1);
  });

  it('debería no eliminar un proyecto si se cancela la confirmación', () => {
    spyOn(window, 'confirm').and.returnValue(false); // Mock para el confirm

    component.proyectos = [{ idProyecto: 1, nombreProyecto: 'Proyecto A' } as any];
    component.eliminarProyecto(1);

    expect(component.proyectos.length).toBe(1);
    expect(proyectoServiceMock.deleteProyecto).not.toHaveBeenCalled();
  });

  it('debería asignar el área correctamente', () => {
    const mockUsuario = { nombreArea: 'QA' };
    authServiceMock.getUsuario.and.returnValue(mockUsuario);

    component.asignarArea();

    expect(component.area).toBe('QA');
  });

  it('debería manejar si el área no está disponible', () => {
    authServiceMock.getUsuario.and.returnValue(null);

    component.asignarArea();

    expect(component.area).toBe('');
  });
});
