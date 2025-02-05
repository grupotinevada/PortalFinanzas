import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

@Component({
  selector: 'app-aprobaciones',
  templateUrl: './aprobaciones.component.html',
  styleUrls: ['./aprobaciones.component.css']
})
export class AprobacionesComponent {
  // Placeholder para las solicitudes (simulando datos desde un endpoint)
  solicitudes = [
    {
      id: 1,
      usuarioSolicitante: 'Juan Pérez',
      cambioSolicitado: 'Fecha de inicio',
      descripcion: 'Cambio de fecha debido a retraso en recursos.',
      estado: 'pendiente' // Estados posibles: 'pendiente', 'aprobado', 'rechazado'
    },
    {
      id: 2,
      usuarioSolicitante: 'María López',
      cambioSolicitado: 'Fecha de fin',
      descripcion: 'Extensión del proyecto por falta de personal.',
      estado: 'pendiente'
    }
  ];

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