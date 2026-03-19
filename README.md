# Bolboretas & Valu Shop

Proyecto web para una asociación que rescata, cuida y busca hogar para gatos.
La web está orientada a dar visibilidad a los animales, facilitar la adopción y activar la colaboración de la comunidad.

## Objetivo

Bolboretas & Valu impulsa una tienda online de ropa y complementos.
Este proyecto centraliza esa actividad en un sitio público y en un panel interno de gestión.

## Partes visibles (web pública)

- Inicio con mensaje principal, formas de ayuda e historias destacadas.
- Sección de gatos:
  - En adopción
  - Casos especiales
  - Últimos adoptados
- Blog y noticias.
- Páginas informativas: quiénes somos y contacto.
- Páginas de colaboración: donar, voluntariado y compras solidarias.
- Fichas de detalle para cada gato.
- Formularios de contacto y apoyo.

## Área admin (gestión interna)

- Gestión de gatos:
  - Alta, edición y baja.
  - Estado del gato (adopción, caso especial, adoptado, etc.).
  - Publicación y contenido.
- Gestión de publicaciones:
  - Noticias, eventos, urgentes y blog.
  - Edición de título, extracto, contenido e imagen.
  - Control de publicación.

## Enfoque del proyecto

- Prioriza claridad y accesibilidad para cualquier persona que quiera ayudar.
- Mantiene separada la parte pública de la gestión interna.
- Está pensado para evolucionar con las necesidades reales de la asociación.

## Separación Supabase para tienda

Si esta copia se reutiliza como tienda independiente (ej. Bolboretas & Valu), no debe compartir base de datos con otros proyectos.

- Proyecto original (protectora):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Proyecto nuevo (tienda):
  - `VITE_SHOP_SUPABASE_URL`
  - `VITE_SHOP_SUPABASE_ANON_KEY`

Esquema inicial de tienda disponible en `supabase.shop.sql`.
