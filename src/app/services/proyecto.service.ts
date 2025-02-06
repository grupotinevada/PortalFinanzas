// proyecto.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';


export interface Proyecto {
  idProyecto: number;
  nombreProyecto: string;
  descripcion: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  porcentajeAvance: number; // Cambiar a number
  idUsuario: number;
  nombreUsuario: string;
  correoUsuario: string;
  idArea: number;
  nombreArea: string;
  idEstado: number;
  fechaReal: Date;
  descripcionEstado: string;
  fechaCreacion: Date;
  fechaModificacion: Date;
  editable?: boolean;
}
export interface Area {
  id: number;
  nombre: string;
  proyectos: Proyecto[];
}

export interface ArchivoProyecto {
  idArchivo: number;
  idProyecto: number;
  idArea: number;
  idUsuario: number;
  nombreArchivo: string;
  archivo: any; // Buffer para los datos del archivo
  fechaCreacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private apiBase = environment.apiBaseUrl;;
  // private apiBase = 'http://localhost:3000';
  private proyectosSubject = new BehaviorSubject<Proyecto[]>([]);
  proyectos$ = this.proyectosSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Método para obtener la lista de proyectos
  getProyectos(): Observable<Proyecto[]> {
    const url = `${this.apiBase}/proyectos-completos`;
    return this.http.get<Proyecto[]>(url);
  }
  //Retorna proyecto especifico por ID Proyecto
  getProyectoPorId(idProyecto: number): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/proyecto/${idProyecto}`);
  }
  // Método para obtener todos los proyectos del usuario por el idUsuario
  getProyectosUsuario(idUsuario: number): Observable<Proyecto[]> {
    const url = `${this.apiBase}/proyecto/usuario/${idUsuario}`;
    return this.http.get<Proyecto[]>(url);
  }

  // Método para obtener LAS AREAS Y SUS RESPECTIVOS PROYECTOS
  getProyectosPorAreas(): Observable<Proyecto[]> {
    const url = `${this.apiBase}/areas-proyectos`;
    return this.http.get<Proyecto[]>(url);
  }





  //metodo para modificar proyecto
  // Solicitar cambio en un proyecto (Crea un registro en APROBACION)
  solicitarCambioProyecto(idProyecto: number, data: any): Observable<any> {
    return this.http.put(`${this.apiBase}/proyecto/${idProyecto}/solicitud`, data);
}
  // Obtener solicitudes pendientes
  obtenerSolicitudes() {
    return this.http.get(`${this.apiBase}/solicitudes-pendientes`);
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




  //metodo para eliminar proyecto
  deleteProyecto(idProyecto: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/proyectos/${idProyecto}`, { responseType: 'text' });
  }

  //metodo para agregar proyecto
  addProyecto(proyecto: Partial<Proyecto>): Observable<any> {
    const url = `${this.apiBase}/proyecto`;
    return this.http.post(url, proyecto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
  //codigo para obtener tablas especificas
  getEstado(): Observable<Proyecto[]> {
    const url = `${this.apiBase}/estado`;
    return this.http.get<Proyecto[]>(url)
  }
  getArea(): Observable<Area[]> {
    const url = `${this.apiBase}/area`;
    return this.http.get<Area[]>(url);
  }

  // Actualiza la lista de proyectos
  actualizarProyectos(proyectos: Proyecto[]) {
    this.proyectosSubject.next(proyectos);
  }

  // Método para obtener los proyectos desde el Subject
  getProyectosObservable(): Observable<Proyecto[]> {
    return this.proyectos$;
  }
  // Método para obtener historial de cambios
  getHistorialCambios(idProyecto: number): Observable<any> {
    return this.http.get(`${this.apiBase}/proyecto/${idProyecto}/log`);
  }
  // Método para obtener 
  subirArchivo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/archivos-proyecto`, formData);
  }

  descargarArchivo(idArchivo: number): Observable<Blob> {
    return this.http.get(`${this.apiBase}/archivos-proyecto/descargar/${idArchivo}`, {
      responseType: 'blob'
    });
  }

  eliminarArchivo(idArchivo: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/archivos-proyecto/${idArchivo}`);
  }

  getArchivosPorProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/archivos-proyecto/${idProyecto}`);
  }
}

