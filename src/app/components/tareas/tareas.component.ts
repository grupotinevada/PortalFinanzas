import { AfterViewInit, Component, OnInit, QueryList, ViewChild, ViewChildren, ChangeDetectorRef, NgZone } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { TareaService } from '../../services/tarea.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { Observable, catchError, delay, finalize, forkJoin, of, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service'; // Servicio de autenticación
import { MatDialog } from '@angular/material/dialog';
import { HistorialCambiosDialogComponent } from '../historial-cambios-dialog/historial-cambios-dialog.component';
import { ArchivoProyecto } from '../../model/archivo.interface';
@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css'
})
export class TareasComponent implements OnInit, AfterViewInit {

  archivosProyecto: any[] = [];
  loading: boolean = false;
  cambiosRevisados: boolean = true;
  tieneCambios: boolean = false;
  cambios: any[] = [];
  showSpinner: boolean = false;
  idProyecto!: number | null;
  proyecto: any = null;
  nombreProyecto: string = '';
  showErrorMessage: boolean = false;
  cellA1Value: any = null;
  usuario: any | null;
  displayedColumns: string[] = ['idProyecto', 'nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'porcentajeAvance'];
  tareas = new MatTableDataSource<any>([]);
  archivoSeleccionado: File | null = null;
  archivosSeleccionados: File[] = []; // Array para almacenar los archivos
  uploadQueue: File[] = [];
  subiendoArchivo = false; // Flag para controlar la carga secuencial
  showSidebar: boolean = false;
  maxFileSize: number = 25 * 1024 * 1024; // 25MB en bytes
  allowedFileTypes: string[] = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];

  @ViewChild(MatSort) sort!: MatSort;


