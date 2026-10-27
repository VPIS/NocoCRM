# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | Español | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

NocoCRM es un CRM de código abierto para ventas B2B, construido sobre [NocoBase 3](https://www.nocobase.com). Incluye 6 agentes de ventas e integra tu correo y WhatsApp: hacen seguimiento de leads y oportunidades, responden los mensajes al instante y revisan contigo las aprobaciones. Los agentes sugieren; tú decides.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Pruébalo en línea](https://solutions.nocobase.com/crm/) · [Sitio web](https://www.nocobase.com/es-ES/solution-crm/)

## Qué hace

- **Nada se queda sin seguimiento.** Un lead o una oportunidad nuevos, la respuesta de un cliente, una tarea terminada, la revisión de la mañana: un agente lee todo el contexto y deja el siguiente paso en tu bandeja de entrada, con su recomendación, su confianza y sus razones. Los registros solo cambian cuando aceptas.
- **Todos los canales en una sola línea de tiempo.** Cada persona conecta su propio buzón y la empresa su número de WhatsApp Business. Los mensajes se vinculan a leads y contactos, y las respuestas se redactan para salir desde tu propia cuenta.
- **Un equipo de agentes de ventas.** Sales Expert para conversar, además de seguimiento de leads, seguimiento de oportunidades, revisión de aprobaciones, preparación de tareas e investigación de empresas, cada uno con sus disparadores, sus habilidades y un registro de sus ejecuciones.
- **Las aprobaciones ya no se atascan.** El agente de aprobaciones contrasta un descuento o una condición con tus reglas y decisiones anteriores, y redacta una recomendación y un comentario para quien aprueba.
- **Tus reglas, tu código.** Escribe tus precios, límites de descuento y ritmo de seguimiento como guía de negocio en texto llano, y todos los agentes la siguen. Pide a un agente de programación que cambie el propio código fuente del CRM. Código abierto, autoalojado y tuyo.
- **Todo el ciclo de ventas.** Leads, empresas, contactos, oportunidades, tareas, aprobaciones e informes, con roles que el servidor aplica registro a registro.

## Inicio rápido

### 1. Instalar

**Con un agente de programación.** La forma más fácil. Abre Claude Code, Codex o Cursor en la carpeta donde irá NocoCRM y dale esto:

```text
Instala NocoCRM desde https://github.com/nocobase/NocoCRM e inícialo, siguiendo el AGENTS.md y el README del repositorio.
```

**A mano.** Necesitas Node.js 24 o posterior y pnpm 11 (`corepack enable`). Los datos se guardan por defecto en un archivo SQLite; PostgreSQL y MySQL también funcionan.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Iniciar sesión

Abre la dirección `Local:` que muestra `pnpm dev`, normalmente `http://127.0.0.1:13000/main/`, e inicia sesión como `nocobase` con la contraseña `admin123`.

### 3. Importar los datos de demostración

El banner de la parte superior los ofrece, o abre **Configuración → Datos de demostración**. Traen un equipo de ventas con clientes, oportunidades, tareas, aprobaciones, correo y conversaciones; elimínalos en esa misma página cuando empieces de verdad.

### 4. Configurar un modelo de IA

Añade un servicio de modelos con su clave en **Equipo de Agents → Modelos**, por ejemplo DeepSeek, OpenAI, Claude, Gemini o Qwen. El asistente y los agentes lo necesitan; todo lo demás funciona sin él.

La [guía](guide.md) (en inglés) cubre los siguientes pasos, las cuentas de demostración, los roles, la configuración (IA, correo, WhatsApp, bases de datos), el despliegue y el desarrollo.

## Licencia

[Apache License 2.0](../LICENSE)
