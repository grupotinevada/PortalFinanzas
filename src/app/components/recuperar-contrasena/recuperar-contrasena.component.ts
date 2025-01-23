import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RecuperarContrasenaService } from '../../services/recuperar-contrasena.service';

@Component({
  selector: 'app-recuperar-contrasena',
  templateUrl: './recuperar-contrasena.component.html',
  styleUrls: ['./recuperar-contrasena.component.css'],
})
export class RecuperarContrasenaComponent {
  step: number = 1; // Paso actual
  emailForm: FormGroup;
  codeForm: FormGroup;
  passwordForm: FormGroup;
  minutes: number = 3;
  seconds: number = 0;
  timer: any;
  showSpinner: boolean = false;

  constructor(
    private fb: FormBuilder,
    private recuperarContrasenaService: RecuperarContrasenaService,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.emailForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
    });

    this.codeForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });

    this.passwordForm = this.fb.group({
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  // Ir a la página de login
  irALogin() {
    this.router.navigate(['/login']);
  }

  /**
  * Limpia el temporizador al destruir el componente.
  */
  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  enviarCodigo() {
    this.showSpinner = true;
    const { correo } = this.emailForm.value;
    this.recuperarContrasenaService.enviarCodigo(correo).subscribe({
      next: () => {
        this.step = 2; // Avanzar al paso 2
        this.startTimer(); // Iniciar el temporizador
        this.snackBar.open('Código de verificación enviado al correo.', 'Cerrar', { duration: 3000 });
        this.showSpinner = false;
      },
      error: (err) => {
        if (err.status === 404 && err.error?.message === 'Correo no encontrado en la base de datos') {
          this.snackBar.open('El correo no existe en la base de datos.', 'Cerrar', { duration: 3000 });
          this.showSpinner = false;
        } else {
          this.snackBar.open('Error al enviar el código. Lo sentimos, por favor intente más tarde', 'Cerrar', { duration: 3000 });
          this.showSpinner = false;
        }
      },
    });
  }

  verificarCodigo() {
    const { correo } = this.emailForm.value;
    const { codigo } = this.codeForm.value;

    this.recuperarContrasenaService.verificarCodigo(correo, codigo).subscribe({
      next: () => {
        this.step = 3; // Avanzar al paso 3
        this.snackBar.open('Código verificado correctamente.', 'Cerrar', { duration: 3000 });
        clearInterval(this.timer);
      },
      error: () => this.snackBar.open('Código incorrecto o expirado.', 'Cerrar', { duration: 3000 }),
    });
  }

  actualizarContrasena() {
    const { correo } = this.emailForm.value;
    const { nuevaContrasena } = this.passwordForm.value;

    this.recuperarContrasenaService.actualizarContrasena(correo, nuevaContrasena).subscribe({
      next: () => {
        this.snackBar.open('Contraseña cambiada exitosamente.', 'Cerrar', { duration: 3000 });
        this.step = 1;
        this.emailForm.reset();
        this.codeForm.reset();
        this.passwordForm.reset();
        clearInterval(this.timer); // Asegurar que el temporizador se detenga
      },
      error: () => this.snackBar.open('Error al cambiar la contraseña.', 'Cerrar', { duration: 3000 }),
    });
  }

  // Iniciar el temporizador
  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.minutes = 2;
    this.seconds = 0;

    this.timer = setInterval(() => {
      if (this.seconds === 0) {
        if (this.minutes === 0) {
          clearInterval(this.timer);
          this.timerExpired();
        } else {
          this.minutes--;
          this.seconds = 59;
        }
      } else {
        this.seconds--;
      }

      // Forzar la detección de cambios
      this.cdr.detectChanges();
    }, 1000);
  }

  // Acción cuando el temporizador expira
  timerExpired() {
    alert('El tiempo ha expirado. Por favor, solicita un nuevo código.');
    this.step = 1; // Redirigir al paso 1
  }

}
