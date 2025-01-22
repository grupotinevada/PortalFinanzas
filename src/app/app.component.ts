// app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Control Panel';
  rol: number | undefined; // Asegúrate de definir la variable `rol`
  area: number | undefined; // Asegúrate de definir la variable `rol`
  constructor(public router: Router, private authService: AuthService) { }
  showSidebar = false; // Determina si el sidebar está visible
  isSidebarHidden = true; // Controla el estado del sidebar (oculto/visible)



  ngOnInit(): void {
    this.router.events.subscribe(() => {
      // Oculta el sidebar si la ruta actual es '/login' o '/recuperar-contrasena'
      this.showSidebar = this.router.url !== '/login' && this.router.url !== '/recuperar-contrasena';
    });
    
  
    // Solo asigna información del usuario si está autenticado
    if (this.authService.isAuthenticated()) {
      const usuario = this.authService.getUsuario();
      this.rol = usuario?.idRol;
      this.area = usuario?.idArea;
      //console.log('info sesion: ', usuario);
    }
  }

  // Alternar visibilidad del sidebar
  toggleSidebar() {
    this.isSidebarHidden = !this.isSidebarHidden;
  }

  // Método que se llama cuando el sidebar se oculta o muestra
  onSidebarToggled(isHidden: boolean) {
    this.isSidebarHidden = isHidden;
  }

}