  displayedColumnsTareas: string[] = [
    'nombre',
    'descripcion',
    'porcentajeAvance',
    'descripcionEstado',
    'fechaInicio',
    'fechaCompromiso',
    'fechaFin',
  ];



  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private proyectoService: ProyectoService,
    private tareaService: TareaService,
    private http: HttpClient,
    private zone: NgZone,
    private router: Router,
    private cdr: ChangeDetectorRef, // Inyección de ChangeDetectorRef
    public dialog: MatDialog
  ) { }


  ngOnInit(): void {

    this.inicializarComponente();
    this.cargarArchivosProyecto();   

  }

  ngAfterViewInit(): void {
      // Cargar estado inicial de cambios revisados.
    const revisado = localStorage.getItem('cambiosRevisados_' + this.idProyecto);
    this.cambiosRevisados = revisado === 'true';

    this.configurarOrdenacion();
  }


  //VISTA INICIAL DE TAREAS, solo carga de tareas




  private inicializarComponente(): void {

    this.cargarIdProyecto();
    this.cargarUsuario();
    this.cargarDatosIniciales();
    this.obtenerHistorialCambios();

  }
  // Cargar el ID del proyecto desde la ruta
  private cargarIdProyecto(): void {
    this.idProyecto = Number(this.route.snapshot.paramMap.get('idProyecto')) || null;
  }

  // Cargar el usuario autenticado
  private cargarUsuario(): void {
    this.usuario = this.authService.getUsuario(); 
  }


  // Cargar datos iniciales (proyecto y tareas)
  private cargarDatosIniciales(): void {
    this.showSpinner = true;
    if (this.idProyecto) {
      // Cargar proyecto
      this.proyectoService.getProyectoPorId(this.idProyecto).subscribe({
        next: (proyecto) => {
          this.proyecto = proyecto;
          this.showSpinner = false;
        },
        error: (error) => {
          console.error('Error al cargar el proyecto:', error);
          this.showSpinner = false;
        },
      });

      // Cargar tareas
      this.tareaService.getTareasPorId(this.idProyecto).subscribe({
        next: (tareas) => {
          this.tareas.data = tareas;
          this.showSpinner = false;
          // Configurar el ordenamiento
          this.configurarOrdenacion();
        },
        error: (error) => {
          console.error('Error al cargar las tareas:', error);
          this.showSpinner = false;
        },
      });
    }
  }

   toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    
    if (file) {
      if (file.size > this.maxFileSize) {
        alert('El archivo excede el tamaño máximo permitido de 25MB');
        return;
      }
      
      if (!this.allowedFileTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Por favor, sube documentos en formato PDF, Word, Excel o PowerPoint.');
        return;
      }
      
      this.archivoSeleccionado = file;
    }
  }

  onFilesSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
  
    if (element.files) {
      for (let i = 0; i < element.files.length; i++) {
        const file = element.files[i];
  
        if (file.size > this.maxFileSize) {
          alert(`El archivo "${file.name}" excede el tamaño máximo permitido de 25MB`);
          continue;
        }
  
        if (!this.allowedFileTypes.includes(file.type)) {
          alert(`Tipo de archivo no permitido: ${file.name}`);
          continue;
        }
  
        this.archivosSeleccionados.push(file);
        this.uploadQueue.push(file); // Solo agregarlo a la lista, no subirlo aún
      }
    }
  
    //alert("Archivos seleccionados correctamente. Presiona 'Subir archivos' para comenzar la carga.");
  }


  procesarCola(): Promise<void> {
    return new Promise((resolve) => {
      if (this.subiendoArchivo || this.uploadQueue.length === 0) {
        return resolve();
      }
  
      this.subiendoArchivo = true;
      const archivo = this.uploadQueue.shift()!; // Extrae el primer archivo de la cola
  
      this.verificarYSubirArchivo(archivo).finally(() => {
        this.subiendoArchivo = false;
        if (this.uploadQueue.length > 0) {
          this.procesarCola().then(resolve); // Llamada recursiva hasta terminar
        } else {
          resolve(); // Finaliza cuando no quedan archivos
        }
      });
    });
  }


  async verificarYSubirArchivo(archivo: File): Promise<void> {
    if (!this.idProyecto) {
      console.error("No se puede verificar el archivo porque idProyecto es null.");
      alert("Error: No se puede verificar el archivo porque no hay un proyecto seleccionado.");
      return;
    }
  
    return new Promise((resolve) => {
      this.tareaService.verificarArchivo(archivo.name, this.idProyecto!).subscribe({
        next: (respuesta) => {
          if (respuesta.existe) {
            // Si el archivo ya existe, solo mostrar alerta y finalizar
            alert(`El archivo "${archivo.name}" ya existe en el sistema. Si deseas reemplazarlo, elimínalo manualmente.`);
            return resolve(); // No sube ni elimina el archivo, solo finaliza
          } 
          
          // Si el archivo no existe, proceder con la subida
          this.subirNuevoArchivo(archivo).finally(resolve);
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error al verificar el archivo "${archivo.name}":`, error);
          alert(`Error al verificar el archivo "${archivo.name}" en el servidor.`);
          resolve();
        },
      });
    });
  }
  
  
  async subirNuevoArchivo(archivo: File): Promise<void> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append("nombre", archivo.name);
      if (this.idProyecto) {
        formData.append('idproyecto', this.idProyecto.toString());
      }
      formData.append('idarea', this.usuario.idArea.toString());
      formData.append('idusuario', this.usuario.id.toString());
  
      this.loading = true;
      this.tareaService.subirArchivo(formData).subscribe({
        next: () => {
          console.log(`Archivo "${archivo.name}" subido correctamente.`);
          this.cargarArchivosProyecto();
          this.loading = false;
          resolve();
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error al subir el archivo "${archivo.name}":`, error);
          alert(`Error al subir el archivo "${archivo.name}".`);
          this.loading = false;
          resolve();
        },
      });
    });
  }

  eliminarArchivo(index: number): void {
    this.archivosSeleccionados.splice(index, 1); // Elimina un archivo de la lista
  }

  subirArchivos(): void {
    if (this.uploadQueue.length === 0) {
      alert('No hay archivos para subir.');
      return;
    }
  
    this.procesarCola().then(() => {
      // Limpiar archivos después de subirlos
      this.archivosSeleccionados = [];
      this.uploadQueue = [];
  
      // Limpiar el input file para permitir nuevas selecciones
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = ''; // Resetea la selección del input
      }
  
      //alert('Todos los archivos han sido subidos correctamente.');
    });
  }
  
  cargarArchivosProyecto(): void {
    if (this.idProyecto) {
      this.loading = true;
      this.tareaService.getArchivosPorProyecto(this.idProyecto).subscribe({
        next: (archivos) => {
          this.archivosProyecto = archivos;
          this.loading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al cargar archivos:', error);
          this.loading = false;
        }
      });
    }
  }

  /*subirArchivo(archivo: File): void {
    if (!archivo || !this.idProyecto || !this.usuario) return;
  
    const nombreArchivo = archivo.name;
    const idproyectoactual = this.idProyecto;
  
    // Verificar si el archivo ya existe antes de enviarlo
    this.tareaService.verificarArchivo(nombreArchivo, this.idProyecto).subscribe({
      next: (respuesta) => {
        if (respuesta.existe) {
          const confirmar = confirm(`El archivo "${nombreArchivo}" ya existe. ¿Deseas reemplazarlo 123?`);
          if (!confirmar) return;
  
          if (respuesta.idArchivo !== null) {
            const idArchivo = respuesta.idArchivo as number;
            this.tareaService.eliminarArchivo(idArchivo, idproyectoactual).subscribe({
              next: () => {
                console.log(`Archivo "${nombreArchivo}" eliminado correctamente, procediendo con la subida.`);
                this.subirNuevoArchivo(archivo);
              },
              error: (error: HttpErrorResponse) => {
                console.error(`Error al eliminar el archivo "${nombreArchivo}":`, error);
                alert(`Error al eliminar el archivo existente "${nombreArchivo}".`);
              },
            });
          } else {
            alert(`No se encontró el archivo "${nombreArchivo}" para eliminar.`);
          }
        } else {
          this.subirNuevoArchivo(archivo);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error(`Error al verificar el archivo "${nombreArchivo}":`, error);
        alert(`Error al verificar el archivo "${nombreArchivo}" en el servidor.`);
      },
    });
  }*/
  
    
  
  /*subirNuevoArchivo(archivo: File): void {
    const formData = new FormData();
    if (this.archivoSeleccionado) {
      formData.append('archivo', this.archivoSeleccionado);
      formData.append("nombre", this.archivoSeleccionado.name);
    }
    if (this.idProyecto) {
      formData.append('idproyecto', this.idProyecto.toString());
    }
    formData.append('idarea', this.usuario.idArea.toString());
    formData.append('idusuario', this.usuario.id.toString());
  
    this.loading = true;
    this.tareaService.subirArchivo(formData).subscribe({
      next: () => {
        this.cargarArchivosProyecto();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error(`Error al subir el archivo "${archivo.name}":`, error);
        this.loading = false;
        alert(`Error al subir el archivo "${archivo.name}".`);
      },
    });
  }*/
  
  

  confirmarEliminarArchivo(idArchivo: number, idProyecto: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      this.loading = true;
      this.tareaService.eliminarArchivo(idArchivo, idProyecto).subscribe({
        next: () => {
          this.cargarArchivosProyecto(); // Recargar los archivos después de la eliminación
          this.loading = false;
          alert('Archivo eliminado exitosamente');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al eliminar archivo:', error);
          this.loading = false;
          alert('Error al eliminar el archivo');
        }
      });
    }
  }


    // Truncar nombre del archivo
    truncarNombreArchivo(nombre: string): string {
      if (nombre.length > 15) {
        return nombre.substring(0, 15) + '...';
      }
      return nombre;
    }

