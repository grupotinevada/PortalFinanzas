import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecuperarContrasenaService {
  private apiUrl = environment.apiBaseUrl;;
 // private apiUrl = 'http://localhost:3000';
  constructor(private http: HttpClient) {}

  /**
   * Enviar código de recuperación al correo
   * @param correo Correo electrónico del usuario
   * @returns Observable con la respuesta del backend
   */
  enviarCodigo(correo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/recuperar`, { correo });
  }

  /**
   * Verificar el código ingresado por el usuario y restablecer la contraseña si se proporciona
   * @param correo Correo electrónico del usuario
   * @param codigo Código de verificación enviado al correo
   * @param nuevaPassword Nueva contraseña, opcional
   * @returns Observable con la respuesta del backend
   */
  verificarCodigo(correo: string, codigo: string, nuevaPassword?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar`, { correo, codigo, nuevaContrasena: nuevaPassword });
  }

  /**
   * Actualizar la contraseña después de verificar el código
   * @param correo Correo electrónico del usuario
   * @param codigo Código de verificación enviado al correo
   * @param nuevaContrasena Nueva contraseña que se va a actualizar
   * @returns Observable con la respuesta del backend
   */
  actualizarContrasena(correo: string, nuevaContrasena: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/actualizarContrasena`, { correo, nuevaContrasena });
  }
}

