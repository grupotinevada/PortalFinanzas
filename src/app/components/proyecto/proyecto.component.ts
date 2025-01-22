import { Component, ViewChild} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProyectoService, Proyecto } from '../../services/proyecto.service';
import { MatDialog } from '@angular/material/dialog';
import { AgregarproyectodialogComponent } from '../agregarproyectodialog/agregarproyectodialog.component';
import { EditarproyectodialogComponent } from '../editarproyectodialog/editarproyectodialog.component';
import * as XLSX from 'xlsx';
import { MatTableDataSource } from '@angular/material/table';
import { UserService, Usuario } from '../../services/user.service';
import { FiltroComponent } from '../filtro/filtro.component';



@Component({
  selector: 'app-proyecto',
  templateUrl: './proyecto.component.html',
  styleUrls: ['./proyecto.component.css']
})


export class ProyectoComponent {
  
  showSpinner: boolean = false;
  proyectos: Proyecto[] = [];
  area: string = '';
  rol: number = 0;
  showErrorMessage: boolean = false;
  data: any[] = []; // Variable para almacenar los datos de la tabla Excel
  filtrosAplicados: any = {};
  // Agregar Object como referencia global
  Object = Object;

  dataSource = new MatTableDataSource<Proyecto>(this.proyectos);
  
  displayedColumns: string[] = [
    'nombreProyecto', 'descripcion', 'nombreArea', 'fechaInicio',
    'fechaReal', 'fechaFin', 'porcentajeAvance', 'descripcionEstado',
     'tareas'
  ];

  constructor(
    private proyectoService: ProyectoService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private proyectoStateService: ProyectoService,
    private userService: UserService,
    
  ) {}
//ver esto
ngOnInit(): void {
  this.rol = this.authService.getUsuario().idRol;
  this.asignarArea();
  this.cargarProyectos();
}

asignarArea() {
  const usuario = this.authService.getUsuario(); // Obtén el usuario actual
  if (usuario && usuario.nombreArea) {
    //console.log('Área del usuario:', usuario.nombreArea);
    this.area = usuario.nombreArea;
    
  } else {
    console.error('No se pudo obtener el área del usuario');

  }
}


cargarProyectos(): void {
  this.showSpinner = true;
  const usuario = this.authService.getUsuario(); // Usuario actual
  //console.log('usuario: ', usuario)
  const idUsuario = usuario.id; // Id del usuario actual
  //console.log('id: ', idUsuario)
  const idAreaUsuario = usuario.idArea; // Área del usuario actual
  //console.log('idarea: ', idAreaUsuario)

  if (idUsuario && idAreaUsuario) {
    this.proyectoService.getProyectos().subscribe(
      (proyectos) => {
        // Marcar proyectos como editables si pertenecen al usuario actual o a su área
        this.proyectos = proyectos.map((proyecto) => ({
          ...proyecto,
          editable: proyecto.idUsuario === idUsuario || proyecto.idArea === idAreaUsuario || usuario.idRol === 1,
        }));

        // Ordenar proyectos como antes
        this.proyectos.sort((a, b) => {
          if (a.editable !== b.editable) {
            return a.editable ? -1 : 1; // Editables primero
          }

          const fechaA = a.fechaReal ? new Date(a.fechaReal).getTime() : Number.MAX_SAFE_INTEGER;
          const fechaB = b.fechaReal ? new Date(b.fechaReal).getTime() : Number.MAX_SAFE_INTEGER;

          return fechaA - fechaB;
        });

        this.dataSource.data = this.proyectos; // Actualizar MatTableDataSource
        this.showSpinner = false;
      },
      (error) => {
        console.error('Error al cargar proyectos:', error);
        this.showSpinner = false;
      }
    );
  } else {
    console.error('No se pudo obtener el id del usuario o área del usuario');
  }
}

  // Método para eliminar un proyecto
  eliminarProyecto(idProyecto: number): void {
    const confirmacion = confirm(
      `¿Estás seguro de que deseas eliminar el proyecto con ID ${idProyecto}?`
    );

    if (!confirmacion) {
      return;
    }

    this.proyectoService.deleteProyecto(idProyecto).subscribe({
      next: (response) => {
        alert('Proyecto eliminado con éxito.');
        console.log(response);

        // Actualiza la lista de proyectos (opcional)
        this.proyectos = this.proyectos.filter(
          (proyecto) => proyecto.idProyecto !== idProyecto
        );
      },
      error: (error) => {
        console.error('Error al eliminar el proyecto:', error);
        alert('Hubo un error al intentar eliminar el proyecto.');
      },
    });
  }
  

