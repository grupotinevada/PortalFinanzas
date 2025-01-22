import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MiperfilService {
  private apiUrl = environment.apiBaseUrl;; // Cambia según tu configuración

  constructor(private http: HttpClient) {}

  actualizarPerfilCompleto(perfil: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/actualizarPerfilCompleto`, perfil);
  }
}
