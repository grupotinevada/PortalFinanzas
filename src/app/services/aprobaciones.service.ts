import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';


interface Cambio {
  anterior: string;
  nuevo: string;
}

export interface Solicitud {
  idAprobacion: number,
  idProyecto: number,
  nombreSolicitante: string;
  nombreProyecto: string,
  fechaSolicitud: string;
  descripcionSolicitud: string;
  cambios: { [key: string]: Cambio };
  estadoSolicitud: string;
}

@Injectable({
  providedIn: 'root'
})


export class AprobacionesService {
  private apiBase = environment.apiBaseUrl;;
  constructor(private http: HttpClient, private authService: AuthService) { }



  //metodo para modificar proyecto
  // Solicitar cambio en un proyecto (Crea un registro en APROBACION)
  solicitarCambioProyecto(idProyecto: number, data: any){
    return this.http.put(`${this.apiBase}/proyecto/${idProyecto}/solicitud`, data);
  }
  // Obtener solicitudes pendientes
  obtenerCambiosSolicitudes(){
    return this.http.get(`${this.apiBase}/solicitudes/cambios`);
  }
  // Aprobar solicitud (Aplica cambios en PROYECTO y actualiza LOG)
  aprobarSolicitud(idAprobacion: number) {
    return this.http.put(`${this.apiBase}/aprobacion/${idAprobacion}`, {
      idAprobador: this.authService.getUsuarioId(),
      estadoSolicitud: 2 // 2 = Aprobado
    });
  }
  
  rechazarSolicitud(idAprobacion: number) {
    return this.http.put(`${this.apiBase}/aprobacion/${idAprobacion}`, {
      idAprobador: this.authService.getUsuarioId(),
      estadoSolicitud: 3 // 3 = Rechazado
    });
  }
}
