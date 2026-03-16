import express from "express"
import dotenv from "dotenv"
import sqlite3 from "sqlite3"

// ── Configurar variables de entorno ──
dotenv.config()
const PORT = process.env.PORT || 3000
const UA = process.env.USER_AGENT || "LabGeolocUCSM/1.0"

// ── Configurar Express ──
const app = express()
app.use(express.json())
app.use(express.static("public"))

// ── Configurar SQLite ──
const db = new sqlite3.Database("./geoloc.db")
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS busquedas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen_lat TEXT,
      origen_lon TEXT,
      destino_lat TEXT,
      destino_lon TEXT,
      distancia REAL,
      duracion REAL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
})

// ── Helper fetch con User-Agent ──
const osmFetch = (url) =>
  fetch(url, { headers: { "User-Agent": UA } }).then((r) => r.json())

// ── Endpoint: Geocodificación inversa ──
app.get("/api/geocode", async (req, res) => {
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ error: "Se requieren lat y lon" })

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    const data = await osmFetch(url)
    res.json({
      direccion: data.display_name,
      ciudad: data.address?.city || data.address?.town,
      pais: data.address?.country,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Endpoint: Ruta entre puntos ──
app.get("/api/ruta", async (req, res) => {
  const { oLat, oLon, dLat, dLon } = req.query
  if (!oLat || !oLon || !dLat || !dLon) {
    return res.status(400).json({ error: "Se requieren coordenadas de origen y destino" })
  }

  try {
    // OSRM usa lon,lat y pedimos geometría para dibujar línea
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=geojson`

    const data = await osmFetch(url)
    if (data.code !== "Ok") return res.status(502).json({ error: data.code })

    const ruta = data.routes[0]

    const distancia = (ruta.distance / 1000).toFixed(2)
    const duracion = (ruta.duration / 60).toFixed(1)
g
    // ── Guardar en BD ──
    db.run(
      `INSERT INTO busquedas
       (origen_lat, origen_lon, destino_lat, destino_lon, distancia, duracion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [oLat, oLon, dLat, dLon, distancia, duracion]
    )

    res.json({
      distancia_km: distancia,
      duracion_min: duracion,
      geometry: ruta.geometry
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Endpoint: Historial de búsquedas ──
app.get("/api/historial", (req, res) => {
  db.all("SELECT * FROM busquedas ORDER BY fecha DESC LIMIT 10", [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

// ── Iniciar servidor ──
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`)
})