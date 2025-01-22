import { Component, Inject, Output, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-editarusuario',
  templateUrl: './editarusuario.component.html',
  styleUrls: ['./editarusuario.component.css']
})
export class EditarusuarioComponent {
  @Output() usuarioActualizado: EventEmitter<any> = new EventEmitter();  // EventEmitter para emitir los datos actualizados
  usuario: any;
  roles: any[] = [];
  areas: any[] = [];
  showSpinner: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<EditarusuarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, // Recibe los datos del usuario
    private Adminservice: AdminService // Inyección del servicio
  ) {
    //console.log('Datos recibidos en el modal:', data);
    this.usuario = { ...data.usuario }; // Copia de usuario
    this.roles = data.roles; // Lista de roles
    this.areas = data.areas; // Lista de áreas
  }

guardarCambios(): void {
  this.showSpinner = true;
  // Filtramos y procesamos los datos antes de enviarlos
  const datosParaEnviar = {
    idUsuario: this.usuario.idUsuario,  // El id del usuario a modificar
    nombre: this.usuario.nombre.trim(),  // El nombre del usuario (sin espacios extra)
    correo: this.usuario.correo.trim(),  // El correo del usuario (sin espacios extra)
    habilitado: this.usuario.habilitado ? 1 : 0,  // Convertir habilitado a 0 o 1
    idRol: this.usuario.idRol,            // El id del rol
    idArea: this.usuario.idArea           // El id del área
  };

  //console.log('Datos procesados para enviar:', datosParaEnviar);

  // Llamamos al servicio para modificar el usuario
  this.Adminservice.modificarUsuario(datosParaEnviar).subscribe({
    next: (response) => {
      //console.log('Respuesta del servidor:', response);
      //console.log('Usuario creado exitosamente:', response);
      this.usuarioActualizado.emit(datosParaEnviar); // Emitir el nuevo usuario
      this.dialogRef.close(datosParaEnviar);

      // Mostrar solo la alerta proveniente del servidor (respuesta de éxito)
      if (response && response.message === 'Usuario modificado correctamente') {
        alert(response.message);  // Alerta solo cuando el servidor envíe éxito

        this.usuarioActualizado.emit(this.usuario);  // Emitir el usuario actualizado
        this.dialogRef.close(response);  // Cierra el modal y pasa el usuario editado
      }
      this.showSpinner = false;
    },
    error: (error) => {
      console.error('Error al modificar el usuario:', error);
      alert('Hubo un error al modificar el usuario');  // Alerta en caso de error
      this.showSpinner = false;
    }
  });
}

cancelar(): void {
  this.dialogRef.close(); // Cierra el modal sin guardar cambios
}

  
}
