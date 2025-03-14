import { Component, OnInit } from '@angular/core';
import { TareaService, TareaResumen } from '../../services/tarea.service';

import { addWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO, isMonday } from 'date-fns';
import { isWithinInterval } from 'date-fns';
import { ChangeDetectorRef } from '@angular/core';




@Component({
  selector: 'app-resumen-tareas',
  templateUrl: './resumen-tareas.component.html',
  styleUrls: ['./resumen-tareas.component.css']
})


export class ResumenTareasComponent  {

  currentDate: Date = new Date();
  weeks: { start: Date, end: Date, tareas: { [idProyecto: number]: TareaResumen[] }, id: string }[] = [];
  tareas: TareaResumen[] = [];
  selectedProjectId: number | null = null;
  allWeeks: { start: Date, end: Date, tareas: { [idProyecto: number]: TareaResumen[] }, id: string }[] = [];
  isProjectFiltered: boolean = false;
  selectedProjectIds: number[] = []; // Ahora es un array para múltiples selecciones
  contarTareas: number = 0;
  tareasFiltradasAContar: TareaResumen[] = [];

  constructor(private tareaService: TareaService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.getTareas();
    this.contarTareas = 0;
    this.progresoGeneral
  }

  ngAfterContentChecked(): void {
    //Called after every check of the component's or directive's content.
    //Add 'implements AfterContentChecked' to the class.
    this.cdr.detectChanges();
  }


  getTareas(): void {
    this.tareaService.getTareas().subscribe((data: TareaResumen[]) => {
      this.tareas = data;
      console.log(data);
      this.generateWeeks();
    });
  }

  generateWeeks(): void {
    const monthStart = startOfMonth(this.currentDate); // 01/03/2025
    const monthEnd = endOfMonth(this.currentDate); // 31/03/2025
  
    // Ajustamos para que la primera semana comience desde el lunes correspondiente
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  
    this.allWeeks = [];
  
    while (weekStart <= monthEnd) {
      let weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Domingo de la semana actual
  
      // Asegurar que el inicio no sea antes del mes y el fin no sea después del mes
      let startDate = new Date(Math.max(weekStart.getTime(), monthStart.getTime()));
      let endDate = new Date(Math.min(weekEnd.getTime(), monthEnd.getTime()));
  
      let filteredTareas = this.tareas.filter(tarea => {
        const tareaDate = tarea.fechaCompromisoTarea;
        return isWithinInterval(tareaDate, { start: startDate, end: endDate });
      });
  
      const tareasPorProyecto: { [idProyecto: number]: TareaResumen[] } = {};
      filteredTareas.forEach(tarea => {
        if (!tareasPorProyecto[tarea.idProyectoTarea]) {
          tareasPorProyecto[tarea.idProyectoTarea] = [];
        }
        tareasPorProyecto[tarea.idProyectoTarea].push(tarea);
      });
  
      if (Object.keys(tareasPorProyecto).length > 0) {
        this.allWeeks.push({
          start: startDate,
          end: endDate,
          tareas: tareasPorProyecto,
          id: `week-${weekStart.getTime()}`
        });
      }
  
      weekStart = addWeeks(weekStart, 1); // Avanzar a la siguiente semana
    }
  
    this.filterByProject();
  }



  filterByProject(): void {
    if (this.selectedProjectIds.length > 0) {
      this.weeks = this.allWeeks
        .map(week => ({
          ...week,
          tareas: Object.keys(week.tareas)
            .map(id => Number(id))
            .filter(id => this.selectedProjectIds.includes(id))
            .reduce((acc, id) => ({ ...acc, [id]: week.tareas[id] }), {} as { [idProyecto: number]: TareaResumen[] })
        }))
        .filter(week => Object.keys(week.tareas).length > 0);
    } else {
      this.weeks = [...this.allWeeks];
    }
  }

  toggleProjectSelection(proyectoId: number): void {
    if (this.selectedProjectIds.includes(proyectoId)) {
      this.selectedProjectIds = this.selectedProjectIds.filter(id => id !== proyectoId); // Quita si ya estaba
    } else {
      this.selectedProjectIds.push(proyectoId); // Agrega si no estaba
    }
    this.filterByProject();
  }
  get proyectos() {
    // Extraemos los proyectos únicos directamente de las tareas
    return [...new Map(this.tareas.map(t => [t.idProyectoTarea, { id: t.idProyectoTarea, nombre: t.nombreProyecto, porcentaje: t.porcentajeAvanceProyecto}])).values()];
  }


  get progresoGeneral(): number {
    // Si no hay semanas cargadas, retornamos 0
    if (this.weeks.length === 0) {
      console.log('No weeks data available.');
      this.contarTareas = 0; // Asegurar que la variable se actualice
    }
  
    let tareasFiltradas: TareaResumen[] = [];
  
    // Recorrer todas las semanas visibles y extraer tareas de proyectos seleccionados
    this.weeks.forEach(week => {
      console.log(`Processing week desde ${week.start} al ${week.end}`);
      Object.keys(week.tareas).forEach(idProyecto => {
        const id = Number(idProyecto);
        console.log(`Checking project ID: ${id}`);

        if (this.selectedProjectIds.length === 0 || this.selectedProjectIds.includes(id)) {
          // Filtrar solo las tareas dentro de la semana y proyecto seleccionados
          const tareasPorProyecto = week.tareas[id];
          console.log(`Tareas for project ${id}:`, tareasPorProyecto);
          
          tareasFiltradas.push(...tareasPorProyecto);

        }
        return tareasFiltradas;
      });
    });
    this.tareasFiltradasAContar = tareasFiltradas;
    console.log('Filtered tasks:', tareasFiltradas);

    

    console.log()
  
    // Si no hay tareas filtradas, retornamos 0
    if (tareasFiltradas.length === 0) {
      console.log('No hay tareas filtradas para el calculo.');
      return 0;
    }
  
    // Calcular el porcentaje total de avance de las tareas filtradas
    const totalAvance = tareasFiltradas.reduce((acc, tarea) => {
      console.log(`Calculando progreso para la tarea ${tarea.idTarea}:`, tarea.porcentajeAvanceTarea);
      return acc + (tarea.porcentajeAvanceTarea ? parseFloat(tarea.porcentajeAvanceTarea) || 0 : 0);
    }, 0);
  
    console.log('Total progress:', totalAvance);
  
    // Promedio de los avances de todas las tareas seleccionadas
    const promedioAvance = totalAvance / tareasFiltradas.length;
    console.log('progreso promedio:', promedioAvance);
  
    // Asegurar que el valor no sea NaN y lo redondeamos
    const resultado = Math.round(promedioAvance) || 0;
    console.log('progreso final:', resultado);
  
    return resultado; // Asegura que nunca sea NaN
  }
  
  
  contarTareasProyecto(): number {
    return this.tareasFiltradasAContar.length; // Usamos la variable almacenada
  }
  
  
  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() - 1));
    this.generateWeeks();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() + 1));
    this.generateWeeks();
  }
}



