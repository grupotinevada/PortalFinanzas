import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-download-excel',
  templateUrl: './download-excel.component.html',
  styleUrls: ['./download-excel.component.css']
})
export class DownloadExcelComponent {

  constructor(private http: HttpClient) {}

  downloadExcel() {
    const fileName = 'plantilla_tareas.xlsx';
    const filePath = '/plantilla_tareas.xlsx'; // Ajusta la ruta si es necesario

    this.http.get(filePath, { responseType: 'blob' })
      .subscribe(blob => {
        saveAs(blob, fileName);
      });
  }
}