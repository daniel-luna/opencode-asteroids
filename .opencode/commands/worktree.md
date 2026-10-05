---
description: Crea un git worktree en .worktrees/ con el nombre indicado
---

Crea un worktree de git para la feature pedida.

Nombre solicitado: $ARGUMENTS

Reglas para el nombre:

- Minúsculas.
- Espacios y guiones bajos convertidos a `-`.
- Colapsa guiones repetidos y recorta los de los extremos.
- Sustituye por `-` cualquier carácter que git no permita en un nombre de rama.
- Si el nombre resultante queda vacío, no ejecutes nada y pide un nombre.

Si `.worktrees/<nombre>` ya existe, informa y no lo recrees.

Ejecuta exactamente este comando, en la raíz del proyecto, y nada más:

```bash
git worktree add .worktrees/<nombre>
```