import { Injectable } from '@angular/core';
import { HttpClient,HttpErrorResponse} from '@angular/common/http';
import { Observable, catchError, throwError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
export interface TareaResumen {
  //tarea
  idTarea: number;
  nombreTarea: string;
  descripcionTarea: string;
  fechaCompromisoTarea: Date;
  idProyectoTarea: number;
  porcentajeAvanceTarea: string;
  descripcionEstado: string;
  //proyecto
  nombreProyecto: string;
  porcentajeAvanceProyecto: number;
  habilitado: number;
  // usuario
  nombreArea: string;
  nombreUsuario: string;
  correoUsuario: string;
}
@Injectable({
  providedIn: 'root',
})
export class TareaService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}
  getTareasPorId(idProyecto: number): Observable<any> {
    const url = `${this.apiUrl}/proyecto/${idProyecto}/tareas`;
    return this.http.get(url);
  }
  createTarea(idProyecto: number, tarea: any): Observable<any> {
    const url = `${this.apiUrl}/proyecto/${idProyecto}/tareas`;
    return this.http.post(url, tarea, { responseType: 'text' as 'json' });
  }
  deleteTareasPorProyecto(idProyecto: number): Observable<any> {
    const url = `${this.apiUrl}/proyecto/${idProyecto}/tareas`;
    return this.http.delete(url, { responseType: 'text' }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al eliminar las tareas:', error);
        return throwError(error);
      })
    );
  }
  updatePorcentaje(
    idProyecto: number,
    porcentajeAvance: number
  ): Observable<any> {
    const url = `${this.apiUrl}/proyecto/${idProyecto}/porcentaje`;
    return this.http.put(url, { porcentajeAvance }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al actualizar el porcentaje:', error);
        return throwError(() => error);
      })
    );
  }
  // Add these methods to TareaService
  getArchivosPorProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/archivos/${idProyecto}`);
  }

  descargarArchivo(filename: string, idProyecto: number): Observable<Blob> {
    // Usamos el idProyecto en la URL para que el servidor pueda filtrar correctamente los archivos
    return this.http.get(`${this.apiUrl}/uploads/${filename}/${idProyecto}`, {
      responseType: 'blob',
    });
  }

  subirArchivo(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/archivos`, formData);
  }

  verificarArchivo(
    nombreArchivo: string,
    idProyecto: number
  ): Observable<{ existe: boolean; idArchivo: number | null }> {
    return this.http.get<{ existe: boolean; idArchivo: number | null }>(
      `${this.apiUrl}/api/archivos/verificar`,
      { params: { nombre: nombreArchivo, idproyecto: idProyecto.toString() } }
    );
  }

  eliminarArchivo(idArchivo: number, idProyecto: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/api/archivos/${idArchivo}/${idProyecto}`
    );
  }

  verificarTareasExistentes(idProyecto: number): Observable<boolean> {
    const url = `${this.apiUrl}/proyecto/${idProyecto}/tareas`;
    return this.http.get<any[]>(url).pipe(
      map((response) => response && response.length > 0), // Retorna true si hay tareas, false si no
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          // Si la respuesta es 404, significa que no hay tareas para este proyecto
          console.log('No hay tareas asignadas para este proyecto.');
          return of(false);
        }
        console.error('Error al verificar tareas:', error);
        return throwError(error);
      })
    );
  }
  getTareas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tarea`); // Endpoint de tareas
  }
}
