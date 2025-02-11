import { Component, OnInit} from '@angular/core';
import { AprobacionesService, Solicitud } from '../../services/aprobaciones.service';
import { Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Notyf } from 'notyf';

@Component({
  selector: 'app-aprobaciones',
  templateUrl: './aprobaciones.component.html',
  styleUrls: ['./aprobaciones.component.css']
})


export class AprobacionesComponent implements OnInit{

  solicitudes: Solicitud[] = [];
  solicitudesFiltrado: Solicitud[] = [];
  ordenActual: string = '';
  direccionOrden: 'asc' | 'desc' | 'prioridad' = 'asc';
  showSpinner = false;
  idUsuario: any;
  rol: number = 0;
  constructor(
    private aprobacionService: AprobacionesService,
    private router : Router,
    private proyectoService: ProyectoService,
    private authService: AuthService

  ) { }

  ngOnInit() {

    this.cargarSolicitudes();
    this.idUsuario = this.authService.getUsuarioId();
    this.rol = this.authService.getUsuario().idRol;
    
  }

  cargarSolicitudes() {
    
    
    forkJoin({
      
      estados: this.proyectoService.getEstado(),
      areas: this.proyectoService.getArea(),
    }).subscribe(({ estados, areas }) => {
      this.showSpinner = true;
      this.aprobacionService.obtenerCambiosSolicitudes().subscribe({
        next: (data) => {
          
          this.solicitudes = (data as any[]).map((solicitud) => {
            const cambios = { ...solicitud.cambios };
            const cambiosMapeados: any = {};
            const cambiosMapeadosFiltrado: any = {};
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
  
           // Filtrar solicitudes solo del usuario actual
           this.solicitudesFiltrado = this.solicitudes.filter(solicitud => solicitud.idSolicitante === this.idUsuario);

           console.log('INFO: Todas las solicitudes:', this.solicitudes);
           console.log('INFO: Solicitudes del usuario actual:', this.solicitudesFiltrado);
 
           this.showSpinner = false;
         },
         error: (error) => {
           console.error('Error al obtener las solicitudes', error);
           this.showSpinner = false;
         }
       });
     });
 
     this.showSpinner = false;
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

aprobarSolicitud(idAprobacion: number) {
  const notyf = new Notyf();
  if (idAprobacion) {
    this.aprobacionService.aprobarSolicitud(idAprobacion)
      .subscribe({
        next: (response) => {
          console.log('Solicitud aprobada:', response),
          notyf.success('Solicitud aprobada')
          this.cargarSolicitudes()
        },
        error: (error) => {
          console.error('Error al aprobar solicitud:', error)
          notyf.error('Hubo un problema con tu solicitud, intentelo más tarde')
          this.cargarSolicitudes()
        }
            
      });
  } else {
    notyf.error('Hubo un problema con tu solicitud, intentelo más tarde')
    console.warn('Debe ingresar un ID de aprobación válido.');
    this.cargarSolicitudes()
  }
}

rechazarSolicitud(idAprobacion: number) {
  const notyf = new Notyf();
  if (idAprobacion) {
    this.aprobacionService.rechazarSolicitud(idAprobacion)
      .subscribe({
        next: (response) => {
          console.log('Solicitud rechazada:', response),
          notyf.success('Solicitud rechazada con éxito')
        },
        error: (error) => {
          console.error('Error al rechazar solicitud:', error)
          notyf.error('Hubo un problema con tu solicitud, intentelo más tarde')
        }
      });
  } else {
    notyf.error('Hubo un problema con tu solicitud, intentelo más tarde')
    console.warn('Debe ingresar un ID de aprobación válido.');
  }
}

}