  // Método para manejar el archivo seleccionado y leer toda la tabla
  validateFile(event: any): void {
    const target: DataTransfer = <DataTransfer>(event.target);

    if (target.files.length !== 1 || !target.files[0].name.endsWith('.xlsx')) {
      this.showErrorMessage = true;
      return;
    }

    this.showErrorMessage = false;
    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const binaryData = e.target.result;
      const workbook = XLSX.read(binaryData, { type: 'binary' });

      // Obtiene la primera hoja (sheet) del archivo
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convierte la hoja de Excel a un arreglo de objetos JSON, excluyendo los encabezados
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Extrae las filas de datos, ignorando las dos primeras filas (encabezados)
      this.data = jsonData.slice(2); // Empieza desde la tercera fila
    };

    reader.readAsBinaryString(file);
  }

  verTareas(idProyecto: string): void {
    this.router.navigate(['/tareas', idProyecto]);
  }

  openEditarProyecto(idProyecto: number, editable: boolean): void {
    if (!editable) {
      console.warn('El usuario no tiene permiso para editar este proyecto.');
      return;
    }
  
    // Obtener el proyecto original desde el servicio
    this.proyectoService.getProyectoPorId(idProyecto).subscribe(
      (proyectoOriginal) => {
        const dialogRef = this.dialog.open(EditarproyectodialogComponent, {
          width: '100%',
          maxWidth: '800px',
          height: 'auto',
          maxHeight: '50vh',
          data: { idProyecto, proyectoOriginal }, // Pasar proyecto original al diálogo
        });
  
        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            // Recargar los datos desde el backend
            this.cargarProyectos();
          }
        });
      },
      (error) => {
        console.error('Error al obtener el proyecto original:', error);
      }
    );
  }
  openNuevoProyectoDialog() {
    const dialogRef = this.dialog.open(AgregarproyectodialogComponent, {
      width: '90%',
      maxWidth: '800px',
      height: 'auto',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    })
    dialogRef.afterClosed().subscribe((nuevoProyecto) => {
      if (nuevoProyecto) {
        this.proyectos.push(nuevoProyecto); // Agregar el nuevo proyecto a la lista
        this.dataSource.data = this.proyectos; // Actualizar el MatTableDataSource
      }
    });;

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  aplicarFiltros(filtros: any): void {
    this.filtrosAplicados = { ...filtros };
  
    this.dataSource.data = this.proyectos.filter(proyecto => {
      const fechaDesdeFiltro = filtros.fechaDesde ? new Date(filtros.fechaDesde + 'T00:00:00') : null;
      const fechaHastaFiltro = filtros.fechaHasta ? new Date(filtros.fechaHasta + 'T23:59:59') : null;
      const fechaCompromiso = proyecto.fechaReal ? new Date(proyecto.fechaReal) : null;
      const fechaFin = proyecto.fechaFin ? new Date(proyecto.fechaFin) : null;
  
      // Debug: Validar fechas en consola
      //console.log(`Proyecto: ${proyecto.nombreProyecto}`);
      //console.log(`Fecha Real: ${fechaCompromiso}`);
      //console.log(`Filtro Desde: ${fechaDesdeFiltro}`);
      //console.log(`Filtro Hasta: ${fechaHastaFiltro}`);
  
      return (
        (!filtros.nombreProyecto || proyecto.nombreProyecto.toLowerCase().includes(filtros.nombreProyecto.toLowerCase())) &&
        (!filtros.descripcionEstado || proyecto.descripcionEstado === filtros.descripcionEstado) &&
        (!filtros.porcentajeMin || proyecto.porcentajeAvance >= filtros.porcentajeMin) &&
        (!filtros.porcentajeMax || proyecto.porcentajeAvance <= filtros.porcentajeMax) &&
        (!fechaDesdeFiltro || (fechaCompromiso && fechaCompromiso >= fechaDesdeFiltro)) &&
        (!fechaHastaFiltro || (fechaCompromiso && fechaCompromiso <= fechaHastaFiltro)) &&
        (!filtros.fechaFin || (fechaFin && fechaFin >= new Date(filtros.fechaFin))) &&
        (!filtros.area || proyecto.nombreArea === filtros.area)
      );
    });
  }


@ViewChild('filtroComponent') filtroComponent!: FiltroComponent;
eliminarFiltro(filtro: string): void {
  // Elimina el filtro específico
  delete this.filtrosAplicados[filtro];

  // Llama al método limpiarFiltros() del componente hijo
  if (this.filtroComponent) {
    this.filtroComponent.limpiarFiltros();
  }

  // Reaplica los filtros con los valores actualizados
  this.aplicarFiltros(this.filtrosAplicados);
}
}