import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiBase = environment.apiBaseUrl;;
  
  constructor(private http: HttpClient) { }

  obtenerDetallesUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/usuarios/detalles`);
  }

  obtenerRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/roles`);
  }

  obtenerAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/areas`);
  }

  crearUsuario(usuario: any): Observable<any> {
    return this.http.post(`${this.apiBase}/usuarios`, usuario).pipe(
      catchError((error) => {
        console.error('Error al enviar la solicitud:', error);
  
        // Si el error es un conflicto pero el usuario fue creado, manejarlo adecuadamente
        if (error.status === 409 && error.error?.created) {
          console.warn('El usuario se creó pero se reportó un conflicto: ', error.error);
          return of(error.error); // Devuelve el resultado exitoso del backend
        }
  
        // Otros errores (por ejemplo, problemas con el servidor o datos incorrectos)
        return throwError(error);
      })
    );
  }

  modificarUsuario(usuario: any): Observable<any> {
    return this.http.put(`${this.apiBase}/modificarUsuario`, usuario);
  }
  

}