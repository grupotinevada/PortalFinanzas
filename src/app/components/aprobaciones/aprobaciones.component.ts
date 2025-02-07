import { Component, OnInit} from '@angular/core';
import { ProyectoService } from '../../services/proyecto.service';


@Component({
  selector: 'app-aprobaciones',
  templateUrl: './aprobaciones.component.html',
  styleUrls: ['./aprobaciones.component.css']
})





export class AprobacionesComponent implements OnInit{
  // Placeholder para las solicitudes (simulando datos desde un endpoint)
  showSpinner = false;
  constructor(private proyectoService: ProyectoService){}
  solicitudes: any[] = [];

  
  ngOnInit(): void {
    this.obtenerSolicitudes();
  }
  
  obtenerSolicitudes(): void {
    this.showSpinner = true;
    this.proyectoService.obtenerCambiosSolicitudes().subscribe(
      (response) => {
        this.solicitudes = response.cambios;
        this.showSpinner = false;
      },
      (error) => {
        console.error('Error al obtener solicitudes:', error);
        this.showSpinner = false;
      }
    );
  }
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }




  // Variables para el popup
  solicitudSeleccionada: any = null;
  accion: string = ''; // 'aprobar' o 'rechazar'

  // Función para abrir el popup
  abrirPopup(solicitud: any, accion: string) {
    this.solicitudSeleccionada = solicitud;
    this.accion = accion;
  }

  // Función para cerrar el popup
  cerrarPopup() {
    this.solicitudSeleccionada = null;
    this.accion = '';
  }

  // Función para confirmar la acción (aprobar/rechazar)
  confirmarAccion() {
    if (this.accion === 'aprobar') {
      this.solicitudSeleccionada.estado = 'aprobado';
    } else if (this.accion === 'rechazar') {
      this.solicitudSeleccionada.estado = 'rechazado';
    }
    this.cerrarPopup();
  }

  // Verificar si el usuario actual es administrador (placeholder)
  esAdministrador(): boolean {
    // Aquí deberías implementar la lógica real para verificar roles
    return true; // Simulamos que el usuario es administrador
  }
}