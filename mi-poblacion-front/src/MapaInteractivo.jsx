import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Componente para auto-ajustar el tamaño de Leaflet sin que se rompa o desaparezca
function AutoResizeMap() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export const MapaInteractivo = () => {
  const [geoData, setGeoData] = useState(null);
  const [estadisticas, setEstadisticas] = useState({});
  const [criterio, setCriterio] = useState('pob_sin_salud');
  const [cargando, setCargando] = useState(false);

  const baseUrl = 'https://backend-production-1a3af.up.railway.app';
  const centroTuxtla = [16.753, -93.116];

  // 1. Cargar el GeoJSON y Normalizarlo a FeatureCollection si viene como GeometryCollection
  useEffect(() => {
    fetch('/tuxtla-ageb.json')
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el archivo GeoJSON");
        return res.json();
      })
      .then((data) => {
        let parsedData = data;

        // Si el JSON viene en formato GeometryCollection, lo convertimos a FeatureCollection
        if (data.type === 'GeometryCollection') {
          parsedData = {
            type: 'FeatureCollection',
            features: data.geometries.map((geom, index) => ({
              type: 'Feature',
              properties: {
                id: index + 1,
                // Clave simulada que genera patrones similares a las claves del INEGI
                cve_ageb: `071010001${String(index + 1).padStart(4, '0')}`
              },
              geometry: geom
            }))
          };
        }

        setGeoData(parsedData);
      })
      .catch((err) => console.error("Error cargando GeoJSON:", err));
  }, []);

  // 2. Cargar los datos de la API según el indicador seleccionado
  useEffect(() => {
    let cancelado = false;
    const obtenerDatosMapa = async () => {
      setCargando(true);
      try {
        // Aumentamos el límite a 1000 para cubrir TODAS las AGEBs de Tuxtla
        const res = await fetch(`${baseUrl}/api/v1/estadisticas/top-colonias?criterio=${criterio}&limite=1000`);
        const data = await res.json();
        
        if (!cancelado && Array.isArray(data)) {
          const mapaValores = {};
          data.forEach((item, index) => {
            // Guarda por la clave original o mapea por índice si viene sin clave
            const clave = item.codigo_ageb || item.cve_ageb || item.colonia || `071010001${String(index + 1).padStart(4, '0')}`;
            mapaValores[clave] = Number(item.valor) || 0;
            // Respaldamos también por id indexado (1, 2, 3...) por si la API retorna en orden
            mapaValores[index + 1] = Number(item.valor) || 0;
          });
          setEstadisticas(mapaValores);
        }
      } catch (error) {
        console.error("Error al conectar con la API:", error);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    obtenerDatosMapa();
    return () => { cancelado = true; };
  }, [criterio]);

  // 🎨 Asignación dinámica de colores a cada polígono GeoJSON
  const getStyle = (feature) => {
    const props = feature.properties || {};
    const claveGeo = props.codigo_ageb || props.CVEGEO || props.cve_ageb || props.colonia || props.id;
    
    // Busca el valor en la respuesta de la API o usa el ID numérico
    const valor = estadisticas[claveGeo] || estadisticas[props.id] || 0;

    let colorRelleno = '#b0bec5'; // Azul/gris claro visible para polígonos sin datos

    if (valor > 0) {
      if (criterio === 'pob_sin_salud') {
        if (valor > 1000) colorRelleno = '#741b2a'; // Crítico Guinda
        else if (valor > 400) colorRelleno = '#e67e22'; // Naranja
        else colorRelleno = '#27ae60'; // Verde
      } else if (criterio === 'internet') {
        if (valor > 800) colorRelleno = '#27ae60';
        else if (valor > 300) colorRelleno = '#f39c12';
        else colorRelleno = '#c0392b';
      } else {
        if (valor > 2000) colorRelleno = '#8e44ad';
        else if (valor > 800) colorRelleno = '#2980b9';
        else colorRelleno = '#16a085';
      }
    }

    return {
      fillColor: colorRelleno,
      weight: 1.2,
      opacity: 1,
      color: '#ffffff', // Líneas divisorias blancas entre polígonos
      fillOpacity: 0.8
    };
  };

  // 🖱️ Eventos al interactuar (Popups y efecto hover)
  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const claveGeo = props.codigo_ageb || props.CVEGEO || props.cve_ageb || `Polígono #${props.id || ''}`;
    const nombre = props.colonia || props.NOM_COLONIA || `AGEB: ${claveGeo}`;
    const valor = estadisticas[claveGeo] || estadisticas[props.id] || 0;

    layer.bindPopup(`
      <div style="font-family: sans-serif;">
        <h4 style="margin: 0 0 5px 0; color: #741b2a;">${nombre}</h4>
        <p style="margin: 3px 0; font-size: 12px;"><strong>Clave / ID:</strong> ${claveGeo}</p>
        <p style="margin: 3px 0; font-size: 12px;">
          <strong>${criterio.toUpperCase().replace(/_/g, ' ')}:</strong> ${valor > 0 ? valor.toLocaleString() : 'Sin registros'}
        </p>
      </div>
    `);

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ weight: 3, color: '#741b2a', fillOpacity: 0.95 });
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(getStyle(feature));
      }
    });
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* Selector de Indicadores */}
      <div style={{ 
        marginBottom: '15px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#f9f6f0',
        padding: '12px 20px',
        borderRadius: '8px',
        borderLeft: '5px solid #741b2a'
      }}>
        <label style={{ fontWeight: 'bold', color: '#741b2a' }}>
          Filtrar Indicador Territorial: {cargando && <span style={{ fontSize: '12px', color: '#888' }}>(Cargando datos...)</span>}
        </label>
        
        <select 
          value={criterio} 
          onChange={(e) => setCriterio(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <option value="pob_sin_salud">Población Sin Servicios de Salud</option>
          <option value="internet">Viviendas con Cobertura de Internet</option>
          <option value="poblacion">Población Total por AGEB</option>
          <option value="escolaridad">Grado Promedio de Escolaridad</option>
        </select>
      </div>

      {/* Contenedor Principal del Mapa */}
      <div style={{ 
        height: '600px', 
        width: '100%', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        backgroundColor: '#e5e3df',
        position: 'relative'
      }}>
        
        {/* Leyenda en la esquina inferior derecha */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '10px 15px',
          borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '12px',
          fontFamily: 'sans-serif'
        }}>
          <strong style={{ color: '#741b2a', display: 'block', marginBottom: '5px' }}>Simbología Territorial</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: criterio === 'internet' ? '#27ae60' : '#741b2a', borderRadius: '2px' }}></span>
            <span>Nivel Alto / Prioritario</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#e67e22', borderRadius: '2px' }}></span>
            <span>Nivel Medio</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: criterio === 'internet' ? '#c0392b' : '#27ae60', borderRadius: '2px' }}></span>
            <span>Nivel Bajo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #ddd' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#b0bec5', borderRadius: '2px' }}></span>
            <span>Sin datos / Sin evaluar</span>
          </div>
        </div>

        <MapContainer 
          center={centroTuxtla} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <AutoResizeMap />

          <TileLayer
            attribution='&copy; Ayuntamiento de Tuxtla Gutiérrez | S E D'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Dibuja los Polígonos GeoJSON cuando están cargados */}
          {geoData && (
            <GeoJSON 
              key={`${criterio}-${Object.keys(estadisticas).length}`} 
              data={geoData} 
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}

        </MapContainer>
      </div>
    </div>
  );
};

export default MapaInteractivo;