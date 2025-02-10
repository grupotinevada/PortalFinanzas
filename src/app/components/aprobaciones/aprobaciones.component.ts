import { Component, OnInit} from '@angular/core';
import { AprobacionesService, Solicitud } from '../../services/aprobaciones.service';

@Component({
  selector: 'app-aprobaciones',
  templateUrl: './aprobaciones.component.html',
  styleUrls: ['./aprobaciones.component.css']
})


export class AprobacionesComponent implements OnInit{

  solicitudes: Solicitud[] = [];

  showSpinner = false;

  constructor(private aprobacionService: AprobacionesService) { }

  ngOnInit() {
    this.showSpinner=true;
    this.aprobacionService.obtenerCambiosSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes = data as any[];
        console.log('INFO: ', this.solicitudes)
        this.showSpinner=false;
      },
      error: (error) => {
        console.error('Error al obtener las solicitudes', error);
        this.showSpinner=false;
      }
    });
  }

esFecha(valor: any): boolean {
  return !isNaN(Date.parse(valor)); // Devuelve `true` si es una fecha válida
}



getEstadoClase(estado: string) {
  return {
    'bg-warning text-dark': estado === 'Pendiente',
    'bg-success text-light': estado === 'Aprobado',
    'bg-danger text-light': estado === 'Rechazado'
  };
}
  

}