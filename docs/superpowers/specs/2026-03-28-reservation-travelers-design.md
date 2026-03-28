# Diseño: Viajeros por Reserva + Optimistic Updates

**Fecha:** 2026-03-28
**Estado:** Aprobado

---

## Contexto

Las reservas del viaje incluyen distintos subconjuntos de viajeros (ej: un vuelo para 3, un hotel para 1). Actualmente solo se guarda un número entero (`travelers Int`). El objetivo es poder especificar qué miembros del viaje están incluidos en cada reserva y derivar automáticamente el costo por persona y un breakdown por viajero.

Los viajeros siempre son miembros del viaje (`trip_members`).

---

## Cambios de datos

### Nueva columna
```sql
ALTER TABLE reservations ADD COLUMN travelerIds TEXT
```
- Tipo: `TEXT` nullable
- Formato: JSON array de userId strings → `'["uid1","uid2"]'`
- Default: `NULL` (backward compatible — se interpreta como "todos los miembros")
- El campo `travelers Int` existente se mantiene pero queda deprecado; el conteo se deriva de `travelerIds.length`

### Schema Prisma
Agregar en el modelo `Reservation`:
```prisma
travelerIds String?
```

### Migration
En `instrumentation.ts`, agregar al bloque de migrations existente:
```ts
await prisma.$executeRawUnsafe(
  `ALTER TABLE reservations ADD COLUMN "travelerIds" TEXT`
);
```

---

## Cambios de API

### GET `/api/trips/[tripId]/reservas`
- Agregar fetch paralelo de `trip_members` con `include: { user: { select: { id, name } } }`
- Pasar `members` como prop adicional a `TripReservasClient`

### POST/PUT `/api/trips/[tripId]/reservas` y `/api/trips/[tripId]/reservas/[id]`
- Aceptar `travelerIds: string[]` en el body
- Serializar como `JSON.stringify(travelerIds)` antes de guardar en DB
- Deserializar en GET responses: `JSON.parse(travelerIds ?? "[]")`

---

## Cambios de UI

### Formulario de reserva (crear/editar)
- Reemplazar el input numérico de "Viajeros" con checkboxes mostrando nombre de cada trip_member
- Default al abrir formulario nuevo: todos los miembros seleccionados
- Los checkboxes muestran el nombre del usuario (ej: "Tomás", "Cande", "Delfina")
- El costo por persona se muestra en tiempo real debajo: `$300 USD / persona`

### Lista de reservas (vista por reserva)
- Columna "Viajeros" muestra iniciales en badges: `T` `C` `D` en lugar del número
- Badge de cada viajero con color de fondo consistente por usuario

### Vista nueva — "Por viajero"
- Toggle en header de la página: `Por reserva | Por viajero`
- Vista "Por viajero": una card por miembro del viaje con:
  - Nombre + total gastado en USD
  - Lista de reservas que lo incluyen, con el costo proporcional (`priceUSD / travelerIds.length`)
  - Expandible/colapsable

---

## Optimistic Updates

Problema actual: guardar, cambiar estado o agregar una reserva requiere esperar la respuesta del servidor (~1-2s).

### Operaciones a optimizar
1. **Toggle `paid`** — actualización optimista inmediata, revert si falla
2. **Toggle `status`** — ídem
3. **Save reserva (PUT)** — actualizar la lista localmente antes de confirmar servidor
4. **Delete reserva** — remover de la lista inmediatamente, revert si falla

### Patrón
```ts
// 1. Guardar estado anterior
const prev = reservations;
// 2. Actualizar UI inmediatamente
setReservations(optimisticUpdate);
// 3. Llamar API
const res = await fetch(...);
// 4. Revert si error
if (!res.ok) setReservations(prev);
// 5. Si ok, reemplazar con dato real del servidor (para tener IDs correctos en creates)
```

---

## Costo por persona — lógica

```ts
function costPerTraveler(reservation: Reservation): number {
  const ids = JSON.parse(reservation.travelerIds ?? "[]");
  const count = ids.length || 1;
  return reservation.priceUSD / count;
}
```

Para reservas sin `travelerIds` (legacy): usar `reservation.travelers` como count.

---

## Out of scope

- Notificaciones a viajeros
- Permisos diferenciados por viajero
- Presupuesto individual por viajero (puede ser una segunda fase)
