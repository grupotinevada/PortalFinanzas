import { Component, OnInit} from '@angular/core';
import { AprobacionesService, Solicitud } from '../../services/aprobaciones.service';
import { Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-aprobaciones',
  templateUrl: './aprobaciones.component.html',
  styleUrls: ['./aprobaciones.component.css']
})


export class AprobacionesComponent implements OnInit{

  solicitudes: Solicitud[] = [];
  ordenActual: string = '';
  direccionOrden: 'asc' | 'desc' | 'prioridad' = 'asc';
  showSpinner = false;

  constructor(
    private aprobacionService: AprobacionesService,
    private router : Router,
    private proyectoService: ProyectoService

  ) { }

  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes() {
    this.showSpinner = true;
  
    forkJoin({
      estados: this.proyectoService.getEstado(),
      areas: this.proyectoService.getArea() 
    }).subscribe(({ estados, areas }) => {
      this.aprobacionService.obtenerCambiosSolicitudes().subscribe({
        next: (data) => {
          this.solicitudes = (data as any[]).map((solicitud) => {
            const cambios = { ...solicitud.cambios };
            const cambiosMapeados: any = {};
  
            // Definir un mapa de nombres amigables
            const nombresAmigables: { [key: string]: string } = {
              idArea: 'Área',
              nombre: 'Nombre',
              fechaReal: 'Fecha de compromiso',
              fechaInicio: 'Fecha de inicio',
              fechaFin: 'Fecha de finalización',
              idEstado: 'Estado',
              descripcion: 'Descripción del Proyecto'
            };
  
            // Recorrer los cambios y aplicar los nombres amigables
            Object.keys(cambios).forEach((key) => {
              let valor = cambios[key];
  
              if (key === 'idEstado' && typeof valor === 'object') {
                valor = {
                  anterior: estados.find(e => e.idEstado === valor.anterior)?.descripcion || valor.anterior,
                  nuevo: estados.find(e => e.idEstado === valor.nuevo)?.descripcion || valor.nuevo
                };
              }
  
              if (key === 'idArea' && typeof valor === 'object') {
                valor = {
                  anterior: areas.find((a:any) => a.idArea === valor.anterior)?.nombre || valor.anterior,
                  nuevo: areas.find((a:any) => a.idArea === valor.nuevo)?.nombre || valor.nuevo
                };
              }
  
              // Guardar el cambio con la nueva clave
              cambiosMapeados[nombresAmigables[key] || key] = valor;
            });
  
            return {
              ...solicitud,
              cambios: cambiosMapeados
            };
          });
  
          console.log('INFO: ', this.solicitudes);
          this.showSpinner = false;
        },
        error: (error) => {
          console.error('Error al obtener las solicitudes', error);
          this.showSpinner = false;
        }
      });
    });
  }

  esFecha(value: any): boolean {
    // Verifica si es una instancia de Date válida
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
  
    // Verifica si es una cadena que puede ser parseada a una fecha
    if (typeof value === 'string') {
      const parsedDate = Date.parse(value);
      return !isNaN(parsedDate) && !isNaN(Date.parse(value));
    }
  
    // Si es un número, no lo consideramos una fecha
    return false;
  }
  
  prioridadEstados: { [key: string]: number } = {
    'Pendiente': 1,
    'Aprobado': 3,
    'Rechazado': 2
  };

  ordenarPor(columna: string) {
    if (this.ordenActual === columna) {
      // Alternar entre ascendente, descendente y prioridad para estadoSolicitud
      if (columna === 'estadoSolicitud') {
        this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : this.direccionOrden === 'desc' ? 'prioridad' : 'asc';
      } else {
        this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
      }
    } else {
      this.ordenActual = columna;
      this.direccionOrden = 'asc';
    }
  
    this.solicitudes.sort((a: any, b: any) => {
      let valorA = a[columna];
      let valorB = b[columna];
  
      if (columna === 'estadoSolicitud' && this.direccionOrden === 'prioridad') {
        const prioridadA = this.prioridadEstados[valorA] || 99; // Valores no definidos van al final
        const prioridadB = this.prioridadEstados[valorB] || 99;
        return prioridadA - prioridadB;
      }
  
      // Ordenamiento por fecha
      if (columna.includes('fecha')) {
        valorA = new Date(valorA);
        valorB = new Date(valorB);
      }
  
      if (valorA < valorB) return this.direccionOrden === 'asc' ? -1 : 1;
      if (valorA > valorB) return this.direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });
  }

verProyecto(idProyecto: number): void {
  this.router.navigate(['/tareas', idProyecto]);
}

getEstadoClase(estado: string) {
  return {
    'bg-warning text-dark': estado === 'Pendiente',
    'bg-success text-light': estado === 'Aprobado',
    'bg-danger text-light': estado === 'Rechazado'
  };
}
  

}