import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ProyectoService } from '../../services/proyecto.service';

@Component({
  selector: 'app-filtro',
  templateUrl: './filtro.component.html',
  styleUrl: './filtro.component.css'
})
export class FiltroComponent implements OnInit{
  filtroForm: FormGroup;

  // Evento para enviar los filtros seleccionados al componente padre
  @Output() aplicarFiltros = new EventEmitter<any>();
  estados: string[] = [];
  area: string[] = [];
  constructor(private fb: FormBuilder, private proyectoService: ProyectoService) {
    this.filtroForm = this.fb.group({
      nombreProyecto: [''],
      descripcionEstado: [''],
      porcentajeMin: [0],
      porcentajeMax: [],
      fechaDesde: [''],  // Nueva fecha de inicio
      fechaHasta: [''],  // Nueva fecha límite
      fechaFin:[''],
      area: ['']
    });
  }
ngOnInit(): void {
  this.cargarEstados();
  this.cargarAreas();
}

cargarEstados() {
  this.proyectoService.getEstado().subscribe(estados => {
    this.estados = estados.map(estado => estado.descripcion);
  });
}

cargarAreas() {
  this.proyectoService.getArea().subscribe(area => {
    this.area = area.map(area => area.nombre); 
    this.area = area.filter(area => area.nombre !== 'Administración').map(area => area.nombre);
  });
}


// Método para emitir los filtros seleccionados
filtrar(): void {
  this.aplicarFiltros.emit(this.filtroForm.value);
}

// Método para resetear los filtros
limpiarFiltros(): void {
  this.filtroForm = this.fb.group({
    nombreProyecto: [''],
    descripcionEstado: [''],
    porcentajeMin: [0],
    porcentajeMax: [0],
    fechaDesde: [''],  // Nueva fecha de inicio
    fechaHasta: [''],  // Nueva fecha límite
    fechaFin:[''],
    area: ['']
  });
  this.aplicarFiltros.emit(this.filtroForm.value);
}
}