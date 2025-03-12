import { Component, OnInit } from '@angular/core';
import { TareaService, TareaResumen } from '../../services/tarea.service';

import { addWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO, isMonday } from 'date-fns';
import { isWithinInterval } from 'date-fns';



@Component({
  selector: 'app-resumen-tareas',
  templateUrl: './resumen-tareas.component.html',
  styleUrls: ['./resumen-tareas.component.css']
})


export class ResumenTareasComponent {

  currentDate: Date = new Date();
  weeks: { start: Date, end: Date, tareas: { [idProyecto: number]: TareaResumen[] }, id: string }[] = [];
  tareas: TareaResumen[] = [];
  selectedProjectId: number | null = null;
  allWeeks: { start: Date, end: Date, tareas: { [idProyecto: number]: TareaResumen[] }, id: string }[] = [];

  constructor(private tareaService: TareaService) {}

  ngOnInit(): void {
    this.getTareas();
  }

  getTareas(): void {
    this.tareaService.getTareas().subscribe((data: TareaResumen[]) => {
      this.tareas = data;
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
  get proyectos() {
    // Extraemos los proyectos únicos directamente de las tareas
    return [...new Map(this.tareas.map(t => [t.idProyectoTarea, { id: t.idProyectoTarea, nombre: t.nombreProyecto }])).values()];
  }


  filterByProject(): void {
    if (this.selectedProjectId) {
      this.weeks = this.allWeeks
        .map(week => ({
          ...week,
          tareas: this.selectedProjectId !== null && week.tareas[this.selectedProjectId] ? { [this.selectedProjectId]: week.tareas[this.selectedProjectId] } : {}
        }))
        .filter(week => Object.keys(week.tareas).length > 0);
    } else {
      this.weeks = [...this.allWeeks];
    }
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



