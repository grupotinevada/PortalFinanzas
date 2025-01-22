import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProyectoService, Proyecto, Area } from '../../services/proyecto.service';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  rol = 0;
  proyectos: Proyecto[] = [];
  areas: Area[] = []; // Ahora las áreas se obtendrán dinámicamente
  showSpinner: boolean = false;
  isSidebarHidden = false;
  trimestres: string[] = [];

  constructor(
    private authService: AuthService,
    private proyectoService: ProyectoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.showSpinner = true;
    const usuario = this.authService.getUsuario();
    this.rol = usuario.idRol;
    // Cargar proyectos
    this.cargarAreasYProyectos();

  }

  getProyectosPorArea(idArea: number): Proyecto[] {
    return this.proyectos.filter(proyecto => proyecto.idArea === idArea);
  }

  filtrarAreas() {
    return this.areas.filter(area => area.id !== 5);
  }
  
  cargarAreasYProyectos(): void {
    this.proyectoService.getProyectosPorAreas().pipe(
      catchError(error => {
        console.error('Error al cargar áreas y proyectos:', error);
        this.showSpinner = false;
        return [];
      })
    ).subscribe((data: any[]) => {
      if (data && data.length) {
        this.areas = data.reduce((result, item) => {
          let area = result.find((a: Area) => a.id === item.idArea);
          if (!area) {
            area = { id: item.idArea, nombre: item.nombreArea, proyectos: [] };
            result.push(area);
          }
          area.proyectos.push({
            idProyecto: item.idProyecto,
            nombreProyecto: item.nombreProyecto,
            descripcion: item.descripcionProyecto,
            fechaInicio: new Date(item.fechaInicio),
            fechaReal: item.fechaReal ? new Date(item.fechaReal) : null,
            fechaFin: item.fechaFin ? new Date(item.fechaFin) : null,
            porcentajeAvance: parseFloat(item.porcentajeAvance),
            idEstado: item.idEstado
          });
          return result;
        }, []);
      } else {
        console.warn('No hay datos para cargar áreas y proyectos.');
        this.areas = [];
      }

      // Generar los trimestres dinámicamente basado en las fechas de compromiso
      this.trimestres = this.generarTrimestresPorProyectos();

      this.cdr.detectChanges();
      this.showSpinner = false;
    });
  }
  // Generar trimestres dinámicos basados en las fechas de los proyectos
  generarTrimestresPorProyectos(): string[] {
    const trimestresSet = new Set<string>();

    // Recorrer las áreas y proyectos para agregar los trimestres que contienen proyectos
    this.areas.forEach(area => {
      area.proyectos.forEach(proyecto => {
        if (proyecto.fechaReal) {
          trimestresSet.add(this.calcularTrimestre(proyecto.fechaReal));
        }
      });
    });

    // Convertir a un array y ordenar cronológicamente
    const trimestresArray = Array.from(trimestresSet).sort((a, b) => this.ordenarTrimestres(a, b));

    // Filtrar los trimestres que no tienen proyectos asociados
    const trimestresFiltrados = trimestresArray.filter(trimestre =>
      this.tieneProyectosEnTrimestre(trimestre)
    );

    return trimestresFiltrados;
  }
  // Calcular el trimestre de un proyecto a partir de su fecha de compromiso
  calcularTrimestre(fecha: Date): string {
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();
    if (mes >= 0 && mes <= 2) return `Q1-${anio}`;
    if (mes >= 3 && mes <= 5) return `Q2-${anio}`;
    if (mes >= 6 && mes <= 8) return `Q3-${anio}`;
    return `Q4-${anio}`;
  }

  // Generar los próximos 4 trimestres desde la fecha actual
  calcularTrimestresFechaActual(): string[] {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    let currentQuarter = Math.ceil(currentMonth / 3);

    const trimestres = [];
    for (let i = 0; i < 4; i++) {
      const year = currentQuarter > 4 ? currentYear + 1 : currentYear;
      const quarter = currentQuarter > 4 ? currentQuarter - 4 : currentQuarter;
      trimestres.push(`Q${quarter}-${year}`);
      currentQuarter++;
    }
    return trimestres;
  }
// Función para verificar si hay proyectos en un trimestre específico
tieneProyectosEnTrimestre(trimestre: string): boolean {
  return this.areas.some(area =>
    area.proyectos.some(proyecto =>
      proyecto.fechaReal !== null && this.calcularTrimestre(proyecto.fechaReal) === trimestre
    )
  );
}

// Método para verificar si hay proyectos en total
hayProyectos(): boolean {
  return this.areas.some(area => area.proyectos.length > 0);
}

  // Función para ordenar trimestres cronológicamente
  ordenarTrimestres(a: string, b: string): number {
    const [qa, ya] = a.split('-').map(x => parseInt(x.replace('Q', ''), 10));
    const [qb, yb] = b.split('-').map(x => parseInt(x.replace('Q', ''), 10));

    if (ya === yb) {
      return qa - qb; // Ordenar por trimestre dentro del mismo año
    }
    return ya - yb; // Ordenar por año
  }
  // Filtrar proyectos de un área por trimestre
  filtrarProyectosPorTrimestre(area: Area, trimestre: string): Proyecto[] {
    return area.proyectos.filter(proyecto => {
      if (proyecto.fechaReal) {
        return this.calcularTrimestre(proyecto.fechaReal) === trimestre;
      }
      return false; // Si no hay fechaReal, no se considera en el trimestre
    });
  }

  proyectoAtrasado(proyecto: Proyecto): boolean {
    if (!proyecto.fechaReal || proyecto.porcentajeAvance === 100) {
      return false; // No está atrasado si no tiene fecha o ya está completado
    }
  
    const hoy = new Date();
    const fechaCompromiso = new Date(proyecto.fechaReal);
  
    // Está atrasado si la fecha compromiso ya pasó y el porcentaje no es 100%
    return hoy > fechaCompromiso && proyecto.porcentajeAvance < 100;
  }

  getAreaClass(idArea: number): string {
    switch (idArea) {
      case 1: return 'titulo-bg-primary';
      case 2: return 'titulo-bg-success';
      case 3: return 'titulo-bg-warning';
      case 4: return 'titulo-bg-secondary';
      default: return 'titulo-bg-light';
    }
  }

  IrProyecto(): void {
    this.router.navigate(['/proyecto']);
  }

  // Método para actualizar el estado del sidebar cuando se emite el evento
  onSidebarToggled(hidden: boolean) {
    this.isSidebarHidden = hidden;
  }
  irATareas(idProyecto: number): void {
    this.router.navigate(['/tareas', idProyecto]);
  }
}
