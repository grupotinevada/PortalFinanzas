export interface ArchivoProyecto {
    idarchivo: number;
    idproyecto: number;
    idarea: number;
    idusuario: number;
    nombre_completo: string;
    ruta: string;
    fechacreacion: string;
    usuario_nombre: string;
  }
  
  export interface ResponseArchivo {
    message: string;
    idarchivo?: number;
    ruta?: string;
  }