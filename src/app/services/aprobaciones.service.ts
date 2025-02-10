import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';


interface Cambio {
  anterior: string;
  nuevo: string;
}

export interface Solicitud {
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
  aprobarSolicitud(idAprobacion: number, estadoSolicitud: number) {
    return this.http.put(`/aprobacion/${idAprobacion}`, {
      idAprobador: this.authService.getUsuarioId(),
      estadoSolicitud: estadoSolicitud
    });
  }
  // Rechazar solicitud (Solo actualiza el estado de la solicitud)
  rechazarSolicitud(idSolicitud: number, idAprobador: number, motivo: string) {
    return this.http.put(`${this.apiBase}/rechazar-solicitud/${idSolicitud}`, { idAprobador, motivo });
  }
}
