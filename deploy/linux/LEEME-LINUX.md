# Publicar BEP en el VPS de SONDA (Ubuntu, Oracle Cloud)

```
Navegador -> nginx (443, https://bep.lyracode.com) -> Node de BEP (127.0.0.1:3100) -> SQL Server (otro servidor)
```

- BEP vive en su propia carpeta `/home/ubuntu/Bep/` y no toca nada de `/home/ubuntu/Sonda/`.
- SONDA usa el puerto 3000; BEP usa el **3100**, solo en 127.0.0.1.
- nginx agrega un sitio nuevo (`bep.lyracode.com`) junto a `appsonda.lyracode.com`.

## 1. En tu PC (PowerShell): subir el paquete
```
scp -i "$env:USERPROFILE\.ssh\id_ed25519_oci" -o IdentitiesOnly=yes "C:\Users\Rolando IsmahelJuare\Desktop\Proyecto BEP\BEP-vps.tar.gz" ubuntu@158.247.124.59:/home/ubuntu/
```

## 2. En el VPS: instalar
```
mkdir -p /home/ubuntu/Bep/BackNode
tar -xzf ~/BEP-vps.tar.gz -C /home/ubuntu/Bep/BackNode
cd /home/ubuntu/Bep/BackNode && npm ci --omit=dev
cp deploy/linux/env.produccion.ejemplo .env && chmod 600 .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 48)/" .env
nano .env        # completar DB_SERVER, DB_USER, DB_PASSWORD
```

## 3. Probar la conexion a la base ANTES de arrancar
```
nc -zv <DB_SERVER> 1433
```
Si no conecta: abrir el puerto / VPN / firewall del SQL Server para la IP 158.247.124.59.
La base se crea con `sql/BEP_Completo.sql` (SSMS) o con `npm run db:init` desde el VPS.

## 4. Servicio
```
sudo cp deploy/linux/bep-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bep-backend
curl -s http://127.0.0.1:3100/health
journalctl -u bep-backend -n 30 --no-pager
```

## 5. nginx + HTTPS
```
sudo cp deploy/linux/bep.lyracode.com.nginx /etc/nginx/sites-available/bep.lyracode.com
sudo ln -s /etc/nginx/sites-available/bep.lyracode.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bep.lyracode.com
```
Abrir https://bep.lyracode.com y entrar con admin@bep.local / Admin123* (cambiar la clave de inmediato).

## Actualizar despues
Subir un nuevo `BEP-vps.tar.gz`, extraerlo encima (no pisa `.env` ni `ArchivosBEP/`), `npm ci --omit=dev` si cambio package.json y `sudo systemctl restart bep-backend`.

## Respaldos
Incluir `/home/ubuntu/Bep/BackNode/ArchivosBEP/` (archivos e imagenes subidos) y `.env`, ademas de la base.
