import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Servicio de autenticación

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  usuario: { nombre: string; idRol: number } | null = null; // Aquí almacenaremos los datos del usuario

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Obtener los datos del usuario (ej. nombre, idRol) desde el servicio de autenticación
    this.usuario = this.authService.getUsuario();
  }

  get nombreUsuario(): string {
    return this.usuario ? this.usuario.nombre : 'Usuario';
  }

  IrInicio() {
    this.router.navigate(['/inicio']);
  }

  irAProyecto(): void {
    // Aquí puedes poner la redirección al proyecto (una vez creado)
    this.router.navigate(['/proyecto']);
  }

  cerrarSesion(): void {
    this.authService.logout(); // Método en AuthService que maneja el cierre de sesión
    this.router.navigate(['/login']);
  }
}
