import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],

})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  loginError: string | null = null;
  hide = true;

  togglePasswordVisibility() {
    this.hide = !this.hide;
  }
  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void { }

  onLogin(): void {
    const correo = this.loginForm.get('correo')?.value;
    const password = this.loginForm.get('password')?.value;
  
    this.userService.login(correo, password).subscribe(
      response => {
        this.loginError = null;
        // Guardar token y datos del usuario en AuthService
        this.authService.login(response.token, response.usuario);
        this.router.navigate(['/inicio']);
      },
      error => {
        if (error.status === 0) {
          // Error de conexión o "Failed to fetch"
          this.loginError = 'No se pudo conectar al servidor. Por favor, inténtelo más tarde.';
        } else {
          // Otros errores del backend
          this.loginError = error.error.message || 'Ocurrió un error inesperado.';
        }
      }
    );
  }
}