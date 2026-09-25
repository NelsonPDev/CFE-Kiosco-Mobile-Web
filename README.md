# CFE Kiosco Mobile Web

## Configuración local

1. Copia los archivos de ejemplo de entorno:
   - backend/.env.example -> backend/.env
   - frontend/.env.example -> frontend/.env
2. Completa tus valores locales reales.
3. Instala dependencias:
   - backend: npm install
   - frontend: npm install
4. Inicia:
   - backend: npm run start
   - frontend: npm run dev -- --host 0.0.0.0

## Seguridad

Los archivos .env nunca deben subirse a GitHub. Se usan variables de entorno locales para proteger claves y tokens.
