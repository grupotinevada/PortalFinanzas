import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { ProyectoService } from '../../services/proyecto.service';

@Component({
  selector: 'app-historial-cambios-dialog',
  templateUrl: './historial-cambios-dialog.component.html',
  styleUrls: ['./historial-cambios-dialog.component.css'],
  providers: [DatePipe] // Necesario para usar DatePipe
})
export class HistorialCambiosDialogComponent implements OnInit {
  estadosMap: { [key: number]: string } = {};
  areasMap: { [key: number]: string } = {};
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<HistorialCambiosDialogComponent>,
    private datePipe: DatePipe, // Inyección de DatePipe para formatear fechas
    private proyectoService: ProyectoService
  ) {}
ngOnInit(): void {
  this.cargarEstados();
  this.cargarAreas();
}
/**
 * Formatea los detalles de un cambio para mostrarlos en el historial.
 * @param cambio Información del cambio, incluyendo `detalles` y `idUsuario`.
 * @returns Cadena con los detalles formateados.
 */
formatearDetallesCambio(cambio: any): string {
  const detalles = [];

  // Iterar sobre las claves del objeto `detalles`
  for (const key in cambio.detalles) {
    const detalle = cambio.detalles[key];

    // Validar si 'nuevo' y 'anterior' son diferentes
    const anteriorFormateado = this.formatearFechaSiAplica(detalle.anterior) && this.formatearValor(key, detalle.anterior);
    const nuevoFormateado = this.formatearFechaSiAplica(detalle.nuevo) && this.formatearValor(key, detalle.nuevo);
    

    if (anteriorFormateado !== nuevoFormateado) {
      detalles.push(
        `${this.formatearClave(key)}: ${anteriorFormateado || 'N/A'} → ${nuevoFormateado || 'N/A'}`
      );
    }
  }

  // Unir los cambios con etiquetas de salto de línea
  return detalles.length > 0 ? detalles.join('<br>') : 'Sin cambios relevantes';
}


cargarEstados(): void {
  this.proyectoService.getEstado().subscribe(
    (estados: any[]) => {
      this.estadosMap = estados.reduce((map, estado) => {
        map[estado.idEstado] = estado.descripcion;
        return map;
      }, {});
    },
    (error) => {
      console.error('Error al cargar los estados:', error);
    }
  );
}

cargarAreas(): void {
  this.proyectoService.getArea().subscribe(
    (area: any[]) => {
      this.areasMap = area.reduce((map, area) => {
        map[area.idArea] = area.descripcion;
        return map;
      }, {});
    },
    (error) => {
      console.error('Error al cargar los estados:', error);
    }
  );
}


formatearEstado(idEstado: number): string {
  return this.estadosMap[idEstado] || `Estado desconocido (${idEstado})`;
}

formatearArea(idArea: number): string {
  return this.areasMap[idArea] || `Estado desconocido (${idArea})`;
}

private formatearValor(key: string, valor: any): string {
  if (key === 'idEstado' && typeof valor === 'number') {
    return this.formatearEstado(valor);
  }
  if (key === 'idArea' && typeof valor === 'number') {
    return this.formatearArea(valor);
  }
  return this.formatearFechaSiAplica(valor);
}

  /**
   * Método opcional para formatear las claves (e.g., idArea -> ID Área).
   * @param clave Clave a formatear.
   * @returns Clave formateada para mostrar al usuario.
   */
  formatearClave(clave: string): string {
    const formatoClaves: { [key: string]: string } = {
      idArea: 'ID Área',
      nombre: 'Nombre',
      fechaFin: 'Fecha de Finalización',
      idEstado: 'Estado',
      fechaReal: 'Fecha compromiso',
      descripcion: 'Descripción',
      fechaInicio: 'Fecha de Inicio',
      porcentajeAvance: 'Porcentaje de Avance',
    };

    return formatoClaves[clave] || clave;
  }

/**
 * Formatea una fecha si el valor es reconocible como fecha.
 * @param valor Valor a formatear.
 * @returns Fecha formateada en `dd-MM-yyyy` o el valor original.
 */
private formatearFechaSiAplica(valor: any): string {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    // Si el valor ya está en formato YYYY-MM-DD, no se convierte a Date
    return this.datePipe.transform(valor, 'dd-MM-yyyy') || valor;
  } else if (valor) {
    // Intentar convertir a Date solo si no es una cadena válida
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) {
      return this.datePipe.transform(fecha, 'dd-MM-yyyy') || valor;
    }
  }
  return valor;
}

  /**
   * Cierra el diálogo.
   */
  cerrarDialogo(): void {
    this.dialogRef.close();
  }
}
