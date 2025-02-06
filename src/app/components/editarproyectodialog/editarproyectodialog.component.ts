import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProyectoService, Proyecto } from '../../services/proyecto.service';
import { AuthService } from '../../services/auth.service';



@Component({
  selector: 'app-editarproyectodialog',
  templateUrl: './editarproyectodialog.component.html',
  styleUrls: ['./editarproyectodialog.component.css']
})
export class EditarproyectodialogComponent implements OnInit {
  showSpinner: boolean = false;
  proyectoForm: FormGroup;
  estados: any[] = []; // Lista de estados
  nombreArea: string = '';
  proyectoOriginal: any; // Almacena el proyecto original
  localFechaInicio: string | null = null;
  localFechaFin: string | null = null;
  localFechaReal: string | null = null;
  areas: any[] = [];
  usuarioArea: number = 0;
  fechaCreacion: Date | null = null;

  constructor(
    private dialogRef: MatDialogRef<EditarproyectodialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { idProyecto: number; proyectoOriginal: any },
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private authService: AuthService
  ) {
    // Inicializar el formulario reactivo
    this.proyectoForm = this.fb.group({
      idProyecto: [this.data.idProyecto, Validators.required],
      nombreProyecto: ['', [Validators.required, Validators.maxLength(30)]],
      descripcion: ['', [Validators.required, Validators.maxLength(30)]],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, { validators: [], updateOn: 'blur' }],
      fechaReal: [null, Validators.required],
      porcentajeAvance: [0, [Validators.required]],
      idSolicitante: [this.authService.getUsuarioId(), Validators.required],
      idAprobador: [null],
      idArea: [{
        value: this.authService.getUsuario().idArea === 5 ? null : this.authService.getUsuario().idArea,
        disabled: this.authService.getUsuario().idArea !== 5
      }, Validators.required],
      idEstado: ['', Validators.required],
      idEstadoSolicitud: [3, Validators.required],
      descripcionCambio: ['', [Validators.required, Validators.maxLength(250), Validators.pattern('^[a-zA-Z0-9 ]+$'), Validators.minLength(10)]]
    });
  }


  // Validador de grupo para validar fechaFin
  ngOnInit(): void {
    this.proyectoForm.get('idEstado')?.valueChanges.subscribe((estadoId) => {
      this.updateFechaFinValidation(estadoId)
      //console.log("Actualizacion de estado: ", estadoId)
    })
    this.cargarProyecto(this.data.idProyecto); // Cargar el proyecto por ID
    this.cargarEstados(); // Cargar la lista de estados
    this.getAreas();
  }

  mostrarAlertaFechaFin() {
    window.alert('La fecha de finalización es obligatoria cuando el estado es "Finalizado".');
  }
  mostrarAlerta() {
    window.alert('El formulario es inválido, por favor revisar todos los campos.');
  }


  cargarProyecto(idProyecto: number): void {
    this.showSpinner = true;

    this.proyectoService.getProyectoPorId(idProyecto).subscribe(
        (proyectos: Proyecto[]) => {
            if (proyectos.length > 0) {
                const proyecto = proyectos[0]; // Acceder al primer objeto del arreglo
                //console.log('Datos del proyecto procesado:', proyecto);
                this.nombreArea = proyecto.nombreArea;

                // Usar fechas como cadenas directamente, sin convertir a objetos Date
                this.proyectoForm.patchValue({
                    nombreProyecto: proyecto.nombreProyecto,
                    descripcion: proyecto.descripcion,
                    fechaInicio: proyecto.fechaInicio || null, // Se usa directamente la fecha del backend
                    fechaFin: proyecto.fechaFin || null,       // Se usa directamente la fecha del backend
                    fechaReal: proyecto.fechaReal || null,     // Se usa directamente la fecha del backend
                    idEstado: proyecto.idEstado,
                    porcentajeAvance: proyecto.porcentajeAvance,
                    idArea: proyecto.idArea,
                });
            } else {
                console.error('No se encontró el proyecto con el ID proporcionado.');
            }
            this.showSpinner = false;
        },
        (error) => {
            console.error('Error al cargar proyecto', error);
            this.showSpinner = false;
        }
    );
}

  cargarEstados(): void {
    this.proyectoService.getEstado().subscribe(
      (estados) => {
        this.estados = estados;
      },
      (error) => {
        console.error('Error al cargar estados', error);
      }
    );
  }

  enviarSolicitud(): void {
    if (this.proyectoForm.valid) {
        this.showSpinner = true;

        const solicitud = this.proyectoForm.getRawValue(); // Obtener valores incluso si están deshabilitados

        // Convertir fechas al formato 'yyyy-MM-dd'
        const fechas: Record<string, string | null> = {};
        ['fechaInicio', 'fechaReal', 'fechaFin'].forEach((key) => {
            fechas[key] = solicitud[key]
                ? new Date(solicitud[key]).toISOString().split('T')[0]
                : null;
        });

        // Armar el objeto para enviar al backend
        const solicitudEnviada = {
            ...solicitud,
            nombre: solicitud.nombreProyecto,
            ...fechas,
            descripcionAprobacion: solicitud.descripcionCambio,
        };

        // Eliminar campos innecesarios
        delete solicitudEnviada.nombreProyecto;
        delete solicitudEnviada.descripcionCambio;

        // Detectar cambios para registro (detallesCambios)
        const detallesCambios: Record<string, { anterior: any, nuevo: any }> = {};
        for (const key in this.proyectoOriginal) {
            if (this.proyectoOriginal[key] !== solicitudEnviada[key]) {
                detallesCambios[key] = {
                    anterior: this.proyectoOriginal[key] || null,
                    nuevo: solicitudEnviada[key] || null,
                };
            }
        }

        // Agregar cambios detectados al payload del backend
        const payload = {
            ...solicitudEnviada,
            cambios: detallesCambios,
        };

        console.log(payload);

        if (!this.data.idProyecto) {
            console.error('Error: idProyecto es undefined');
            this.showSpinner = false;
            return;
        }

        // Llamada al servicio para enviar la solicitud
        this.proyectoService.solicitarCambioProyecto(this.data.idProyecto, payload).subscribe(
            (response) => {
                this.showSpinner = false;
                this.dialogRef.close(response);
            },
            (error) => {
                console.error('Error al enviar solicitud', error);
                this.showSpinner = false;
            }
        );
    } else {
        this.mostrarAlerta();
        console.log(this.proyectoForm.value);
    }
}


  onCancel(): void {
    this.dialogRef.close(false);
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
