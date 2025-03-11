import { Component, OnInit } from '@angular/core';
import { TareaService } from '../../services/tarea.service';
import moment from 'moment';

@Component({
  selector: 'app-resumen-tareas',
  templateUrl: './resumen-tareas.component.html',
  styleUrls: ['./resumen-tareas.component.css']
})


export class ResumenTareasComponent implements OnInit {
  tareas: any[] = [];

  constructor(private tareaService: TareaService) {}

  ngOnInit(): void {
    this.tareaService.getTareas().subscribe(tareas => {
      this.tareas = tareas;
    });
  }


}