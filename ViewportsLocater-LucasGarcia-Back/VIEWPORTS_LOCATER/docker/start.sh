#!/bin/bash

echo "Esperando a MySQL..."
while ! php artisan migrate --force 2>/dev/null; do
    echo "MySQL no disponible, reintentando en 5s..."
    sleep 5
done

php artisan migrate --force
php artisan db:seed --class=RolesSeeder --force
php artisan storage:link || true
php artisan config:cache
php artisan route:cache

php-fpm -D

echo "Arrancando nginx..."
nginx -t  # test de configuración
nginx -g "daemon off;"
