import React, { useEffect, useState, useMemo, useRef } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl/mapbox';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFsYnUyMyIsImEiOiJjbXRpYmN6d3cxcGo2Mndwd2hmNmNhYWd1In0.yxIFK2DWOj8pFz8TvuyCjg';

const PALETTE = {
  primaryBlue: '#2563eb',
  navyTitle: '#1e293b',
  navyLabel: '#475569',
  piramideHombres: '#1e3a8a',
  piramideMujeres: '#059669',
  borderLight: '#e2e8f0',
};

// 1. Limpieza estándar para comparaciones de texto
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\-.,]/g, ' ')
    .replace(/\s+/g, ' ');
};

// 2. Extrae el nombre de la colonia principal eliminando sectores, números y palabras secundarias
const obtenerColoniaPrincipal = (texto) => {
  if (!texto) return '';
  let limpio = texto.toString().split('(')[0];
  limpio = normalizarTexto(limpio);

  return limpio
    .replace(/\b(sector|seccion|etapa|fracc|fraccionamiento|zona|oriente|poniente|sur|norte|centro)\s*\d*\b/gi, '')
    .replace(/\b(i|ii|iii|iv|v|vi|1|2|3|4|5|6|7|8|9)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatearEtiqueta = (textoOriginal) => {
  if (!textoOriginal) return 'Sin colonia';
  const texto = String(textoOriginal).trim();
  if (texto.includes('(')) {
    return texto.replace('(', '- (');
  }
  return `${texto} - (CENTRO)`;
};

export default function MapaInteractivo() {
  const mapRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [datosDB, setDatosDB] = useState({});
  const [coloniaSeleccionada, setColoniaSeleccionada] = useState('');
  const [coloniaComparar, setColoniaComparar] = useState('');
  const [verColonias, setVerColonias] = useState(true);
  const [mapaCalorActivo, setMapaCalorActivo] = useState(false);
  const [modalGrafica, setModalGrafica] = useState(false);
  const [graficaMetrica, setGraficaMetrica] = useState('salud');
  const [panelAbierto, setPanelAbierto] = useState(true);

  const [modalPerfilPoblacional, setModalPerfilPoblacional] = useState(false);
  const [vistaPiramide, setVistaPiramide] = useState('colA');
  const [tipoGraficaPerfil, setTipoGraficaPerfil] = useState('barras');
  const [mostrarCuadroEdades, setMostrarCuadroEdades] = useState(false);
  
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`/tuxtla_completo_100percent.geojson?v=${Date.now()}`).then((res) => res.json()),
      fetch('http://localhost:8000/api/colonias_tuxtla').then((res) => res.json())
    ])
    .then(([geo, dbResponse, sectoresData]) => {
      const mapaSectoresByAgeb = {};
      const mapaSectoresByNombre = {};

      if (Array.isArray(sectoresData)) {
        sectoresData.forEach((item) => {
          const rawAgeb = item.codigoageb ? String(item.codigoageb).trim() : (item.codigo_ageb ? String(item.codigo_ageb).trim() : '');
          const rawNombre = item.colonia ? String(item.colonia).trim() : (item.colonia_o_sector ? String(item.colonia_o_sector).trim() : '');

          if (rawAgeb) {
            mapaSectoresByAgeb[rawAgeb] = formatearEtiqueta(rawNombre);
          }
          if (rawNombre) {
            const nombreLimpio = normalizarTexto(rawNombre.split('(')[0]);
            mapaSectoresByNombre[nombreLimpio] = formatearEtiqueta(rawNombre);
          }
        });
      }

      const dbRows = Array.isArray(dbResponse) 
        ? dbResponse 
        : (dbResponse.data || dbResponse.colonias || []);

      const acumulado = {};
      const toNum = (val) => {
        if (val === null || val === undefined) return 0;
        const n = Number(val);
        return isNaN(n) ? 0 : n;
      };

      const qKeys = [
        { rango: '00-04', f: 'pob_0a4_f', m: 'pob_0a4_m' },
        { rango: '05-09', f: 'pob_5a9_f', m: 'pob_5a9_m' },
        { rango: '10-14', f: 'pob_10a14_f', m: 'pob_10a14_m' },
        { rango: '15-19', f: 'pob_15a19_f', m: 'pob_15a19_m' },
        { rango: '20-24', f: 'pob_20a24_f', m: 'pob_20a24_m' },
        { rango: '25-59', f: 'pob_25a59_f', m: 'pob_25a59_m' },
        { rango: '60+',   f: 'pob_60ymas_f_y', m: 'pob_60ymas_m_y' }
      ];

      // Agrupar base de datos censal por Colonia Principal
      dbRows.forEach((item) => {
        const colNombre = item.colonia || item.colonia_unificada || item.colonia_final || item.colonia_o_sector;
        if (!colNombre) return;

        const key = obtenerColoniaPrincipal(colNombre);
        if (!key) return;

        const agebCode = item.codigoageb || item.codigo_ageb || item.CVE_AGEB || item.codigo_ageb_id || '';
        const nombreFormateado = key.replace(/\b\w/g, l => l.toUpperCase());

        if (!acumulado[key]) {
          acumulado[key] = {
            nombreOriginal: nombreFormateado,
            codigo_ageb: agebCode ? String(agebCode).trim() : '',
            poblacion_total: 0,
            pob_hombres: 0,
            pob_mujeres: 0,
            pob_ocupada: 0,
            pob_no_ocupada: 0,
            pob_no_trabaja_inactiva: 0,
            pob_imss: 0,
            pob_issste: 0,
            pob_sin_salud: 0,
            viviendas_habitadas: 0,
            viv_con_agua_entubada: 0,
            viv_con_drenaje: 0,
            viv_telefono_fijo: 0,
            viv_con_cisterna: 0,
            viv_con_internet: 0,
            viv_con_celular: 0,
            viv_con_auto: 0,
            viv_con_moto: 0,
            viv_con_bici: 0,
            secundaria_completa: 0,
            educacion_superior: 0,
            grado_promedio_escolaridad: 0,
            suma_escolaridad_ponderada: 0,
            poblacion_con_escolaridad: 0,
            quinquenios: {
              '00-04': { hombres: 0, mujeres: 0 },
              '05-09': { hombres: 0, mujeres: 0 },
              '10-14': { hombres: 0, mujeres: 0 },
              '15-19': { hombres: 0, mujeres: 0 },
              '20-24': { hombres: 0, mujeres: 0 },
              '25-59': { hombres: 0, mujeres: 0 },
              '60+':   { hombres: 0, mujeres: 0 }
            }
          };
        }

        const c = acumulado[key];
        const pobItem = toNum(item.poblacion_total);

        c.poblacion_total += pobItem;
        c.pob_ocupada += toNum(item.poblacion_ocupada);
        c.pob_no_ocupada += toNum(item.poblacion_desocupada);
        c.pob_no_trabaja_inactiva += toNum(item.poblacion_no_trabaja);
        c.pob_imss += toNum(item.poblacion_imss);
        c.pob_issste += toNum(item.poblacion_issste);
        c.pob_sin_salud += toNum(item.poblacion_sin_salud);
        c.viviendas_habitadas += toNum(item.viviendas_habitadas);
        c.viv_con_agua_entubada += toNum(item.viv_con_agua_entubada);
        c.viv_con_drenaje += toNum(item.viv_con_drenaje);
        c.viv_con_cisterna += toNum(item.viv_con_cisterna);
        c.viv_con_internet += toNum(item.viv_con_internet);
        c.viv_con_celular += toNum(item.viv_con_celular);
        c.viv_telefono_fijo += toNum(item.viv_con_telefono_fijo);
        c.viv_con_auto += toNum(item.viv_con_auto);
        c.viv_con_moto += toNum(item.viv_con_moto);
        c.viv_con_bici += toNum(item.viv_con_bici);
        c.secundaria_completa += toNum(item.secundaria_completa);
        c.educacion_superior += toNum(item.educacion_superior);

        qKeys.forEach(({ rango, f, m }) => {
          const valF = toNum(item[f]);
          const valM = toNum(item[m]);
          c.quinquenios[rango].mujeres += valF;
          c.quinquenios[rango].hombres += valM;
          c.pob_mujeres += valF;
          c.pob_hombres += valM;
        });

        const gradoVal = toNum(item.grado_promedio_escolaridad);
        if (gradoVal > 0 && pobItem > 0) {
          c.suma_escolaridad_ponderada += (gradoVal * pobItem);
          c.poblacion_con_escolaridad += pobItem;
        }
      });

      Object.values(acumulado).forEach((col) => {
        col.grado_promedio_escolaridad = col.poblacion_con_escolaridad > 0
          ? Number((col.suma_escolaridad_ponderada / col.poblacion_con_escolaridad).toFixed(2))
          : 0;
      });

      // Procesamiento de GeoJSON vinculando sectores por Colonia Principal
      if (geo && geo.features) {
        geo.features = geo.features.filter(f => {
          const props = f.properties || {};
          const nombreCol = normalizarTexto(props.colonia_o_sector || props.colonia_unificada || props.colonia || props.colonia_final || props.NAME || '');
          const esMunicipio = nombreCol === 'tuxtla gutierrez' || nombreCol === 'municipio' || nombreCol === '' || nombreCol === 'tuxtla gutierrez cabecera';
          return !esMunicipio;
        });

        geo.features.forEach(f => {
          const props = f.properties || {};
          const nombreCol = props.colonia_o_sector || props.colonia_unificada || props.colonia || props.colonia_final || props.NAME || '';
          const norm = normalizarTexto(nombreCol);
          const normBase = obtenerColoniaPrincipal(nombreCol);
          const agebGeo = String(props.codigoageb || props.codigo_ageb || props.CVE_AGEB || props.ageb || '').trim();

          const etiquetaSector = mapaSectoresByAgeb[agebGeo] || mapaSectoresByNombre[norm] || formatearEtiqueta(nombreCol);
          
          f.properties.poblacion_calc = acumulado[normBase]?.poblacion_total || f.properties?.poblacion_total || 0;
          f.properties.norm_name = norm;
          f.properties.norm_base = normBase;
          f.properties.nombre_raw = nombreCol;
          f.properties.ageb_clean = agebGeo;
          f.properties.etiqueta_sector = etiquetaSector;
        });
      }

      setGeoData(geo);
      setDatosDB(acumulado);
    })
    .catch((err) => console.error('Error cargando recursos:', err));
  }, []);

  const listaColonias = useMemo(() => {
    if (!geoData?.features) return [];
    const setN = new Set();
    geoData.features.forEach((f) => {
      const props = f.properties || {};
      const nombre = props.colonia_o_sector || props.colonia_unificada || props.colonia || props.colonia_final || props.nombre_raw;
      if (nombre) {
        const baseLimpia = obtenerColoniaPrincipal(nombre);
        if (baseLimpia) {
          const nombreCapitalizado = baseLimpia.replace(/\b\w/g, l => l.toUpperCase());
          setN.add(nombreCapitalizado);
        }
      }
    });
    return Array.from(setN).sort();
  }, [geoData]);

  const geoJsonCompleto = useMemo(() => {
    if (!geoData || !verColonias) return { type: 'FeatureCollection', features: [] };
    return geoData;
  }, [geoData, verColonias]);

  // Encuadre global (Bounding Box) de todos los sectores agrupados por colonia principal
  const centroPopup = useMemo(() => {
    if (!coloniaSeleccionada || !geoData?.features) return null;

    const selLimpia = obtenerColoniaPrincipal(coloniaSeleccionada);

    const sectoresEncontrados = geoData.features.filter((f) => {
      const baseGeo = f.properties?.norm_base || obtenerColoniaPrincipal(f.properties?.colonia_o_sector || '');
      return baseGeo === selLimpia || baseGeo.includes(selLimpia) || selLimpia.includes(baseGeo);
    });

    if (sectoresEncontrados.length === 0) return null;

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    const extractCoords = (coords) => {
      coords.forEach((c) => {
        if (typeof c[0] === 'number') {
          const [lng, lat] = c;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        } else {
          extractCoords(c);
        }
      });
    };

    sectoresEncontrados.forEach((f) => extractCoords(f.geometry.coordinates));

    if (minLng === Infinity || maxLng === -Infinity) return null;

    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      bounds: [[minLng, minLat], [maxLng, maxLat]]
    };
  }, [coloniaSeleccionada, geoData]);

  useEffect(() => {
    if (centroPopup?.bounds && mapRef.current) {
      mapRef.current.fitBounds(centroPopup.bounds, {
        padding: 60,
        duration: 1500,
        maxZoom: 16
      });
    }
  }, [centroPopup]);

  const infoColoniaA = useMemo(() => {
    if (!coloniaSeleccionada) return null;
    const normBase = obtenerColoniaPrincipal(coloniaSeleccionada);
    return datosDB[normBase] || null;
  }, [coloniaSeleccionada, datosDB]);

  const infoColoniaB = useMemo(() => {
    if (!coloniaComparar) return null;
    const normBase = obtenerColoniaPrincipal(coloniaComparar);
    return datosDB[normBase] || null;
  }, [coloniaComparar, datosDB]);

  const datosPiramideDemografica = useMemo(() => {
    const rangos = ['60+', '25-59', '20-24', '15-19', '10-14', '05-09', '00-04'];
    const infoActiva = vistaPiramide === 'colA' ? infoColoniaA : (infoColoniaB || infoColoniaA);
    const pobTotal = infoActiva?.poblacion_total || 1;
    let maxValor = 0;

    const data = rangos.map((rango) => {
      const h = infoActiva?.quinquenios?.[rango]?.hombres || 0;
      const m = infoActiva?.quinquenios?.[rango]?.mujeres || 0;

      if (h > maxValor) maxValor = h;
      if (m > maxValor) maxValor = m;

      return {
        rango,
        mujeres: -Math.abs(m),
        hombres: Math.abs(h),
        valM: Math.abs(m),
        valH: Math.abs(h),
        pctM: ((Math.abs(m) / pobTotal) * 100).toFixed(1),
        pctH: ((Math.abs(h) / pobTotal) * 100).toFixed(1)
      };
    });

    return { data, maxValor: Math.ceil((maxValor || 1) * 1.25) };
  }, [infoColoniaA, infoColoniaB, vistaPiramide]);

  const datosLineasComparativo = useMemo(() => {
    const rangos = ['00-04', '05-09', '10-14', '15-19', '20-24', '25-59', '60+'];
    return rangos.map((rango) => {
      const colA_H = infoColoniaA?.quinquenios?.[rango]?.hombres || 0;
      const colA_M = infoColoniaA?.quinquenios?.[rango]?.mujeres || 0;
      const totalColA = colA_H + colA_M;

      const colB_H = infoColoniaB?.quinquenios?.[rango]?.hombres || 0;
      const colB_M = infoColoniaB?.quinquenios?.[rango]?.mujeres || 0;
      const totalColB = colB_H + colB_M;

      return {
        rango,
        [infoColoniaA?.nombreOriginal || 'Colonia A']: totalColA,
        [infoColoniaB?.nombreOriginal || 'Colonia B']: totalColB
      };
    });
  }, [infoColoniaA, infoColoniaB]);

  const analisisDemografico = useMemo(() => {
    const infoActiva = vistaPiramide === 'colA' ? infoColoniaA : (infoColoniaB || infoColoniaA);
    if (!infoActiva) return null;

    const rangos = ['00-04', '05-09', '10-14', '15-19', '20-24', '25-59', '60+'];
    let mayorRango = '00-04';
    let maxSuma = 0;

    rangos.forEach((rango) => {
      const h = infoActiva.quinquenios?.[rango]?.hombres || 0;
      const m = infoActiva.quinquenios?.[rango]?.mujeres || 0;
      const suma = h + m;
      if (suma > maxSuma) {
        maxSuma = suma;
        mayorRango = rango;
      }
    });

    const pobTotal = infoActiva.poblacion_total || 0;
    const pctMayorRango = pobTotal > 0 ? ((maxSuma / pobTotal) * 100).toFixed(1) : 0;

    return {
      nombre: infoActiva.nombreOriginal,
      pobTotal,
      rangoDominante: mayorRango,
      maxSuma,
      pctMayorRango
    };
  }, [infoColoniaA, infoColoniaB, vistaPiramide]);

  const datosModalGrafica = useMemo(() => {
    if (!infoColoniaA) return [];
    
    const metricaMap = {
      salud: [
        { nombre: 'IMSS', colA: infoColoniaA.pob_imss || 0, colB: infoColoniaB?.pob_imss || 0 },
        { nombre: 'ISSSTE', colA: infoColoniaA.pob_issste || 0, colB: infoColoniaB?.pob_issste || 0 },
        { nombre: 'Sin salud', colA: infoColoniaA.pob_sin_salud || 0, colB: infoColoniaB?.pob_sin_salud || 0 }
      ],
      empleo: [
        { nombre: 'Ocupados', colA: infoColoniaA.pob_ocupada || 0, colB: infoColoniaB?.pob_ocupada || 0 },
        { nombre: 'Desocupados', colA: infoColoniaA.pob_no_ocupada || 0, colB: infoColoniaB?.pob_no_ocupada || 0 },
        { nombre: 'Inactivos', colA: infoColoniaA.pob_no_trabaja_inactiva || 0, colB: infoColoniaB?.pob_no_trabaja_inactiva || 0 }
      ],
      servicios: [
        { nombre: 'Agua entubada', colA: infoColoniaA.viv_con_agua_entubada || 0, colB: infoColoniaB?.viv_con_agua_entubada || 0 },
        { nombre: 'Drenaje', colA: infoColoniaA.viv_con_drenaje || 0, colB: infoColoniaB?.viv_con_drenaje || 0 },
        { nombre: 'Cisterna', colA: infoColoniaA.viv_con_cisterna || 0, colB: infoColoniaB?.viv_con_cisterna || 0 }
      ],
      conectividad: [
        { nombre: 'Internet', colA: infoColoniaA.viv_con_internet || 0, colB: infoColoniaB?.viv_con_internet || 0 },
        { nombre: 'Celular', colA: infoColoniaA.viv_con_celular || 0, colB: infoColoniaB?.viv_con_celular || 0 },
        { nombre: 'Teléfono Fijo', colA: infoColoniaA.viv_telefono_fijo || 0, colB: infoColoniaB?.viv_telefono_fijo || 0 }
      ],
      educacion: [
        { nombre: 'Secundaria Completa', colA: infoColoniaA.secundaria_completa || 0, colB: infoColoniaB?.secundaria_completa || 0 },
        { nombre: 'Educación Superior', colA: infoColoniaA.educacion_superior || 0, colB: infoColoniaB?.educacion_superior || 0 }
      ],
      movilidad: [
        { nombre: 'Automóvil', colA: infoColoniaA.viv_con_auto || 0, colB: infoColoniaB?.viv_con_auto || 0 },
        { nombre: 'Motocicleta', colA: infoColoniaA.viv_con_moto || 0, colB: infoColoniaB?.viv_con_moto || 0 },
        { nombre: 'Bicicleta', colA: infoColoniaA.viv_con_bici || 0, colB: infoColoniaB?.viv_con_bici || 0 }
      ]
    };

    return metricaMap[graficaMetrica] || [];
  }, [infoColoniaA, infoColoniaB, graficaMetrica]);

  // Estilos visuales del mapa ajustados para abarcar todos los sectores pertenecientes a la colonia base
  const layerFillStyle = useMemo(() => {
    const selLimpia = obtenerColoniaPrincipal(coloniaSeleccionada);
    const compLimpia = obtenerColoniaPrincipal(coloniaComparar);

    let fillColorExpr;
    let opacityExpr;

    if (mapaCalorActivo) {
      fillColorExpr = [
        'interpolate', ['linear'], ['get', 'poblacion_calc'],
        0, '#fbbf24',
        1000, '#f59e0b',
        3000, '#c2410c',
        5000, '#b91c1c',
        8000, '#7f1d1d'
      ];
      opacityExpr = 0.6;
    } else if (selLimpia || compLimpia) {
      fillColorExpr = [
        'case',
        ['==', ['get', 'norm_base'], selLimpia], '#ef4444',
        ['==', ['get', 'norm_base'], compLimpia], '#10b981',
        '#cbd5e1'
      ];
      opacityExpr = [
        'case',
        ['==', ['get', 'norm_base'], selLimpia], 0.65,
        ['==', ['get', 'norm_base'], compLimpia], 0.65,
        0.15
      ];
    } else {
      fillColorExpr = '#2563eb';
      opacityExpr = 0.2;
    }

    return {
      id: 'colonias-fill',
      type: 'fill',
      paint: {
        'fill-color': fillColorExpr,
        'fill-opacity': opacityExpr
      }
    };
  }, [mapaCalorActivo, coloniaSeleccionada, coloniaComparar]);

  const layerLineStyle = useMemo(() => {
    const selLimpia = obtenerColoniaPrincipal(coloniaSeleccionada);
    const compLimpia = obtenerColoniaPrincipal(coloniaComparar);

    return {
      id: 'colonias-line',
      type: 'line',
      paint: {
        'line-color': (selLimpia || compLimpia)
          ? [
              'case',
              ['==', ['get', 'norm_base'], selLimpia], '#dc2626',
              ['==', ['get', 'norm_base'], compLimpia], '#047857',
              '#94a3b8'
            ]
          : '#2563eb',
        'line-width': (selLimpia || compLimpia)
          ? [
              'case',
              ['==', ['get', 'norm_base'], selLimpia], 2.5,
              ['==', ['get', 'norm_base'], compLimpia], 2.5,
              0.5
            ]
          : 1,
        'line-opacity': 0.85
      }
    };
  }, [coloniaSeleccionada, coloniaComparar]);

  const onHover = (event) => {
    const { features, point } = event;
    const featureHover = features && features[0];

    if (featureHover) {
      const etiquetaSector = featureHover.properties?.etiqueta_sector || featureHover.properties?.colonia_o_sector || featureHover.properties?.colonia;
      setHoverInfo({
        x: point.x,
        y: point.y,
        feature: featureHover,
        etiquetaSector
      });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      
      <button
        onClick={() => setPanelAbierto(!panelAbierto)}
        style={{
          position: 'absolute',
          top: '120px',
          left: panelAbierto ? '350px' : '12px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '6px 10px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          transition: 'left 0.3s ease'
        }}
      >
        {panelAbierto ? '◀' : '▶'}
      </button>

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
              placeholder="Ej. Vida Mejor"
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

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>ACCESOS RÁPIDOS</h4>
          
          <button
            disabled={!coloniaSeleccionada}
            onClick={() => setMostrarCuadroEdades(!mostrarCuadroEdades)}
            style={{
              width: '100%',
              padding: '9px',
              background: coloniaSeleccionada ? '#2563eb' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: coloniaSeleccionada ? 'pointer' : 'not-allowed'
            }}
          >
            {mostrarCuadroEdades ? 'Ocultar Desglose de Edades' : 'Desglose de Edades'}
          </button>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Capas de referencia</h4>
          <label style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={verColonias} onChange={(e) => setVerColonias(e.target.checked)} />
            Mostrar límites territoriales
          </label>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>-- PERFIL POBLACIONAL --</h4>
          
          <button
            disabled={!coloniaSeleccionada}
            onClick={() => setModalPerfilPoblacional(true)}
            style={{
              width: '100%',
              padding: '9px',
              background: coloniaSeleccionada ? '#059669' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: coloniaSeleccionada ? 'pointer' : 'not-allowed'
            }}
          >
            Generar Perfil
          </button>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>CONFIGURACIÓN DE MAPA</h4>
          
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

      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: -93.1164,
            latitude: 16.7528,
            zoom: 13
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['colonias-fill']}
          onMouseMove={onHover}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {geoJsonCompleto.features.length > 0 && (
            <Source type="geojson" data={geoJsonCompleto}>
              <Layer {...layerFillStyle} />
              <Layer {...layerLineStyle} />
            </Source>
          )}

          {coloniaSeleccionada && centroPopup && (
            <Popup 
              longitude={centroPopup.longitude}
              latitude={centroPopup.latitude}
              closeButton={false}
              closeOnClick={false}
              anchor="bottom"
              offset={15}
            >
              <div style={{ fontSize: '12px', textAlign: 'center', padding: '4px 6px', minWidth: '140px' }}>
                <b style={{ color: '#dc2626', fontSize: '13px' }}>
                  {infoColoniaA ? infoColoniaA.nombreOriginal : coloniaSeleccionada}
                </b>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: '1px', textTransform: 'uppercase' }}>
                  (Total Consolidado)
                </div>
                <div style={{ marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                  Total: <b>{infoColoniaA ? infoColoniaA.poblacion_total.toLocaleString() : 'N/D'}</b> hab.
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {hoverInfo && (
          <div style={{
            position: 'absolute',
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #1e293b',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 1000
          }}>
            {hoverInfo.etiquetaSector}
          </div>
        )}

        {mapaCalorActivo && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            background: '#ffffff',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '11px',
            color: '#1e293b'
          }}>
            <b style={{ display: 'block', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>
              Densidad Poblacional
            </b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', background: '#7f1d1d', borderRadius: '2px' }}></span>
                <span>&gt; 8,000 hab.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', background: '#b91c1c', borderRadius: '2px' }}></span>
                <span>5,001 - 8,000 hab.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', background: '#c2410c', borderRadius: '2px' }}></span>
                <span>3,001 - 5,000 hab.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', background: '#f59e0b', borderRadius: '2px' }}></span>
                <span>1,001 - 3,000 hab.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', background: '#fbbf24', borderRadius: '2px' }}></span>
                <span>0 - 1,000 hab.</span>
              </div>
            </div>
          </div>
        )}

        {mostrarCuadroEdades && infoColoniaA && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            width: '300px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '12px', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase' }}>
                  Desglose por Edades
                </h4>
                <span style={{ fontSize: '10px', color: '#64748b' }}>(Total Consolidado por Colonia)</span>
              </div>
              <button 
                onClick={() => setMostrarCuadroEdades(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: '#f1f5f9', padding: '6px 8px', borderRadius: '4px' }}>
                <b style={{ color: '#0f172a' }}>{infoColoniaA.nombreOriginal}</b>
                {['00-04', '05-09', '10-14', '15-19', '20-24', '25-59', '60+'].map((r) => {
                  const h = infoColoniaA.quinquenios?.[r]?.hombres || 0;
                  const m = infoColoniaA.quinquenios?.[r]?.mujeres || 0;
                  return (
                    <div key={r} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span>Rango {r}:</span>
                      <b>{(h + m).toLocaleString()} hab. (H: {h} | M: {m})</b>
                    </div>
                  );
                })}
              </div>

              {infoColoniaB && (
                <div style={{ background: '#ecfdf5', padding: '6px 8px', borderRadius: '4px' }}>
                  <b style={{ color: '#047857' }}>{infoColoniaB.nombreOriginal}</b>
                  {['00-04', '05-09', '10-14', '15-19', '20-24', '25-59', '60+'].map((r) => {
                    const h = infoColoniaB.quinquenios?.[r]?.hombres || 0;
                    const m = infoColoniaB.quinquenios?.[r]?.mujeres || 0;
                    return (
                      <div key={r} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span>Rango {r}:</span>
                        <b>{(h + m).toLocaleString()} hab. (H: {h} | M: {m})</b>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalPerfilPoblacional && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', color: '#1e293b', borderRadius: '12px', padding: '24px', width: '820px', maxWidth: '95%', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                  PERFIL POBLACIONAL
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Estructura demográfica consolidada por rangos de edad y sexo
                </span>
              </div>
              <button 
                onClick={() => setModalPerfilPoblacional(false)} 
                style={{ position: 'absolute', right: 0, border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {!infoColoniaA ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>
                  No se encontraron datos censales para la colonia "{coloniaSeleccionada}".
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: (coloniaComparar && infoColoniaB) ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  <div 
                    onClick={() => setVistaPiramide('colA')}
                    style={{ 
                      background: vistaPiramide === 'colA' ? '#eff6ff' : '#f8fafc', 
                      border: vistaPiramide === 'colA' ? `2px solid ${PALETTE.primaryBlue}` : '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      padding: '12px 16px',
                      cursor: coloniaComparar ? 'pointer' : 'default',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '11px', color: PALETTE.primaryBlue, fontWeight: 700, textTransform: 'uppercase' }}>
                      {infoColoniaA.nombreOriginal} (Total Consolidado)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                        {infoColoniaA.poblacion_total.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>hab.</span>
                      </span>
                    </div>
                  </div>

                  {coloniaComparar && infoColoniaB && (
                    <div 
                      onClick={() => setVistaPiramide('colB')}
                      style={{ 
                        background: vistaPiramide === 'colB' ? '#ecfdf5' : '#f8fafc', 
                        border: vistaPiramide === 'colB' ? '2px solid #059669' : '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '12px 16px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
                        {infoColoniaB.nombreOriginal} (Total Consolidado)
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                          {infoColoniaB.poblacion_total.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>hab.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {coloniaComparar && infoColoniaB && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => setTipoGraficaPerfil('barras')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: tipoGraficaPerfil === 'barras' ? '#2563eb' : '#ffffff',
                        color: tipoGraficaPerfil === 'barras' ? '#ffffff' : '#64748b'
                      }}
                    >
                      Vista Pirámide (Barras)
                    </button>
                    <button
                      onClick={() => setTipoGraficaPerfil('lineas')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: tipoGraficaPerfil === 'lineas' ? '#2563eb' : '#ffffff',
                        color: tipoGraficaPerfil === 'lineas' ? '#ffffff' : '#64748b'
                      }}
                    >
                      Graficar Líneas Comparativas
                    </button>
                  </div>
                )}

                <div style={{ height: '380px', width: '100%', marginTop: '4px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {tipoGraficaPerfil === 'lineas' && coloniaComparar && infoColoniaB ? (
                      <LineChart data={datosLineasComparativo} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <XAxis dataKey="rango" tick={{ fontSize: 10, fill: PALETTE.navyLabel }} />
                        <YAxis tick={{ fontSize: 10, fill: PALETTE.navyLabel }} />
                        <RechartsTooltip contentStyle={{ background: '#ffffff', borderColor: PALETTE.borderLight, borderRadius: '8px', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey={infoColoniaA.nombreOriginal} stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey={infoColoniaB.nombreOriginal} stroke="#059669" strokeWidth={3} activeDot={{ r: 6 }} />
                      </LineChart>
                    ) : (
                      <BarChart
                        layout="vertical"
                        data={datosPiramideDemografica.data}
                        margin={{ top: 10, right: 45, left: 45, bottom: 10 }}
                        barCategoryGap={2}
                      >
                        <XAxis 
                          type="number" 
                          domain={[-datosPiramideDemografica.maxValor, datosPiramideDemografica.maxValor]}
                          tickFormatter={(val) => `${Math.abs(val)}`} 
                          tick={{ fontSize: 10, fill: PALETTE.navyLabel }} 
                          axisLine={{ stroke: PALETTE.borderLight }} 
                        />
                        <YAxis 
                          dataKey="rango" 
                          type="category" 
                          interval={0}
                          tick={{ fontSize: 10, fill: PALETTE.navyLabel }} 
                          axisLine={{ stroke: PALETTE.borderLight }} 
                          width={45} 
                        />
                        <RechartsTooltip
                          contentStyle={{ background: '#ffffff', borderColor: PALETTE.borderLight, borderRadius: '8px', fontSize: '11px' }}
                          formatter={(value, name, item) => {
                            const isMujer = name === 'Mujeres';
                            const valAbs = isMujer ? item.payload.valM : item.payload.valH;
                            const pct = isMujer ? item.payload.pctM : item.payload.pctH;
                            return [`${valAbs.toLocaleString()} hab. (${pct}%)`, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="mujeres" name="Mujeres" fill={PALETTE.piramideMujeres} barSize={16} />
                        <Bar dataKey="hombres" name="Hombres" fill={PALETTE.piramideHombres} barSize={16} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {analisisDemografico && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 4px 0', color: PALETTE.navyTitle, fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Resumen Demográfico Exacto
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: PALETTE.navyLabel, lineHeight: '1.4' }}>
                      <b>{analisisDemografico.nombre} (Consolidado)</b>: Población total acumulada de <b>{analisisDemografico.pobTotal.toLocaleString()} hab.</b> Rango dominante: <b>{analisisDemografico.rangoDominante} años</b> ({analisisDemografico.maxSuma.toLocaleString()} hab. / <b>{analisisDemografico.pctMayorRango}%</b> del total).
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {modalGrafica && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', width: '640px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>
                  {coloniaComparar ? `Comparativa: ${coloniaSeleccionada} vs ${coloniaComparar}` : `Indicadores: ${coloniaSeleccionada}`}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Información estadística censal acumulada (Totales Consolidados)</span>
              </div>
              <button onClick={() => setModalGrafica(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', color: '#475569' }}>✕</button>
            </div>

            {!infoColoniaA ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>
                  No hay datos registrados para "{coloniaSeleccionada}".
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f8fafc', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  {[
                    { id: 'salud', label: 'Salud' },
                    { id: 'empleo', label: 'Empleo' },
                    { id: 'servicios', label: 'Servicios' },
                    { id: 'conectividad', label: 'Conectividad' },
                    { id: 'educacion', label: 'Educación' },
                    { id: 'movilidad', label: 'Movilidad' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setGraficaMetrica(btn.id)}
                      style={{
                        flex: 1,
                        minWidth: '80px',
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

                {graficaMetrica === 'educacion' && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Grado promedio escolaridad (Ponderado - {coloniaSeleccionada})</span>
                      <b style={{ fontSize: '18px', color: '#1e3a8a' }}>{infoColoniaA.grado_promedio_escolaridad} <span style={{ fontSize: '12px', fontWeight: 400 }}>años</span></b>
                    </div>
                    {coloniaComparar && infoColoniaB && (
                      <div style={{ flex: 1, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#047857', display: 'block' }}>Grado promedio escolaridad (Ponderado - {coloniaComparar})</span>
                        <b style={{ fontSize: '18px', color: '#059669' }}>{infoColoniaB.grado_promedio_escolaridad} <span style={{ fontSize: '12px', fontWeight: 400 }}>años</span></b>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ height: graficaMetrica === 'educacion' ? '220px' : '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosModalGrafica} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                      <Bar dataKey="colA" name={`${coloniaSeleccionada} (Consolidado)`} fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      {coloniaComparar && infoColoniaB && <Bar dataKey="colB" name={`${coloniaComparar} (Consolidado)`} fill="#059669" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}