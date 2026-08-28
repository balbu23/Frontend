import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Función para normalizar cadenas (quita tildes, espacios extra y convierte a minúsculas)
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

function AjustarTamanoMapa({ bounds }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
    return () => clearTimeout(timer);
  }, [bounds, map]);
  return null;
}

export default function MapaSED() {
  const [geoData, setGeoData] = useState(null);
  const [datosDB, setDatosDB] = useState({});
  const [coloniaSeleccionada, setColoniaSeleccionada] = useState('');
  const [coloniaComparar, setColoniaComparar] = useState('');
  const [verColonias, setVerColonias] = useState(true);
  const [mapaCalorActivo, setMapaCalorActivo] = useState(false);
  const [modalGrafica, setModalGrafica] = useState(false);
  const [graficaMetrica, setGraficaMetrica] = useState('salud');
  const [panelAbierto, setPanelAbierto] = useState(true);

  // Referencias para manipular las capas de GeoJSON directamente
  const geoJsonLayerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`/tuxtla_poblacion_corregido.geojson?v=${Date.now()}`).then((res) => res.json()),
      fetch('http://localhost:8000/api/colonias_tuxtla').then((res) => res.json())
    ])
      .then(([geo, dbRows]) => {
        setGeoData(geo);

        const acumulado = {};
        const toNum = (val) => {
          const n = Number(val);
          return isNaN(n) ? 0 : n;
        };

        dbRows.forEach((item) => {
          if (!item.colonia_o_sector) return;
          const key = normalizarTexto(item.colonia_o_sector);

          if (!acumulado[key]) {
            acumulado[key] = {
              nombreOriginal: item.colonia_o_sector.trim(),
              poblacion_total: 0,
              pob_ocupada: 0,
              pob_imss: 0,
              pob_issste: 0,
              pob_sin_salud: 0,
              viv_con_agua: 0,
              viv_con_drenaje: 0,
              viv_con_cisterna: 0,
              viv_con_auto: 0,
              viv_con_moto: 0
            };
          }

          const c = acumulado[key];
          c.poblacion_total += toNum(item.poblacion_total || item.pob_total || item.pobtot);
          c.pob_ocupada += toNum(item.pob_ocupada || item.pob_trabaja || item.pea_ocupada || item.pea || item.pob_econ_activa);
          c.pob_imss += toNum(item.pob_imss || item.imss || item.psinder_imss);
          c.pob_issste += toNum(item.pob_issste || item.issste || item.psinder_issste);
          c.pob_sin_salud += toNum(item.pob_sin_salud || item.sin_salud || item.psinder_seap);
          c.viv_con_agua += toNum(item.viv_con_agua || item.agua_entubada || item.vph_aguavd || item.vph_aguav || item.viv_agua);
          c.viv_con_drenaje += toNum(item.viv_con_drenaje || item.drenaje || item.vph_drenaj || item.viv_drenaje);
          c.viv_con_cisterna += toNum(item.viv_con_cisterna || item.cisterna || item.tinaco_cisterna || item.vph_cist || item.vph_tinaco);
          c.viv_con_auto += toNum(item.viv_con_auto || item.auto || item.vph_autom);
          c.viv_con_moto += toNum(item.viv_con_moto || item.moto || item.vph_moto);
        });

        setDatosDB(acumulado);
      })
      .catch((err) => console.error('Error cargando recursos:', err));
  }, []);

  const listaColonias = useMemo(() => {
    if (!geoData?.features) return [];
    const setN = new Set();
    geoData.features.forEach((f) => {
      if (f.properties?.colonia_final) setN.add(f.properties.colonia_final);
    });
    return Array.from(setN).sort();
  }, [geoData]);

  const featuresParaPintar = useMemo(() => {
    if (!geoData || !verColonias) return [];
    if (coloniaSeleccionada || coloniaComparar) {
      const normSel = normalizarTexto(coloniaSeleccionada);
      const normComp = normalizarTexto(coloniaComparar);
      return geoData.features.filter((f) => {
        const nombre = normalizarTexto(f.properties?.colonia_final);
        return nombre === normSel || (normComp && nombre === normComp);
      });
    }
    return geoData.features;
  }, [geoData, coloniaSeleccionada, coloniaComparar, verColonias]);

  const boundsSeleccionado = useMemo(() => {
    if ((!coloniaSeleccionada && !coloniaComparar) || featuresParaPintar.length === 0) return null;
    try {
      return L.geoJSON({ type: 'FeatureCollection', features: featuresParaPintar }).getBounds();
    } catch {
      return null;
    }
  }, [coloniaSeleccionada, coloniaComparar, featuresParaPintar]);

  const infoColoniaA = useMemo(() => {
    if (!coloniaSeleccionada) return null;
    return datosDB[normalizarTexto(coloniaSeleccionada)] || null;
  }, [coloniaSeleccionada, datosDB]);

  const infoColoniaB = useMemo(() => {
    if (!coloniaComparar) return null;
    return datosDB[normalizarTexto(coloniaComparar)] || null;
  }, [coloniaComparar, datosDB]);

  // Apertura automática de Popups y Tooltips al cambiar la selección en los controles
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;

    const normSel = normalizarTexto(coloniaSeleccionada);
    const normComp = normalizarTexto(coloniaComparar);

    geoJsonLayerRef.current.eachLayer((layer) => {
      const nombreLayer = normalizarTexto(layer.feature?.properties?.colonia_final);

      if (nombreLayer && (nombreLayer === normSel || (normComp && nombreLayer === normComp))) {
        if (layer.openTooltip) layer.openTooltip();
        if (nombreLayer === normSel && layer.openPopup) {
          layer.openPopup();
        }
      }
    });
  }, [coloniaSeleccionada, coloniaComparar, featuresParaPintar]);

  const datosGraficaModal = useMemo(() => {
    if (!infoColoniaA) return [];
    const colA = infoColoniaA;
    const colB = infoColoniaB || {};

    switch (graficaMetrica) {
      case 'salud':
        return [
          { name: 'IMSS', [coloniaSeleccionada || 'Colonia A']: colA.pob_imss, ...(coloniaComparar ? { [coloniaComparar]: colB.pob_imss || 0 } : {}) },
          { name: 'ISSSTE', [coloniaSeleccionada || 'Colonia A']: colA.pob_issste, ...(coloniaComparar ? { [coloniaComparar]: colB.pob_issste || 0 } : {}) },
          { name: 'Sin cobertura', [coloniaSeleccionada || 'Colonia A']: colA.pob_sin_salud, ...(coloniaComparar ? { [coloniaComparar]: colB.pob_sin_salud || 0 } : {}) }
        ];
      case 'empleo':
        return [
          { name: 'Población ocupada', [coloniaSeleccionada || 'Colonia A']: colA.pob_ocupada, ...(coloniaComparar ? { [coloniaComparar]: colB.pob_ocupada || 0 } : {}) },
          { name: 'Población no ocupada', [coloniaSeleccionada || 'Colonia A']: Math.max(0, colA.poblacion_total - colA.pob_ocupada), ...(coloniaComparar ? { [coloniaComparar]: Math.max(0, (colB.poblacion_total || 0) - (colB.pob_ocupada || 0)) } : {}) }
        ];
      case 'servicios':
        return [
          { name: 'Agua entubada', [coloniaSeleccionada || 'Colonia A']: colA.viv_con_agua, ...(coloniaComparar ? { [coloniaComparar]: colB.viv_con_agua || 0 } : {}) },
          { name: 'Drenaje', [coloniaSeleccionada || 'Colonia A']: colA.viv_con_drenaje, ...(coloniaComparar ? { [coloniaComparar]: colB.viv_con_drenaje || 0 } : {}) },
          { name: 'Cisterna / Tinaco', [coloniaSeleccionada || 'Colonia A']: colA.viv_con_cisterna, ...(coloniaComparar ? { [coloniaComparar]: colB.viv_con_cisterna || 0 } : {}) }
        ];
      case 'movilidad':
        return [
          { name: 'Automóvil', [coloniaSeleccionada || 'Colonia A']: colA.viv_con_auto, ...(coloniaComparar ? { [coloniaComparar]: colB.viv_con_auto || 0 } : {}) },
          { name: 'Motocicleta', [coloniaSeleccionada || 'Colonia A']: colA.viv_con_moto, ...(coloniaComparar ? { [coloniaComparar]: colB.viv_con_moto || 0 } : {}) }
        ];
      default:
        return [];
    }
  }, [infoColoniaA, infoColoniaB, coloniaSeleccionada, coloniaComparar, graficaMetrica]);

  const getColorCalor = (pob) => {
    return pob > 8000 ? '#7f1d1d' : pob > 5000 ? '#b91c1c' : pob > 3000 ? '#c2410c' : pob > 1000 ? '#f59e0b' : '#fbbf24';
  };

  const estiloPoligono = (f) => {
    const nombreNorm = normalizarTexto(f.properties?.colonia_final);
    const esColA = nombreNorm === normalizarTexto(coloniaSeleccionada);
    const esColB = nombreNorm === normalizarTexto(coloniaComparar);
    const pob = datosDB[nombreNorm]?.poblacion_total || 0;

    if (mapaCalorActivo) {
      return { color: '#ffffff', weight: 0.8, fillColor: getColorCalor(pob), fillOpacity: 0.7 };
    }

    if (esColA) {
      return { color: '#1e3a8a', weight: 3, fillColor: '#2563eb', fillOpacity: 0.45 };
    }
    if (esColB) {
      return { color: '#065f46', weight: 3, fillColor: '#059669', fillOpacity: 0.45 };
    }

    return {
      color: '#94a3b8',
      weight: 1,
      fillColor: '#cbd5e1',
      fillOpacity: 0.1
    };
  };

  const onEachFeature = (feature, layer) => {
    const nombreOriginal = feature.properties?.colonia_final;
    const nombreNorm = normalizarTexto(nombreOriginal);
    const normSel = normalizarTexto(coloniaSeleccionada);
    const normComp = normalizarTexto(coloniaComparar);

    if (nombreOriginal && (nombreNorm === normSel || nombreNorm === normComp)) {
      layer.bindTooltip(nombreOriginal, {
        permanent: true,
        direction: 'center',
        className: 'label-colonia-mapa'
      });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', overflow: 'hidden' }}>
      <style>{`
        .label-colonia-mapa {
          background: #ffffff !important;
          border: 1px solid #0f172a !important;
          color: #0f172a !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          padding: 3px 8px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
      `}</style>

      <button
        onClick={() => setPanelAbierto(!panelAbierto)}
        style={{
          position: 'absolute',
          top: '12px',
          left: panelAbierto ? '350px' : '12px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '6px 10px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          transition: 'left 0.3s ease'
        }}
      >
        {panelAbierto ? '◀' : '▶'}
      </button>

      {/* PANEL ESTRUCTURAL */}
      <div
        style={{
          width: '340px',
          minWidth: '340px',
          marginLeft: panelAbierto ? '0' : '-340px',
          transition: 'margin-left 0.3s ease',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '16px',
          zIndex: 10,
          overflowY: 'auto'
        }}
      >
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
              Selección principal
            </label>
            {coloniaSeleccionada && (
              <button 
                onClick={() => { setColoniaSeleccionada(''); setColoniaComparar(''); }}
                style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Ver todas
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            <input
              type="text"
              list="colonias-list"
              placeholder="Ej. San Pedro Progresivo"
              value={coloniaSeleccionada}
              onChange={(e) => setColoniaSeleccionada(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            {coloniaSeleccionada && (
              <button onClick={() => setColoniaSeleccionada('')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0 8px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            )}
          </div>

          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Comparar con (opcional)
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              list="colonias-list"
              placeholder="Ej. Burocrática"
              value={coloniaComparar}
              onChange={(e) => setColoniaComparar(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            {coloniaComparar && (
              <button onClick={() => setColoniaComparar('')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0 8px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            )}
          </div>

          <datalist id="colonias-list">
            {listaColonias.map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Capas de referencia</h4>
          <label style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={verColonias} onChange={(e) => setVerColonias(e.target.checked)} />
            Mostrar límites territoriales
          </label>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Visualización de datos</h4>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>Activar mapa de calor</span>
            <input
              type="checkbox"
              checked={mapaCalorActivo}
              onChange={(e) => setMapaCalorActivo(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>

          <button
            disabled={!coloniaSeleccionada}
            onClick={() => setModalGrafica(true)}
            style={{
              width: '100%',
              padding: '9px',
              background: coloniaSeleccionada ? '#1e3a8a' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: coloniaSeleccionada ? 'pointer' : 'not-allowed'
            }}
          >
            {coloniaComparar ? 'Ver análisis comparativo' : 'Ver gráficas e indicadores'}
          </button>
        </div>
      </div>

      {/* MAPA */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <MapContainer center={[16.7528, -93.1164]} zoom={13} zoomControl={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <AjustarTamanoMapa bounds={boundsSeleccionado} />

          {featuresParaPintar.length > 0 && (
            <GeoJSON
              ref={geoJsonLayerRef}
              key={(coloniaSeleccionada || '') + (coloniaComparar || '') + (mapaCalorActivo ? '-calor' : '-normal')}
              data={{ type: 'FeatureCollection', features: featuresParaPintar }}
              style={estiloPoligono}
              onEachFeature={onEachFeature}
            >
              {coloniaSeleccionada && infoColoniaA && (
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <b style={{ color: '#1e3a8a' }}>{coloniaSeleccionada}</b><br/>
                    Población total: <b>{infoColoniaA.poblacion_total.toLocaleString()}</b>
                  </div>
                </Popup>
              )}
            </GeoJSON>
          )}
        </MapContainer>
      </div>

      {/* MODAL DE ANÁLISIS */}
      {modalGrafica && infoColoniaA && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', width: '560px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>
                  {coloniaComparar ? `Comparativa: ${coloniaSeleccionada} vs ${coloniaComparar}` : `Indicadores: ${coloniaSeleccionada}`}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Información estadística censal por categoría</span>
              </div>
              <button onClick={() => setModalGrafica(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', color: '#475569' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f8fafc', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {[
                { id: 'salud', label: 'Salud' },
                { id: 'empleo', label: 'Empleo' },
                { id: 'servicios', label: 'Servicios' },
                { id: 'movilidad', label: 'Movilidad' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setGraficaMetrica(btn.id)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: graficaMetrica === btn.id ? '#ffffff' : 'transparent',
                    color: graficaMetrica === btn.id ? '#1e3a8a' : '#64748b',
                    boxShadow: graficaMetrica === btn.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficaModal} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                  {coloniaComparar && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
                  <Bar dataKey={coloniaSeleccionada || 'Colonia A'} fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                  {coloniaComparar && (
                    <Bar dataKey={coloniaComparar} fill="#059669" radius={[3, 3, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}