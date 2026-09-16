---
name: crear-hu
description: Descompone una feature en Historias de Usuario y las crea en GitHub como épica con sub-issues, agregándolas al Project v2 del equipo con Status y Size. Úsala siempre que se hable de crear HU, historias de usuario, épicas, backlog, planear una feature, descomponer trabajo en issues, armar una hoja de ruta o roadmap, o cuando pidan "pasar esto a GitHub" / "crear los tickets" / "hacer de project manager". También aplica cuando alguien describe una feature grande y hay que dividirla en trabajo ejecutable, aunque no nombre la palabra "historia".
---

# Crear Historias de Usuario en GitHub

Convierte una feature descrita en lenguaje natural en una épica con sub-issues
en GitHub, con formato consistente y agregadas al tablero del equipo.

## Por qué existe

Escribir HU a mano en la interfaz de GitHub tiene dos problemas: el formato se
va degradando issue a issue, y vincular sub-issues + fijar campos del tablero
son cuatro clics por historia que nadie sostiene. El resultado típico es un
backlog de títulos sueltos sin criterios de aceptación, que a las dos semanas
nadie sabe interpretar.

Esta skill mantiene el formato estable y hace el trabajo mecánico de una sola vez.

## Antes de escribir nada: investigar

**El valor de una HU está en que sea cierta.** Una historia inventada —que
describe un problema que no existe, o propone arreglar algo que ya funciona—
cuesta más de lo que aporta, porque alguien la va a tomar y va a perder medio
día descubriendo que la premisa era falsa.

Así que antes de redactar:

1. **Lee el código del área** que la feature toca. Si son varias áreas, despacha
   subagentes de exploración en paralelo — uno por módulo.
2. **Distingue lo que existe de lo que falta.** Es habitual encontrar código
   escrito pero nunca conectado: una función que nadie importa, una plantilla de
   correo que nadie dispara, una página que no está enrutada. Eso cambia por
   completo el tamaño de la historia.
3. **Cita archivos y líneas concretas** en el cuerpo de la HU. Quien la tome
   agradece saber dónde mirar, y de paso queda evidencia de que el problema es real.

Si la investigación revela que la feature pedida ya está resuelta, dilo en vez
de crear la HU.

## Formato

### Título

Corto y escaneable, con prefijo de área entre corchetes:
`[Inv] Registrar el historial de movimientos de inventario`

El enunciado rol-acción-beneficio va en el cuerpo, no en el título — un título
de tres líneas es ilegible en la lista del tablero.

### Cuerpo de una HU

```markdown
## Historia

Como **<rol>**
quiero **<acción>**
para **<beneficio>**.

## Contexto técnico

Qué existe hoy, qué falla y por qué importa. Cita archivos con línea.
Si hay una decisión de diseño abierta, plantéala aquí en vez de resolverla
por decreto — quien implemente tendrá más contexto que tú.

## Criterios de aceptación

**Escenario: <nombre del caso>**
- **Dado** <estado inicial>
- **Cuando** <acción>
- **Entonces** <resultado observable>

(repetir por escenario: el camino feliz, los bordes, y el caso de error)

## Definición de terminado

- [ ] <condición verificable>
```

### Cuerpo de una épica

```markdown
## Contexto
Por qué existe esta épica. Qué encontró la investigación.

## Objetivo
Qué se logra cuando termine.

## Orden sugerido
Qué va primero y por qué. Las dependencias reales, no un orden arbitrario.

## Fuera de alcance
Lo que alguien podría asumir que entra y no entra.

## Criterio de cierre
- [ ] <condición de épica completa>
```

## Escribir buenos criterios de aceptación

Los escenarios deben ser **observables**: alguien que no escribió el código
tiene que poder verificarlos.

- ✅ `Entonces el disponible queda en 4800 USD y el movimiento aparece en el historial`
- ❌ `Entonces el inventario se actualiza correctamente` — ¿correctamente cómo?

Cubre siempre el camino de error, no solo el feliz. La mitad de los defectos
viven ahí, y una HU que solo describe el éxito deja esa mitad a interpretación.

## Tamaños

| Size | Significado |
|------|-------------|
| XS   | Un cambio puntual, sin riesgo |
| S    | Media jornada; toca uno o dos archivos |
| M    | Uno o dos días; varios archivos o una migración simple |
| L    | Media semana; cambio estructural o migración de datos |
| XL   | Demasiado grande — pártela en varias HU |

Si vas a poner XL, la historia está mal delimitada. Divídela.

## Crear los issues

El script `scripts/crear_hu.py` hace el trabajo mecánico: crea la épica, crea
cada HU, las cuelga como sub-issues, las agrega al tablero y fija Status y Size.

**Siempre corre primero con `--dry-run`** y muestra el resultado a quien pidió
el trabajo antes de crear nada. Crear treinta issues equivocados es rápido;
deshacerlos no.

```bash
python3 scripts/crear_hu.py roadmap.json --dry-run   # muestra el árbol
python3 scripts/crear_hu.py roadmap.json             # crea de verdad
```

El script es **reanudable**: si una corrida se corta a mitad (rate limit, red),
volver a ejecutarlo reusa lo ya creado en vez de duplicarlo. Compara por título,
así que no cambies los títulos entre corridas.

### Formato del JSON

```json
{
  "repo": "piensa-it/app-midivisa",
  "project": { "owner": "piensa-it", "number": 3 },
  "epics": [
    {
      "title": "Épica: ...",
      "body": "...",
      "labels": ["epica", "area:inventario"],
      "status": "Backlog",
      "stories": [
        {
          "title": "[Inv] ...",
          "body": "...",
          "labels": ["hu", "area:inventario"],
          "size": "M",
          "status": "Backlog"
        }
      ]
    }
  ]
}
```

Los ids del proyecto y de sus campos se descubren solos a partir de
`owner` + `number`. No los escribas a mano: son opacos y cambian si alguien
recrea un campo en el tablero.

## Tablero y etiquetas de cada repo: `.piensa/backlog.json`

Esta skill es común a todos los repos de Piensa IT; lo que cambia entre ellos vive en la raíz del repo:

```json
{
  "repo": "piensa-it/app-midivisa",
  "project": { "owner": "piensa-it", "number": 3 },
  "status": ["Backlog", "Ready", "In progress", "In review", "Done"],
  "size": ["XS", "S", "M", "L", "XL"],
  "labels": ["epica", "hu", "area:ui", "area:inventario", "area:ventas"],
  "prefijos": { "area:inventario": "[Inv]" },
  "plantilla": "Contexto / Criterios de aceptación / Notas técnicas / Fuera de alcance / ¿Elegible para agente?"
}
```

Léelo antes de armar el JSON de la corrida y usa sus valores por defecto. Si no existe:

1. Deduce `repo` de `git remote get-url origin`.
2. Lista tableros con `gh project list --owner piensa-it` y etiquetas con `gh label list`.
3. Propón el archivo al dueño y créalo cuando lo confirme. No inventes etiquetas: si falta una, dilo.

Si el repo tiene plantilla de incidencias (`.github/ISSUE_TEMPLATE`) o una convención escrita en su `CLAUDE.md` o en la memoria, el cuerpo de cada HU la sigue.

Tableros conocidos (orientativo; manda el `.piensa/backlog.json` de cada repo):
- **MiDivisa**: `piensa-it` número 3; abarca `app-midivisa`, `web-sudivisa` y `app-tudivisa`.

## Requisitos

`gh` autenticado con scopes `repo` y `project`. Verifica con `gh auth status`
si algo falla con permisos.