// Función para descargar el archivo
descargarArchivo(filename: string): void {
  this.loading = true;
  if (this.idProyecto) {
    // Pasamos tanto el filename como el idProyecto al servicio
    this.tareaService.descargarArchivo(filename, this.idProyecto).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url); // Limpia la URL temporal
      this.loading = false;
    }, error => {
      console.error('Error al descargar el archivo:', error);
      alert('Error al descargar el archivo');
      this.loading = false;
    });
  } else {
    console.error('ID del proyecto no encontrado');
    alert('ID del proyecto no disponible');
    this.loading = false
  }
}

  // Obtener historial de cambios del proyecto
obtenerHistorialCambios() {
  this.proyectoService.getHistorialCambios(this.idProyecto!).subscribe({
    next: (logs) => {
      //console.log('Historial de cambios obtenido:', logs);
      this.tieneCambios = logs.length > 0;
      this.cambios = logs;

      // Si hay nuevos cambios, forzamos que no estén revisados.
      if (logs.length > 0) {
        this.cambiosRevisados = false;
        localStorage.setItem('cambiosRevisados_' + this.idProyecto, 'false');
      }
    },
    error: (error) => {
      console.error('Error al obtener historial de cambios:', error);
    }
  });
}
  
  // Abrir el diálogo con el historial de cambios
  abrirHistorialCambios() {
    const dialogRef = this.dialog.open(HistorialCambiosDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      data: { cambios: this.cambios }
    });
  
    dialogRef.afterClosed().subscribe(() => {
      //console.log('El historial de cambios se ha cerrado');
      this.cambiosRevisados = true; // Marca los cambios como revisados.
      localStorage.setItem('cambiosRevisados_' + this.idProyecto, 'true'); // Persistir estado.
    });
  }


  // Configurar la ordenación de la tabla
  private configurarOrdenacion(): void {
    if (this.tareas.data && this.tareas.data.length > 0) {
      // Si MatSort está inicializado y hay datos, configura la ordenación
      if (this.sort) {
        this.tareas.sort = this.sort;
        this.cdr.detectChanges(); // Actualizar vista
      } else {
        // Reintenta configurar MatSort si aún no está inicializado
        setTimeout(() => this.configurarOrdenacion(), 100);
        console.warn('MatSort no está inicializado. Reintentando...');
      }
    } else {
      console.info('No hay datos disponibles para ordenar.');
    }
  }




  // COMPONENTE PARA SUBIR TAREAS

  validateFile(event: any) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (file && file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      this.showSpinner = true; // Mostrar spinner al seleccionar el archivo
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        // Verificar si hay datos válidos más allá de las primeras filas
        const dataRows = jsonData.slice(2); // Ignorar las dos primeras filas
        const hasValidData = dataRows.length > 0 && dataRows.some((row: any[]) => row.some((cell: any) => cell));

        if (hasValidData) {
          // Si los datos son válidos, procesar directamente
          console.log('Datos válidos detectados. Procesando archivo...');
          this.processFile(file);
        } else {
          // Si los datos son nulos o vacíos, preguntar al usuario
          const confirmContinue = confirm(
            'El archivo está vacío o no contiene datos válidos. ¿Deseas continuar con el procesamiento?'
          );
          if (confirmContinue) {
            console.log('El usuario decidió continuar con el procesamiento.');
            this.processFile(file); // Procesa el archivo incluso si es nulo o vacío
          } else {
            console.log('El usuario canceló el procesamiento.');
            this.showSpinner = false; // Mostrar spinner al seleccionar el archivo
          }
        }

        // Restablece el input para permitir una nueva subida
        input.value = '';
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Por favor selecciona un archivo válido con formato .xlsx.');

      // Restablece el input en caso de error
      input.value = '';
    }
  }

  processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const tareasData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      //console.log('Datos extraídos del archivo Excel:', tareasData);

      // Mapear y cargar tareas
      this.mapExcelDataToTasks(tareasData);
    };
    reader.readAsArrayBuffer(file);
  }


  mapExcelDataToTasks(tareasData: any[]) {
    this.showSpinner = true; // Mostrar spinner

    const estadoMap = {
      "En Progreso": 1,
      Pendiente: 3,
      Finalizado: 4,
    };

    const filteredData = tareasData.slice(2).filter((row: any) => {
      return row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
    });

    const mappedData = filteredData.map((row: any) => {
      const fechaInicio = row[1] && !isNaN(Date.parse(row[1])) ? new Date(row[1]).toISOString().split('T')[0] : null;
      const fechaCompromiso = row[2] && !isNaN(Date.parse(row[2])) ? new Date(row[2]).toISOString().split('T')[0] : null;
      const fechaFin = row[3] && !isNaN(Date.parse(row[3])) ? new Date(row[3]).toISOString().split('T')[0] : null;

      const descripcionEstado = row[4];
      const idEstado = descripcionEstado in estadoMap ? estadoMap[descripcionEstado as keyof typeof estadoMap] : null;

      return {
        nombre: row[0],
        fechaInicio,
        fechaCompromiso,
        fechaFin,
        idEstado,
        porcentajeAvance: row[5] || 0,
        descripcion: row[6] || ''
      };
    }).filter((tarea: any) => tarea !== null);

    this.tareas.data = mappedData;

    if (this.idProyecto) {
      this.eliminarYcargarTareas(this.idProyecto);
    }
  }



  convertirFecha(fecha: any): string | null {
    if (!fecha) return null;

    if (typeof fecha === 'number') {
      // Convertir el número de Excel a una fecha válida
      const fechaBase = new Date(1899, 11, 30); // Fecha base de Excel
      fechaBase.setDate(fechaBase.getDate() + fecha);
      return `${fechaBase.getDate().toString().padStart(2, '0')}/${(fechaBase.getMonth() + 1).toString().padStart(2, '0')
        }/${fechaBase.getFullYear()}`;
    }

    // Procesar cadenas de texto
    const partes = fecha.includes('-') ? fecha.split('-') : fecha.split('/');
    if (partes.length !== 3) {
      console.warn('Formato de fecha no válido:', fecha);
      return null;
    }

    const [dia, mes, anio] = partes.map((parte: string) => parseInt(parte, 10));
    const date = new Date(anio, mes - 1, dia); // Crear la fecha
    if (isNaN(date.getTime())) {
      console.warn('Fecha no válida:', fecha);
      return null;
    }

    // Retornar formato "dd/MM/yyyy"
    return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${anio}`;
  }


  // Función para verificar, eliminar y cargar tareas
  eliminarYcargarTareas(idProyecto: number): void {
    this.tareaService.verificarTareasExistentes(idProyecto).pipe(
      switchMap((hayTareas) => {
        if (hayTareas) {
          console.log('Hay tareas existentes, procediendo a eliminarlas...');
          return this.tareaService.deleteTareasPorProyecto(idProyecto);
        }
        console.log('No hay tareas existentes.');
        return of(null); // Retornar observable vacío para continuar
      }),
      switchMap(() => {
        if (this.tareas.data.length === 0) {
          console.log('No hay tareas en el Excel. Actualizando porcentaje a 0...');
          return this.tareaService.updatePorcentaje(idProyecto, 0); // Usamos el nuevo método
        }
        console.log('Cargando nuevas tareas...');
        return this.cargarTareas(); // Proceso de carga de tareas
      })
    ).subscribe({
      next: () => {
        console.log('Tareas procesadas correctamente.');
        this.actualizarTareasYProgreso(); // Refrescar datos en el componente
        this.cdr.detectChanges(); // Forzar la actualización en el HTML
        this.inicializarComponente(); // Reinicializar componente
      },
      error: (err) => {
        console.error('Error en el proceso de eliminación y carga:', err);
      },
    });
  }




  actualizarTareasYProgreso(): void {
    this.showSpinner = true; // Mostrar el spinner mientras se cargan los datos

    this.tareaService.getTareasPorId(this.idProyecto!).subscribe({
      next: (tareas) => {
        this.tareas.data = tareas || [];
        //console.log('Tareas obtenidas (actualizadas):', this.tareas.data);

        // Calcular y actualizar el porcentaje de avance total
        this.proyecto.porcentajeAvance = this.calcularPorcentajeAvanceTotal();

        // Forzar actualización de cambios
        this.cdr.detectChanges();
        // También puedes solicitar el porcentaje actualizado desde el backend
        this.proyectoService.getProyectoPorId(this.idProyecto!).subscribe({
          next: (proyecto) => {
            this.proyecto.porcentajeAvance = Math.round(proyecto.porcentajeAvance); // Redondear a entero
            //console.log('Porcentaje de avance actualizado desde el backend:', this.proyecto.porcentajeAvance);
          },
          error: (err) => {
            console.error('Error al obtener el proyecto:', err);
          },
        });

        this.showSpinner = false; // Ocultar el spinner
      },
      error: (err) => {
        console.error('Error al actualizar las tareas:', err);
        this.showSpinner = false; // Ocultar el spinner en caso de error
      },
    });
  }



  calcularPorcentajeAvanceTotal(): number {
    if (!this.tareas || this.tareas.data.length === 0) {
      return 0; // Si no hay tareas, el progreso es 0%
    }

    // Convertir los porcentajes a números y calcular el promedio
    const sumaAvances = this.tareas.data.reduce((total, tarea) => {
      return total + parseFloat(tarea.porcentajeAvance || '0'); // Convertir a número
    }, 0);

    return sumaAvances / this.tareas.data.length;
  }

  actualizarPorcentajeAvance(idProyecto: number, porcentajeAvance: number): void {
    this.tareaService.updatePorcentaje(idProyecto, porcentajeAvance).subscribe({
      next: () => {
        //console.log(`Porcentaje de avance actualizado a ${porcentajeAvance}`);
        this.proyecto.porcentajeAvance = porcentajeAvance;
        this.cdr.detectChanges(); // Forzar la actualización en el HTML
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al actualizar el porcentaje de avance:', error);
      }
    });
  }

  eliminarYActualizarPorcentaje(idProyecto: number): void {
    this.tareaService.deleteTareasPorProyecto(idProyecto).pipe(
      switchMap(() => {
        console.log('Tareas eliminadas. Actualizando porcentaje a 0...');
        return this.tareaService.updatePorcentaje(idProyecto, 0);
      })
    ).subscribe({
      next: () => {
        console.log('Porcentaje actualizado a 0.');
        this.proyecto.porcentajeAvance = 0;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al eliminar tareas o actualizar el porcentaje:', error);
      }
    });
  }



  // Función para cargar nuevas tareas
  cargarTareas(): Observable<any> {
    const tareasArray = this.tareas.data; // Convertir MatTableDataSource a arreglo
    //console.log('Datos de tareas a enviar:', tareasArray);

    if (tareasArray.length === 0) {
      console.log('No hay tareas para enviar. Actualizando el porcentaje de avance a 0...');
      return this.tareaService.updatePorcentaje(this.idProyecto!, 0).pipe(
        tap(() => {
          console.log('Porcentaje de avance actualizado a 0.');
          this.proyecto.porcentajeAvance = 0; // Actualización en el frontend
          this.cdr.detectChanges(); // Forzar actualización en la vista
        }),
        finalize(() => this.inicializarComponente()) // Reinicializar componente
      );
    }

    const requests = tareasArray.map((tarea) => {
      //console.log('Tarea a enviar:', tarea);
      return this.tareaService.createTarea(this.idProyecto!, tarea).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error al agregar la tarea:', error);
          return throwError(() => error);
        })
      );
    });

    return forkJoin(requests).pipe(
      switchMap(() => {
        console.log('Todas las tareas fueron enviadas. Solicitando porcentaje actualizado...');
        return this.proyectoService.getProyectoPorId(this.idProyecto!);
      }),
      tap((proyecto) => {
        const porcentajeNumerico = parseFloat(proyecto.porcentajeAvance);
        this.proyecto.porcentajeAvance = isNaN(porcentajeNumerico) ? 0 : Math.round(porcentajeNumerico);
        //console.log('Porcentaje de avance actualizado desde el backend:', this.proyecto.porcentajeAvance);
      }),
      finalize(() => this.inicializarComponente()) // Reinicializar componente
    );
  }



  // BOTON BORRAR TAREAS

  eliminarTareas(idProyecto: number): Observable<void> {
    return this.tareaService.deleteTareasPorProyecto(idProyecto).pipe(
      tap(() => {
        //console.log(`Intentando eliminar tareas del proyecto con id ${idProyecto}`);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.warn(`No se encontraron tareas para el proyecto con id ${idProyecto}.`);
          return of(); // Emitir un observable vacío para continuar el flujo
        }
        console.error('Error al eliminar las tareas:', error);
        console.log('Detalles del error:');
        console.log('Status:', error.status);
        console.log('Status Text:', error.statusText);
        console.log('URL:', error.url);
        console.log('Message:', error.message);
        console.log('Error Object:', error.error);
        return throwError(() => error);
      })
    );
  }










  //COMPONENTE PARA DESCARGA DE ACHIVOS, LISTA



  async descargarConArchivoDinamico(): Promise<void> {

    const nombreGerencia = this.usuario.nombreArea || 'SinArea';
    const nombreArchivo = `Planilla Tareas ${nombreGerencia}.xlsx`;

    this.showSpinner = true; // Mostrar spinner
    console.time('Descargar plantilla (Archivo dinámico)');

    try {
      console.time('Crear nuevo Workbook');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tareas');
      console.timeEnd('Crear nuevo Workbook');

      console.time('Configurar hoja');
      // Configurar columnas con mayor ancho
      worksheet.columns = [
        { header: 'Tarea', key: 'tarea', width: 40 },
        { header: 'Fecha Inicio (yyyy-mm-dd)', key: 'fechaInicio', width: 40 },
        { header: 'Fecha Compromiso (yyyy-mm-dd)', key: 'fechaCompromiso', width: 40 },
        { header: 'Fecha Fin (yyyy-mm-dd)', key: 'fechaFin', width: 40 },
        { header: 'Estado', key: 'estado', width: 20 },
        { header: '% de avance', key: 'avance', width: 15 },
        { header: 'Descripción', key: 'descripcion', width: 50 },
      ];

      // Agregar título en la fila 1 unida de A a G
      worksheet.mergeCells('A1:G1');
      const tituloCelda = worksheet.getCell('A1');
      tituloCelda.value = 'Plantilla para carga de tareas';
      tituloCelda.font = { bold: true, size: 16 };
      tituloCelda.alignment = { vertical: 'middle', horizontal: 'center' };
      tituloCelda.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D9D9D9' }, // Color gris claro
      };

      // Mover los encabezados a la fila 2
      worksheet.getRow(2).values = [
        'Tarea',
        'Fecha Inicio (yyyy-mm-dd)',
        'Fecha Compromiso (yyyy-mm-dd)',
        'Fecha Fin (yyyy-mm-dd)',
        'Estado',
        '% de avance',
        'Descripción',
      ];

      // Aplicar estilo a los encabezados
      worksheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '808080' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      // Configuración de la lista desplegable para la columna "Estado"
      const estadoColumn = worksheet.getColumn(5);

      // Aplicar la validación a todas las celdas, incluyendo las vacías
      estadoColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 15) { // Aplica desde la fila 2 (si la fila 1 es el encabezado)
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Pendiente,En Progreso,Finalizado"'], // Valores como un único string en un array
            showErrorMessage: true,
            errorTitle: 'Valor no válido',
            error: 'Por favor selecciona un valor de la lista.',
          };
        }
      });
      // Agregar validación para "% de avance"
      worksheet.getColumn(6).eachCell((cell, row) => {
        if (row > 2) {
          cell.dataValidation = {
            type: 'whole',
            operator: 'between',
            formulae: ['0', '100'],
            showErrorMessage: true,
            errorTitle: 'Valor inválido',
            error: 'Ingrese un valor entre 0 y 100',
          };
        }
      });
      console.timeEnd('Configurar hoja');

      console.time('Insertar filas en archivo dinámico');
      // Insertar datos (si existen)
      if (this.tareas.data && this.tareas.data.length >= 0) {
        const filas = this.tareas.data.map((tarea: any) => this.formatearFilaTarea(tarea));
        worksheet.addRows(filas);

        // Convertir columnas de fecha (B, C, D) a texto
        ['fechaInicio', 'fechaCompromiso', 'fechaFin'].forEach((colKey, colIndex) => {
          const column = worksheet.getColumn(colIndex + 2);
          column.eachCell((cell, row) => {
            if (row > 2) { // Evitar encabezados
              cell.value = this.truncarFecha(cell.value);
              cell.numFmt = '@'; // Formato texto
            }
          });
        });

        // Generar 1000 filas con formato predefinido
        for (let i = 0; i < 1000; i++) {
          worksheet.addRow({
            tarea: '',
            fechaInicio: '',
            fechaCompromiso: '',
            fechaFin: '',
            estado: '',
            avance: '',
            descripcion: '',
          });
        }

        const estadoColumn = worksheet.getColumn('E');

        // Aplicar la validación a todas las celdas, incluyendo las vacías
        estadoColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber > 2) { // Aplica desde la fila 2 (si la fila 1 es el encabezado)
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"Pendiente,En Progreso,Finalizado"'], // Valores como un único string en un array
              showErrorMessage: true,
              errorTitle: 'Valor no válido',
              error: 'Por favor selecciona un valor de la lista.',
            };
          }
        });

        // Configurar las columnas como texto para B, C y D, incluyendo celdas vacías
        ['B', 'C', 'D'].forEach((col) => {
          const column = worksheet.getColumn(col);
          column.eachCell({ includeEmpty: true }, (cell, row) => {
            if (row > 2) {
              cell.value = cell.value ? String(cell.value) : ''; // Convertir valores a texto explícito
              cell.numFmt = '@'; // Configuración explícita de formato texto
            }
          });
        });

        // Configurar la columna F (% de avance) para valores enteros
        worksheet.getColumn(6).eachCell((cell, row) => {
          if (row > 2) {
            // Convertir valor a entero si es un número
            if (typeof cell.value === 'number') {
              cell.value = Math.trunc(cell.value); // Truncar a entero
            } else if (cell.value) {
              cell.value = parseInt(cell.value as string, 10) || 0; // Convertir texto a entero
            }
          }
        });


      }
      console.timeEnd('Insertar filas en archivo dinámico');

      // Aplicar bordes a las celdas con datos
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 2) { // Evitar los encabezados
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        }
      });

      console.time('Descargar archivo');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, nombreArchivo);
      console.timeEnd('Descargar archivo');
    } catch (error) {
      console.error('Error al generar archivo dinámico:', error);
    } finally {
      this.showSpinner = false;
      console.timeEnd('Descargar plantilla (Archivo dinámico)');
    }
  }

  // Método auxiliar para formatear filas
  private formatearFilaTarea(tarea: any): any[] {
    return [
      tarea.nombre || '',
      tarea.fechaInicio || '',
      tarea.fechaCompromiso || '',
      tarea.fechaFin || '',
      tarea.descripcionEstado || '',
      tarea.porcentajeAvance || 0, // Valor predeterminado si no existe
      tarea.descripcion || '',
    ];
  }

  // Método auxiliar para truncar fecha al formato "yyyy-mm-dd"
  private truncarFecha(fecha: any): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return isNaN(date.getTime()) ? fecha : date.toISOString().split('T')[0];
  }
  // Función para convertir fecha a texto explícito
  formatDateToText(date: any): string {
    if (!date) return ''; // Manejo de valores nulos o vacíos
    const fecha = new Date(date);
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Mes en formato "MM"
    const day = fecha.getDate().toString().padStart(2, '0'); // Día en formato "DD"
    return `${year}-${month}-${day}`;
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


}