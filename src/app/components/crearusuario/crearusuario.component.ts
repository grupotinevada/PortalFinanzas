import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-crearusuario',
  templateUrl: './crearusuario.component.html',
  styleUrls: ['./crearusuario.component.css']
})
export class CrearUsuarioComponent implements OnInit {
  @Output() usuarioCreado = new EventEmitter<any>(); // Evento para emitir el nuevo usuario
  roles: any[] = [];
  areas: any[] = [];
  rolesSubject = new BehaviorSubject<any[]>([]);
  areasSubject = new BehaviorSubject<any[]>([]);
  usuarioForm!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CrearUsuarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.roles = data?.roles || [];
    this.areas = data?.areas || [];
    this.rolesSubject.next(this.roles);
    this.areasSubject.next(this.areas);
  }

  ngOnInit(): void {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      rol: ['', Validators.required],
      area: ['', Validators.required],
      habilitado: [false] // Inicializado como booleano
    });

    // Recarga el formulario si roles o áreas cambian
    this.rolesSubject.subscribe((roles) => {
      if (roles.length > 0) {
        this.usuarioForm.get('rol')?.setValue(roles[0].id);
      }
    });

    this.areasSubject.subscribe((areas) => {
      if (areas.length > 0) {
        this.usuarioForm.get('area')?.setValue(areas[0].id);
      }
    });
  }

  guardarUsuario(): void {
    if (this.usuarioForm.valid) {
      //console.log('Valor habilitado:', this.usuarioForm.get('habilitado')?.value);

      
      const nuevoUsuario = {
        nombre: this.usuarioForm.get('nombre')?.value.trim(),
        correo: this.usuarioForm.get('correo')?.value.trim(),
        password: 'Password123',
        idRol: parseInt(this.usuarioForm.get('rol')?.value, 10),
        idArea: parseInt(this.usuarioForm.get('area')?.value, 10),
        habilitado: this.usuarioForm.get('habilitado')?.value ? 1 : 0,
      };
  
      //console.log('Valor de habilitado:', habilitado);
      //console.log('Nuevo usuario a guardar:', nuevoUsuario);
  
      this.adminService.crearUsuario(nuevoUsuario).subscribe(
        (response) => {
          //console.log('Respuesta del servidor:', response);
          //console.log('Usuario creado exitosamente:', response);
          this.usuarioCreado.emit(nuevoUsuario); // Emitir el nuevo usuario
          this.dialogRef.close(nuevoUsuario);
        },
        (error) => {
          console.error('Error al crear el usuario:', error);
          if (error.status === 409) {
            const conflictMessage = error?.error?.message || 'Conflicto desconocido.';
            alert(`No se pudo crear el usuario: ${conflictMessage}`);
          } else if (error?.error?.message) {
            alert(`Hubo un problema: ${error.error.message}`);
          } else if (error?.status) {
            alert(`Error ${error.status}: ${error.statusText || 'Desconocido'}`);
          } else {
            alert('Hubo un problema al crear el usuario.');
          }
        }
      );
    } else {
      console.warn('Formulario no válido:', this.usuarioForm.errors);
      console.group('Estado actual del formulario inválido');
      console.log('Valores del formulario:', this.usuarioForm.value);
      console.log('Errores de validación:', this.usuarioForm.controls);
      console.groupEnd();
    }
  }
  cancelar(): void {
    this.dialogRef.close();
  }
}