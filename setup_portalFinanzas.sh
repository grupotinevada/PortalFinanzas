#!/bin/bash
RED='\e[31m'      # Rojo
GREEN='\e[32m'    # Verde
YELLOW='\e[33m'   # Amarillo
BLUE='\e[34m'     # Azul
CYAN='\e[36m'     # Cian
RESET='\e[0m'     # Reset (para volver al color normal)

# Variables
REPO_URL="https://github.com/grupotinevada/PortalFinanzas.git"
PROJECT_DIR="$HOME/soporte/Escritorio/PortalFinanzas"
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$PROJECT_DIR/dist/panelControl/server"

echo ${YELLOW}"Clonando repositorio..."${RESET}
git clone "$REPO_URL" "$PROJECT_DIR"

echo "Instalando módulos en backend..."
cd "$BACKEND_DIR" || exit
npm install
npm uninstall nodemailer bcrypt winston
npm install nodemailer bcrypt winston

echo "Instalando módulos en la raíz del proyecto..."
cd "$PROJECT_DIR" || exit
npm install

echo ""
read -p "($echo -e ${GREEN}Realiza los cambios a los puertos ${RESET} ${RED}si es desarrollo 3002 en el server.js(linea 2066) y en el BACKEND.ENV(variable PORT linea 16 ) en la carpeta backend y 4002 en server.ts(linea 48) ${RESET}, ${GREEN}SI ES PRODUCTIVO USAR LOS PUERTOS 3001 Y 4001 RESPECTIVAMENTE ${RESET}, UNA VEZ LISTO PRESIONA ENTER.....)"
read -p "($echo -e ${CYAN}Recuerda que en server.js dentro de la carpeta backend ${RESET}, ${YELLOW} LA VARIABLE 'RUTA_BASE_ARCHIVOS' (linea 14) DEBE APUNTAR hacia donde esta la carpeta backend/archivos (si no existe la carpeta archivos, crearla) ${RESET}, ${CYAN} presiona ENTER PARA CONTINUAR EL PROCESO ${RESET}"
echo "Compilando la aplicación..."
ng build
sleep 5

echo "Verificando pantallas activas..."
screen -ls | grep -q "AngularFinanzas" || screen -dmS AngularFinanzas
screen -ls | grep -q "NodeFinanzas" || screen -dmS NodeFinanzas

echo "Iniciando servidor Node.js..."
screen -XS NodeFinanzas quit
screen -dmS NodeFinanzas bash -c "cd '$BACKEND_DIR' && node server.js"

echo "Esperando unos segundos para la inicialización de Node.js..."
sleep 5

echo "Iniciando servidor Angular..."
screen -XS AngularFinanzas quit
screen -dmS AngularFinanzas bash -c "cd '$DIST_DIR' && node server.mjs"

echo "Proceso completado. La página debería estar activa en 'portalfinanzas.inevada.cl'"
