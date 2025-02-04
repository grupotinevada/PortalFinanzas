// nuevo-proyecto-dialog.component.ts
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ProyectoService, Proyecto } from '../../services/proyecto.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-agregarproyectodialog',
  templateUrl: './agregarproyectodialog.component.html',
  styleUrl: './agregarproyectodialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})



export class AgregarproyectodialogComponent implements OnInit {
  showSpinner: boolean = false;
  proyectoForm: FormGroup;
  proyectos: Proyecto[] = [];
  listaProyectos: Proyecto[] = [];
  areas: any[] = [];
  usuarioArea: number = 0;


  formatLabel(value: number): string {
    return  `${value}`;
  }
  constructor(
    private dialogRef: MatDialogRef<AgregarproyectodialogComponent>,
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private authService: AuthService,
    private proyectoStateService: ProyectoService
  ) {
    // Crear el formulario reactivo con validaciones
    this.proyectoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(30)]],
      descripcion: ['', [Validators.required, Validators.maxLength(30)]],
      fechaInicio: [null, Validators.required],
      fechaReal: [null, Validators.required],
      fechaFin: ['', { validators: [], updateOn: 'blur' }],  // Inicialmente sin validadores
      porcentajeAvance: [0, [Validators.required]],
      idUsuario: [this.authService.getUsuarioId(), Validators.required],
      idArea: [{
        value: this.authService.getUsuario().idArea === 5 ? null : this.authService.getUsuario().idArea,
        disabled: this.authService.getUsuario().idArea !== 5
      }, Validators.required],
      idEstado: ['', Validators.required]
    });  // Validador de grupo para validar fechaFin

    this.getEstado();
    
  }
  ngOnInit(): void {
     // Observa cambios en el estado del proyecto
     this.proyectoForm.get('idEstado')?.valueChanges.subscribe((estadoId) => {
      this.updateFechaFinValidation(estadoId);
      //console.log("Actualizacion de estado: ", estadoId)
      
    });
    this.getAreas();
    // Llama al método getEstado (supongo que es para obtener los estados desde un servicio)
    this.getEstado();
  }
    // Actualiza la validación de la fecha de finalización
    updateFechaFinValidation(estadoId: number): void {
      const fechaFinControl = this.proyectoForm.get('fechaFin');
      
      if (estadoId === 4) {  // Si el estado es "Finalizado"
        fechaFinControl?.setValidators([Validators.required]);  // Agrega Validators.required
        
      } else {
        fechaFinControl?.clearValidators();  // Limpia validaciones si no es "Finalizado"
      }
  
      fechaFinControl?.updateValueAndValidity();  // Actualiza la validez
      
    }
  
  // Método para enviar el proyecto al servicio
  anadirProyecto(): void {
    if (this.proyectoForm.valid) {
      //console.log('Formulario válido:', this.proyectoForm.value);
      // Obtenemos los valores del formulario
      const proyectoData = this.proyectoForm.value;
  
      // Asegurarnos de que las fechas sean tipo Date o formato correcto para enviar al backend
      proyectoData.fechaInicio = this.formatDate(proyectoData.fechaInicio);
      proyectoData.fechaReal = this.formatDate(proyectoData.fechaReal);
      proyectoData.fechaFin = this.formatDate(proyectoData.fechaFin);
  
      // Asegurarnos de que los campos numéricos estén correctos
      proyectoData.porcentajeAvance = Number(proyectoData.porcentajeAvance);
      proyectoData.idUsuario = Number(proyectoData.idUsuario);
      proyectoData.idArea = Number(proyectoData.idArea);
      proyectoData.idEstado = Number(proyectoData.idEstado);

      this.showSpinner = true
      // Llamar al servicio para añadir el proyecto
      this.proyectoService.addProyecto(proyectoData).subscribe(
        response => {
          //console.log('Proyecto creado exitosamente', response);
          
          this.proyectoService.getProyectos().subscribe((proyectos)=>{
            this.proyectoStateService.actualizarProyectos(proyectos);
          })
          this.showSpinner = false;
          this.dialogRef.close(response); // Cierra el diálogo
        },
        error => {
          console.error('Error al crear proyecto', error);
          this.showSpinner = false;
          // Opcional: agrega lógica para mostrar un mensaje de error al usuario
          //console.log(proyectoData)
        }
      );
    }else {
      //console.log('Formulario inválido');
      this.showSpinner = false;
      this.mostrarAlerta()
    }

  }
  

 mostrarAlertaFechaFin() {
    window.alert('La fecha de finalización es obligatoria cuando el estado es "Finalizado".');
  }
  mostrarAlerta() {
    window.alert('El formulario es inválido, por favor revisar todos los campos.');
  }

  // Función para asegurarse de que las fechas estén en el formato correcto (si es necesario)
  private formatDate(date: any): string | null {
    if (date) {
      // Asegúrate de que sea un objeto Date, si no lo es, intenta convertirlo
      const formattedDate = new Date(date);
      if (!isNaN(formattedDate.getTime())) {
        // Devuelve la fecha en formato YYYY-MM-DD
        return formattedDate.toISOString().split('T')[0];
      }
    }
    return null; // Devuelve null si la fecha no es válida
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Método para cargar los estados de los proyectos
  getEstado(): void {
    this.proyectoService.getEstado().subscribe(
      (data: Proyecto[]) => {
        this.proyectos = data;
        //console.log('Estados cargados:', this.proyectos); // Verifica que se carguen correctamente
      },
      error => {
        console.error('Error al cargar estados', error);
      }
    );
  }

  getAreas(): void {
    this.proyectoService.getArea().subscribe(
      (data: any[]) => {
        this.areas = data;
        //console.log('Areas cargadas:', this.areas); // Verifica que se carguen correctamente
      },
      error => {
        console.error('Error al cargar areas', error);
      }
    );
}


}

