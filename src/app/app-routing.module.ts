import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { ProyectoComponent } from './components/proyecto/proyecto.component';
import { TareasComponent } from './components/tareas/tareas.component';
import { AuthGuard } from './guards/auth.guard';
import { RecuperarContrasenaComponent } from './components/recuperar-contrasena/recuperar-contrasena.component';
import { AdminComponent } from './components/admin/admin.component';
import { MiperfilComponent } from './components/miperfil/miperfil.component';
import { AprobacionesComponent } from './components/aprobaciones/aprobaciones.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'inicio', component: InicioComponent, canActivate:[AuthGuard]},  // Verifica que esta ruta esté definida
  { path: 'proyecto', component: ProyectoComponent, canActivate:[AuthGuard]},
  { path: 'tareas/:idProyecto', component: TareasComponent, canActivate:[AuthGuard]},
  { path: 'recuperar-contrasena', component: RecuperarContrasenaComponent},
  { path: 'admin', component: AdminComponent, canActivate:[AuthGuard]},
  { path: 'miperfil', component: MiperfilComponent, canActivate:[AuthGuard]},
  { path: 'aprobaciones', component: AprobacionesComponent, canActivate:[AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }