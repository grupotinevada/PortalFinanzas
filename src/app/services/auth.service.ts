import { Injectable } from '@angular/core';
import { Usuario } from './user.service';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;
  private usuario: Usuario | null = null;
  private expirationTimeout: any;

  constructor() {
    // Verificar si localStorage está disponible
    if (this.isLocalStorageAvailable()) {
      this.token = localStorage.getItem('token') || null;
      const usuarioData = localStorage.getItem('usuario');
      this.usuario = usuarioData ? JSON.parse(usuarioData) : null;

    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }


  login(token: string, usuario: any): void {
    this.token = token;
    this.usuario = usuario;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }


  logout(): void {
    this.clearSession();
  }


  // Método para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token'); // Comprueba el token en localStorage
      return !!token; // Devuelve true si existe, false si no
    }
    return false; // Devuelve false si no está en el navegador
  }

  //obtener usuario 
  getUsuario(): any {
    return this.usuario;

  }

  //obtener id del usuario
  getUsuarioId(): number | null {
    return this.usuario ? this.usuario.id : null;
  }

  //Funcion para activar el temporizador para la expiración de las sesion
  startInactivityTimer() {
    this.clearInactivityTimer();
    this.expirationTimeout = setTimeout(() => {
      this.logout();
      alert('Tu sesión ha expirado por inactividad.');
    }, 10 * 60 * 1000); // 10 minutos
  }

  private clearInactivityTimer(): void {
    if (this.expirationTimeout) {
      clearTimeout(this.expirationTimeout);
      this.expirationTimeout = null;
    }
  }

  // Limpia la sesión al cerrar sesión
  clearSession(): void {
    this.token = null;
    this.usuario = null;

    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }

    this.clearInactivityTimer();
  }
}


