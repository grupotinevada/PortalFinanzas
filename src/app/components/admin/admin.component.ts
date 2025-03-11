import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../services/admin.service';
import { CrearUsuarioComponent } from '../crearusuario/crearusuario.component';
import { EditarusuarioComponent } from '../editarusuario/editarusuario.component';
import { forkJoin } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  roles: any[] = [];
  areas: any[] = [];
  usuarios: any[] = [];
  showSpinner = false;
  dataSource = new MatTableDataSource<any>(this.usuarios);

  columnas: string[] = ['idUsuario', 'nombre', 'correo', 'descripcionRol', 'nombreArea', 'habilitado', 'acciones'];

  constructor(private dialog: MatDialog, private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarRoles();
    this.cargarAreas();
  }

  cargarUsuarios(): void {
    this.showSpinner=true;
    this.adminService.obtenerDetallesUsuarios().subscribe((usuarios: any[]) => {
      this.usuarios = usuarios;
      this.dataSource.data = this.usuarios;
      this.showSpinner = false;
    });

  }

  cargarRoles(): void {
    this.adminService.obtenerRoles().subscribe((roles: any[]) => {
      this.roles = roles;
    });
  }

  cargarAreas(): void {
    this.adminService.obtenerAreas().subscribe((areas: any[]) => {
      this.areas = areas;
    });
  }

  abrirModalCrearUsuario(): void {
    forkJoin({
      roles: this.adminService.obtenerRoles(),
      areas: this.adminService.obtenerAreas()
    }).subscribe({
      next: (data) => {
        const dialogRef = this.dialog.open(CrearUsuarioComponent, {
          width: '90%',
          maxWidth: '800px',
          height: 'auto',
          maxHeight: '90vh',
          panelClass: 'custom-dialog-container',
          data: { roles: data.roles, areas: data.areas },
        });
  
        dialogRef.afterClosed().subscribe((nuevoUsuario) => {
          if (nuevoUsuario) {
            // Agregar el nuevo usuario al backend (debe existir el servicio para esto)
            this.adminService.crearUsuario(nuevoUsuario).subscribe({
              next: () => {
                // Actualizar el dataSource
                this.dataSource.data = [...this.usuarios];
                // Recargar los usuarios desde la base de datos después de crear uno nuevo
                this.cargarUsuarios();
              },
              error: (error) => {
                console.error('Error al crear el usuario:', error);
                // Actualizar el dataSource
                this.dataSource.data = [...this.usuarios];
                // Recargar los usuarios desde la base de datos después de crear uno nuevo
                this.cargarUsuarios();
              }
            });
          }
        });
      },
      error: (error) => console.error('Error cargando datos:', error)
    });
  }
  

  abrirModalEditarUsuario(usuario: any): void {
    const dialogRef = this.dialog.open(EditarusuarioComponent, {
      width: '90%',
      maxWidth: '800px',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      data: {
        usuario,
        roles: this.roles,
        areas: this.areas
      },
    });

    const componenteInstancia = dialogRef.componentInstance;
    
    // Escuchar el evento de usuario actualizado
    componenteInstancia.usuarioActualizado.subscribe((usuarioActualizado: any) => {
      const index = this.usuarios.findIndex(u => u.idUsuario === usuarioActualizado.idUsuario);
      if (index !== -1) {
        const rolActualizado = this.roles.find(r => r.idRol === usuarioActualizado.idRol);
        const areaActualizada = this.areas.find(a => a.idArea === usuarioActualizado.idArea);

        // Actualizar el usuario en el arreglo
        this.usuarios[index] = {
          ...usuarioActualizado,
          descripcionRol: rolActualizado?.descripcion,
          nombreArea: areaActualizada?.nombre
        };

                // Actualizar el dataSource
                this.dataSource.data = [...this.usuarios];
                // Recargar los usuarios desde la base de datos después de crear uno nuevo
                this.cargarUsuarios();
      }
    });
  }
}
