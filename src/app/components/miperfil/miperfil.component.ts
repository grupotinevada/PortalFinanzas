import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { MiperfilService } from '../../services/miperfil.service';
import { AuthService } from '../../services/auth.service';
import {UserService} from '../../services/user.service';
import { MatTableDataSource } from '@angular/material/table';
import { ProyectoService, Proyecto } from '../../services/proyecto.service';







@Component({
  selector: 'app-miperfil',
  templateUrl: './miperfil.component.html',
  styleUrls: ['./miperfil.component.css']
})
export class MiperfilComponent implements OnInit {
  proyectos: Proyecto[] = [];
  area: string = '';
  perfil = {
    idUsuario: null,
    nombre: '',
    correo: '',
    contrasenaActual: '',
    nuevaContrasena: '',
    confirmarNuevaContrasena: '',
  };
  showSpinner: boolean = false;
  showErrorMessage: boolean = false;
  data: any[] = [];
  dataSource = new MatTableDataSource<Proyecto>(this.proyectos);
  isDevelopment: boolean = true; // Para panel de desarrollo

  // Propiedades para métricas
  totalProyectos: number = 0;
  proyectosAtrasados: number = 0;
  promedioProgreso: number = 0;

  usuario: any | null;
  mostrarContrasena = false;

  tienesDatos: boolean = false;


  displayedColumns: string[] = [
    'nombreProyecto', 'descripcion', 'nombreArea', 'fechaInicio',
    'fechaReal', 'fechaFin', 'porcentajeAvance', 'descripcionEstado',
    'tareas'
  ];

  constructor(
    private miperfilService: MiperfilService,
    private authService: AuthService,
    private userService: UserService,
    private proyectoService: ProyectoService,
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    const usuario = this.authService.getUsuario();
    if (usuario) {
      this.perfil.idUsuario = usuario.id;
      this.perfil.nombre = usuario.nombre;
      this.perfil.correo = usuario.correo;
    }
    this.cargarProyectos();
    this.tienesDatos = this.totalProyectos > 0;

  }

  cargarProyectos(): void {
    this.showSpinner = true;
    const usuario = this.authService.getUsuario(); // Usuario actual
    //console.log('usuario: ', usuario)
    const idUsuario = usuario.id; // Id del usuario actual
    //console.log('id: ', idUsuario)
    const idAreaUsuario = usuario.idArea; // Área del usuario actual
    //console.log('idarea: ', idAreaUsuario)
  
    if (idUsuario) {
      this.showSpinner = true;
      this.proyectoService.getProyectos().subscribe(
        (proyectos) => {
          const hoy = new Date();
  
          // Filtrar proyectos del usuario
          this.proyectos = proyectos
            .filter((proyecto) => proyecto.idArea === idAreaUsuario)
            .map((proyecto) => ({
              ...proyecto,
              porcentajeAvance: Number(proyecto.porcentajeAvance),
            }));
  
          // Calcular proyectos atrasados
          const atrasados = this.proyectos.filter(
            (proyecto) =>
              proyecto.fechaReal && new Date(proyecto.fechaReal) < hoy
          );
  
          // Calcular progreso promedio
          const totalProgreso = this.proyectos.reduce(
            (sum, proyecto) => sum + (proyecto.porcentajeAvance || 0),
            0
          );
          const promedioProgreso = this.proyectos.length
            ? totalProgreso / this.proyectos.length
            : 0;
  
          // Asignar valores a las propiedades
          this.totalProyectos = this.proyectos.length;
          this.proyectosAtrasados = atrasados.length;
          this.promedioProgreso = promedioProgreso;
  
          this.dataSource.data = this.proyectos;
          this.showSpinner = false;
        },
        (error) => {
          console.error('Error al cargar proyectos:', error);
          this.showSpinner = false;
          Swal.fire('Error', 'Error al cargar los proyectos', 'error');
        }
      );
    } else {
      console.error('No se pudo obtener el id del usuario');
      this.showSpinner = false;
    }
  }

  private cargarUsuario(): void {

    this.usuario = this.authService.getUsuario();
  }

  // Métodos para los gráficos circulares
  getOnTimeProjectsPercentage(): string {
    if (this.totalProyectos === 0) return '0, 100';
    const onTimeProjects = this.totalProyectos ;
    const percentage = (onTimeProjects / this.totalProyectos) * 100;
    return `${percentage}, 100`;
  }

  getDelayedProjectsPercentage(): string {
    if (this.totalProyectos === 0) return '0, 100';
    const percentage = (this.proyectosAtrasados / this.totalProyectos) * 100;
    return `${percentage}, 100`;
  }

  // Método para obtener el color del progreso
  getProgressColor(proyecto: Proyecto): string {
    const hoy = new Date();
    const fechaReal = proyecto.fechaReal ? new Date(proyecto.fechaReal) : new Date();
    let clase = '';

    switch (true) {
      case (fechaReal < hoy && proyecto.porcentajeAvance < 100):
        clase = 'titulo-bg-atrasado'; // Clase para atrasados
        break;
      case (proyecto.porcentajeAvance >= 100):
        clase = 'titulo-bg-completado'; // Clase para completados
        break;
      default:
        clase = 'titulo-bg-progreso'; // Clase para en progreso
        break;
    }

    return clase;
  }

  toggleMostrarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  actualizarPerfil(): void {
    if (this.perfil.nuevaContrasena !== this.perfil.confirmarNuevaContrasena) {
      Swal.fire('Error', 'Las contraseñas nuevas no coinciden.', 'error');
      return;
    }

    this.miperfilService.actualizarPerfilCompleto(this.perfil).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Perfil actualizado correctamente.', 'success');
        // Actualizar datos locales
        const usuarioActual = this.authService.getUsuario();
        if (usuarioActual) {
          usuarioActual.nombre = this.perfil.nombre;
          usuarioActual.correo = this.perfil.correo;
          localStorage.setItem('usuario', JSON.stringify(usuarioActual));
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo actualizar el perfil. Verifica tus datos.', 'error');
      }
    });
  }

  getAreaClass(idArea: number): string {
    switch (idArea) {
      case 1: return 'titulo-bg-primary';
      case 2: return 'titulo-bg-success';
      case 3: return 'titulo-bg-warning';
      case 4: return 'titulo-bg-secondary';
      default: return 'titulo-bg-light';
    }
  }

  // Método para formatear fechas
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString();
  }
}