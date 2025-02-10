import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card'
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { AppRoutingModule } from './app-routing.module';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouterModule } from '@angular/router';
import { ProyectoComponent } from './components/proyecto/proyecto.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { MatExpansionModule} from '@angular/material/expansion';
import { AgregarproyectodialogComponent } from './components/agregarproyectodialog/agregarproyectodialog.component';
import { MatProgressBarModule} from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIcon, MatIconModule} from '@angular/material/icon';
import { MatPseudoCheckbox, provideNativeDateAdapter} from '@angular/material/core';
import { MatDatepickerModule} from '@angular/material/datepicker';
import { DownloadExcelComponent } from './components/download-excel/download-excel.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import {MatListModule} from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import {MatSliderModule} from '@angular/material/slider';
import { TareasComponent } from './components/tareas/tareas.component';
import { EditarproyectodialogComponent } from './components/editarproyectodialog/editarproyectodialog.component';
import { HistorialCambiosDialogComponent } from './components/historial-cambios-dialog/historial-cambios-dialog.component';
import { MatSortModule } from '@angular/material/sort';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import {MatTabsModule} from '@angular/material/tabs';
import { RecuperarContrasenaComponent } from './components/recuperar-contrasena/recuperar-contrasena.component';
import { FormsModule } from '@angular/forms';
import { AdminComponent } from './components/admin/admin.component';
import { MatDialogModule } from '@angular/material/dialog';
import { CrearUsuarioComponent } from './components/crearusuario/crearusuario.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EditarusuarioComponent } from './components/editarusuario/editarusuario.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FiltroComponent } from './components/filtro/filtro.component';
import { MiperfilComponent } from './components/miperfil/miperfil.component';
import { AprobacionesComponent } from './components/aprobaciones/aprobaciones.component';


registerLocaleData(localeEsCl, 'es-CL');

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    InicioComponent,
    ProyectoComponent,
    NavbarComponent,
    AgregarproyectodialogComponent,
    DownloadExcelComponent,
    SpinnerComponent,
    SidebarComponent,
    TareasComponent,

    
    EditarproyectodialogComponent,
    HistorialCambiosDialogComponent,

    RecuperarContrasenaComponent,

    AdminComponent,
    CrearUsuarioComponent,
    EditarusuarioComponent,
    FiltroComponent,
    MiperfilComponent,
    AprobacionesComponent,
  ],
  imports: [
    MatProgressSpinnerModule,
    BrowserModule,
    MatProgressBarModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatInputModule,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardActions,
    RouterModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatSelectModule,
    MatSliderModule,
    MatIcon,
    MatDatepickerModule,
    MatPseudoCheckbox,
    MatIcon, 
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatTabsModule,
    FormsModule,
    MatDialogModule,
    MatCheckboxModule
    ],


  providers: [    
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' }, // Establecer la región de Chile
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: LOCALE_ID, useValue: 'es-CL' },
    [FiltroComponent],
    provideHttpClient(withFetch()), provideAnimationsAsync(),provideNativeDateAdapter()],
  bootstrap: [AppComponent]
})
export class AppModule { 

}
