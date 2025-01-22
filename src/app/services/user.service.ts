import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  passHash: string;
  idRol: number;
  idArea: number;
  nombreArea: string
}

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private apiBase = environment.apiBaseUrl;
  
  
  constructor(private http: HttpClient) {}

  // Método para obtener la lista de usuarios desde el backend
  getUsuarios(): Observable<Usuario[]> {
    const url = `${this.apiBase}/usuario`
    return this.http.get<Usuario[]>(url);
  }

  // Método para manejar el inicio de sesión
  login(correo: string, password: string): Observable<any> {
    const url = `${this.apiBase}/login`
    return this.http.post<any>(url, { correo, password });
  }
}