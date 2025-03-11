import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Servicio de autenticación

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  isSidebarCollapsed = true;
  usuario: { nombre: string; idRol: number; nombreArea:string } | null = null; // Aquí almacenaremos los datos del usuario

  constructor(private authService: AuthService, private router: Router) {}

  // Define el evento de salida
  @Output() sidebarToggled = new EventEmitter<boolean>();

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.sidebarToggled.emit(this.isSidebarCollapsed);
  }

  ngOnInit(): void {
    // Obtener los datos del usuario (ej. nombre, idRol) desde el servicio de autenticación
    this.usuario = this.authService.getUsuario();
  }

  get nombreUsuario(): string {
    return this.usuario ? this.usuario.nombre : 'Usuario';
  }

  get nombreArea() : string {
    return this.usuario ? this.usuario.nombreArea : ' ';
  }

  IrInicio() {
    this.router.navigate(['/inicio']);
  }

  irResumenTareas(){
    this.router.navigate(['/resumenTareas']);
  }

  irAProyecto(): void {
    // Aquí puedes poner la redirección al proyecto (una vez creado)
    this.router.navigate(['/proyecto']);
  }

  cerrarSesion(): void {
    this.authService.logout(); // Método en AuthService que maneja el cierre de sesión
    this.router.navigate(['/login']);
  }

  iraAdmin(): void {
    this.router.navigate(['/admin']);
  }

  iraMiperfil(): void {
    this.router.navigate(['/miperfil']);
  }
  
  iraAprobaciones() {
    this.router.navigate(['/aprobaciones']);
  }
  
}
