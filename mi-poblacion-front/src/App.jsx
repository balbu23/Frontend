import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MapaInteractivo from './MapaInteractivo';
import FondoAnimado from './FondoAnimado';


const baseUrl = 'http://localhost:8000';

const PALETTE = {
  wine: '#6b1d2f',
  wineDeep: '#4a121f',
  wineLight: '#8c273e',
  gold: '#8b9bb0',
  goldSoft: '#718096',
  danger: '#dc2626',
  success: '#16a34a',
  piramideHombres: '#6b1d2f',  // Tono vino/oscuro
  piramideMujeres: '#d97706',  // Tono dorado/cálido de alto contraste
  navyTitle: '#2b3648',
  navyLabel: '#4a5568',
  borderLight: '#e2e8f0',
};

const MAX_ANIOS_TENDENCIA = 20;

const formatCompacto = (valor) => {
  const v = Number(valor) || 0;
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}K`;
  return `${v}`;
};

const ordenarDeMenorAMayor = (datos) => {
  if (!datos) return [];
  return [...datos].sort((a, b) => {
    const totalA = (Math.abs(a.hombres || 0) + Math.abs(a.mujeres || 0)) || (a.poblacion || a.val || 0);
    const totalB = (Math.abs(b.hombres || 0) + Math.abs(b.mujeres || 0)) || (b.poblacion || b.val || 0);
    return totalA - totalB;
  });
};

const ordenarPorAno = (datos) => {
  if (!datos) return [];
  return [...datos].sort((a, b) => Number(a.ano || a.year) - Number(b.ano || b.year));
};

const ordenarEdades = (datos) => {
  if (!datos) return [];
  return [...datos].sort((a, b) => {
    const parseEdad = (str) => {
      if (!str) return 0;
      const num = parseInt(str);
      return isNaN(num) ? 0 : num;
    };
    return parseEdad(a.edad) - parseEdad(b.edad);
  });
};

const getStyles = (isDarkMode) => ({
  container: {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: isDarkMode ? '#0f172a' : '#f8fafc',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '0',
    margin: '0',
    position: 'relative',
    overflowX: 'hidden',
    paddingTop: '100px',
    boxSizing: 'border-box',
    zIndex: 1,
  },
  themeButton: {
    padding: '6px',
    width: '36px',
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
    cursor: 'pointer',
    background: isDarkMode ? '#1e293b' : '#ffffff',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    zIndex: 1100,
    flexShrink: 0,
  },
  card: {
    backgroundColor: 'transparent',
    padding: '20px',
    borderRadius: '0px',
    border: 'none',
    boxShadow: 'none',
    width: '100%',
    maxWidth: '1350px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 100px)',
    textAlign: 'center',
    position: 'relative',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    padding: '12px 32px',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 1000,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
    boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
  },
  headerLeft: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerLogo: {
    width: '120px',
    height: 'auto',
  },
  headerCenter: {
    flex: 5.5,
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sedTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
    letterSpacing: '3px',
    lineHeight: '1',
  },
  headerRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  secretariaText: {
    fontSize: '11px',
    fontWeight: '600',
    color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: '1.3',
  },
  inicioMainWrapper: {
    display: 'flex',
    flex: 1,
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: '20px',
    overflow: 'hidden',
  },
  inicioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    textAlign: 'left',
    maxWidth: '580px',
    paddingRight: '40px',
    marginTop: '30px',
  },
  inicioTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: isDarkMode ? '#fff' : PALETTE.navyTitle,
    marginBottom: '20px',
    lineHeight: '1.25',
  },
  inicioSubText: {
    fontSize: '15px',
    color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel,
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  panelToggleBtn: (isOpen) => ({
    position: 'fixed',
    right: isOpen ? '280px' : '0px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '28px',
    height: '38px',
    backgroundColor: '#8b9bb0',
    color: '#ffffff',
    border: 'none',
    borderTopLeftRadius: '6px',
    borderBottomLeftRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'right 0.3s ease',
    zIndex: 1001,
    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
  }),
  sidePanel: (isOpen) => ({
    position: 'fixed',
    right: isOpen ? '0px' : '-280px',
    top: '100px',
    bottom: '0px',
    width: '280px',
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(12px)',
    borderLeft: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    padding: '20px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'right 0.3s ease',
    zIndex: 1000,
    boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.08)' : 'none',
    overflowY: 'auto',
    textAlign: 'left',
  }),
  title: {
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
    fontSize: '13px',
    marginBottom: '14px',
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  label: {
    color: isDarkMode ? '#cbd5e1' : PALETTE.navyLabel,
    fontWeight: '600',
    fontSize: '12px',
    marginBottom: '6px',
    display: 'block',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '12px',
    borderRadius: '6px',
    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    textAlign: 'left',
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  button: (isCargando, isDarkMode) => ({
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#8b9bb0',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: isCargando ? 'not-allowed' : 'pointer',
    marginTop: '6px',
    opacity: isCargando ? 0.7 : 1,
    transition: 'background-color 0.2s ease',
  }),
  resultadoCard: {
    padding: '14px',
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    borderRadius: '6px',
    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    marginTop: '12px',
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
  },
  exportButton: {
    marginTop: '14px',
    padding: '10px 16px',
    backgroundColor: isDarkMode ? '#334155' : '#4a5568',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  swapButton: {
    alignSelf: 'center',
    marginTop: '18px',
    width: '34px',
    height: '34px',
    minWidth: '34px',
    borderRadius: '50%',
    border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
    background: isDarkMode ? '#1e293b' : '#ffffff',
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
    fontSize: '16px',
    cursor: 'pointer',
  },
  exportButtonPdf: {
    marginTop: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: isDarkMode ? '#94a3b8' : '#4a5568',
    border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  narrativeBox: {
    marginTop: '14px',
    padding: '14px 16px',
    borderLeft: '4px solid #8b9bb0',
    borderRadius: '0 6px 6px 0',
    fontSize: '13px',
    lineHeight: '1.6',
    textAlign: 'justify',
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    color: isDarkMode ? '#cbd5e1' : PALETTE.navyLabel,
  },
  legendChip: (color, isDarkMode) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
  }),
});

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const styles = getStyles(isDarkMode);
  const [vista, setVista] = useState('inicio');
  const [cargando, setCargando] = useState(false);
  const [mostrarGrafica, setMostrarGrafica] = useState(false);
  const capturaRef = useRef(null);

  const [municipio, setMunicipio] = useState('');

  const [estadoA, setEstadoA] = useState('');
  const [municipiosListaA, setMunicipiosListaA] = useState([]);
  const [munA, setMunA] = useState('');

  const [estadoB, setEstadoB] = useState('');
  const [municipiosListaB, setMunicipiosListaB] = useState([]);
  const [munB, setMunB] = useState('');

  const [nombresCongelados, setNombresCongelados] = useState({ a: '', b: '' });
  const [ano, setAno] = useState(2026);
  const [sexo, setSexo] = useState('AMBOS');
  const [resultado, setResultado] = useState(null);
  const [resultados, setResultados] = useState({ a: null, b: null });
  const [rangoInicio, setRangoInicio] = useState(2026);
  const [rangoFin, setRangoFin] = useState(2030);
  const [datosPiramide, setDatosPiramide] = useState(null);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [rangoInicioTendencia, setRangoInicioTendencia] = useState(2026);
  const [rangoFinTendencia, setRangoFinTendencia] = useState(2030);
  const [datosTendencia, setDatosTendencia] = useState(null);
  const [cargandoTendencia, setCargandoTendencia] = useState(false);
  const [toast, setToast] = useState(null);
  const [mostrarTendenciaComp, setMostrarTendenciaComp] = useState(false);
  const [rangoInicioComp, setRangoInicioComp] = useState(2026);
  const [rangoFinComp, setRangoFinComp] = useState(2030);
  const [datosTendenciaComp, setDatosTendenciaComp] = useState(null);
  const [nombresTendenciaComp, setNombresTendenciaComp] = useState({ a: '', b: '' });
  const [cargandoTendenciaComp, setCargandoTendenciaComp] = useState(false);
  const [distribucionEdadComp, setDistribucionEdadComp] = useState({ a: null, b: null });
  const [narrativaEdadMedia, setNarrativaEdadMedia] = useState("");
  const [cargandoDistribucion, setCargandoDistribucion] = useState(false);

  const [tipoGraficaPerfil, setTipoGraficaPerfil] = useState('piramide');
  const [tipoGraficaTendencia, setTipoGraficaTendencia] = useState('linea');
  const [tipoGraficaTendenciaComp, setTipoGraficaTendenciaComp] = useState('linea');
  const [tipoGraficaComp, setTipoGraficaComp] = useState('barras');

  const [estadosData, setEstadosData] = useState({});
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [municipiosLista, setMunicipiosLista] = useState([]);
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true);

  const [panelLateralAbierto, setPanelLateralAbierto] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}/api/municipios`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al conectar con el servidor');
        return res.json();
      })
      .then((data) => {
        setEstadosData(data);
        setCargandoUbicaciones(false);
      })
      .catch((err) => {
        console.error(err);
        mostrarToast('No se pudieron cargar las ubicaciones');
        setCargandoUbicaciones(false);
      });
  }, []);

  const handleEstadoChange = (e) => {
    const estado = e.target.value;
    setEstadoSeleccionado(estado);
    setMunicipiosLista(estadosData[estado] || []);
    setMunicipio('');
  };

  const handleEstadoAChange = (e) => {
    const estado = e.target.value;
    setEstadoA(estado);
    setMunicipiosListaA(estadosData[estado] || []);
    setMunA('');
  };

  const handleEstadoBChange = (e) => {
    const estado = e.target.value;
    setEstadoB(estado);
    setMunicipiosListaB(estadosData[estado] || []);
    setMunB('');
  };

  const generarAnalisisNarrativo = (datos) => {
    if (!datos || datos.length === 0) return "";
    const maxGrupo = datos.reduce((prev, current) =>
      (Math.abs(current.hombres) + Math.abs(current.mujeres)) >
        (Math.abs(prev.hombres) + Math.abs(prev.mujeres)) ? current : prev
    );
    return `El perfil demográfico muestra una concentración poblacional predominante en el rango de edad ${maxGrupo.edad}. 
    Se observa una tendencia de distribución que requiere atención en políticas públicas de desarrollo social y económico para los próximos años.`;
  };

  const generarAnalisisTendencia = (datos, nombreMunicipio) => {
    if (!datos || datos.length < 2) return '';
    const inicio = datos[0];
    const fin = datos[datos.length - 1];
    const diferencia = fin.poblacion - inicio.poblacion;
    const porcentaje = inicio.poblacion ? ((diferencia / inicio.poblacion) * 100).toFixed(1) : '0';
    const tendenciaTexto = diferencia > 0 ? 'un crecimiento' : diferencia < 0 ? 'una disminución' : 'una estabilidad';
    return `Entre ${inicio.ano} y ${fin.ano}, ${nombreMunicipio} proyecta ${tendenciaTexto} poblacional de ${Math.abs(diferencia).toLocaleString()} habitantes (${porcentaje}%), pasando de ${inicio.poblacion.toLocaleString()} a ${fin.poblacion.toLocaleString()} habitantes.`;
  };

  const generarAnalisisTendenciaComparativa = (datos, nombreA, nombreB) => {
    if (!datos || datos.length < 2) return '';
    const inicio = datos[0];
    const fin = datos[datos.length - 1];
    const crecA = fin.a - inicio.a;
    const crecB = fin.b - inicio.b;
    const pctA = inicio.a ? ((crecA / inicio.a) * 100).toFixed(1) : '0';
    const pctB = inicio.b ? ((crecB / inicio.b) * 100).toFixed(1) : '0';
    const brechaFinal = Math.abs(fin.a - fin.b);
    const ganador = fin.a === fin.b ? null : (fin.a > fin.b ? nombreA : nombreB);
    let texto = `Entre ${inicio.ano} y ${fin.ano}, ${nombreA} varía ${pctA}% y ${nombreB} varía ${pctB}%. `;
    texto += ganador
      ? `Para ${fin.ano}, ${ganador} tendría la mayor población, con una diferencia de ${brechaFinal.toLocaleString()} habitantes respecto a ${ganador === nombreA ? nombreB : nombreA}.`
      : `Para ${fin.ano}, ambos municipios llegarían a una población prácticamente igual.`;
    return texto;
  };

  const validarRango = (inicio, fin) => {
    const ini = Number(inicio);
    const fn = Number(fin);
    if (Number.isNaN(ini) || Number.isNaN(fn)) return 'Los años deben ser números válidos.';
    if (fn < ini) return 'El "Periodo Fin" debe ser mayor o igual al "Periodo Inicio".';
    if (fn - ini + 1 > MAX_ANIOS_TENDENCIA) return `El rango es muy amplio. Máximo ${MAX_ANIOS_TENDENCIA} años a la vez.`;
    return null;
  };

  const mostrarToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const consultarPiramide = async () => {
    if (!municipio) {
      mostrarToast('Selecciona un municipio.');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch(`${baseUrl}/api/piramide?mun=${encodeURIComponent(municipio)}&inicio=${rangoInicio}&fin=${rangoFin}`);
      const json = await res.json();
      if (res.ok) {
        setDatosPiramide(json.datos);
        setMostrarPerfil(true);
      } else {
        mostrarToast(json.detail || 'Error al obtener pirámide.');
      }
    } catch (err) {
      console.error("Error al obtener pirámide", err);
      mostrarToast('No se pudo generar el Perfil Demográfico.');
    } finally {
      setCargando(false);
    }
  };

  const exportarImagen = () => {
    if (capturaRef.current) {
      html2canvas(capturaRef.current, {
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        ignoreElements: (el) => el.classList && el.classList.contains('no-capturar'),
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'reporte-poblacion.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const fetchPoblacion = async (mun) => {
    const res = await fetch(`${baseUrl}/api/poblacion?municipio=${encodeURIComponent(mun)}&ano=${ano}&sexo=${sexo}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || 'Error en el servidor');
    return json;
  };

  const consultarPoblacion = async (e) => {
    if (e) e.preventDefault();
    if (!municipio) {
      mostrarToast('Por favor selecciona un municipio.');
      return;
    }
    setCargando(true);
    try {
      const json = await fetchPoblacion(municipio);
      setResultado(json.datos?.poblacion_total || 0);
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || 'Error al consultar población.');
    } finally {
      setCargando(false);
    }
  };

  const obtenerNarrativaEdadMedia = async () => {
    if (narrativaEdadMedia) {
      setNarrativaEdadMedia('');
      return;
    }
    if (!municipio) {
      mostrarToast('Selecciona un municipio.');
      return;
    }
    setCargando(true);
    try {
      const json = await fetchPoblacion(municipio);
      const total = json.datos?.poblacion_total || 0;
      const valor = Math.round(total * 0.35);
      setNarrativaEdadMedia(`En ${municipio}, el grupo de edad media (30-55 años) representa aproximadamente ${valor.toLocaleString()} personas, un sector clave para el análisis demográfico actual.`);
    } catch (err) {
      setNarrativaEdadMedia("No se pudo obtener la información.");
    } finally {
      setCargando(false);
    }
  };

  const compararPoblacion = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!munA || !munB) {
      mostrarToast('Selecciona ambos municipios para comparar.');
      return;
    }
    setCargando(true);
    try {
      const [resA, resB] = await Promise.all([fetchPoblacion(munA), fetchPoblacion(munB)]);
      setResultados({ a: resA.datos?.poblacion_total || 0, b: resB.datos?.poblacion_total || 0 });
      setNombresCongelados({ a: munA, b: munB });
      setDistribucionEdadComp({ a: null, b: null });
      setMostrarGrafica(false);
      setMostrarTendenciaComp(false);
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || 'Error al comparar municipios.');
    } finally {
      setCargando(false);
    }
  };

  const intercambiarMunicipios = () => {
    const tempMunA = munA;
    setMunA(munB);
    setMunB(tempMunA);

    const tempEstadoA = estadoA;
    setEstadoA(estadoB);
    setEstadoB(tempEstadoA);

    const tempListaA = municipiosListaA;
    setMunicipiosListaA(municipiosListaB);
    setMunicipiosListaB(tempListaA);
  };

  const consultarTendencia = async () => {
    if (!municipio) {
      mostrarToast('Selecciona un municipio.');
      return;
    }
    const error = validarRango(rangoInicioTendencia, rangoFinTendencia);
    if (error) { mostrarToast(error); return; }
    setCargandoTendencia(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/proyeccion?municipio=${encodeURIComponent(municipio)}&anio_inicio=${rangoInicioTendencia}&anio_fin=${rangoFinTendencia}`
      );
      const data = await res.json();

      if (res.ok && data.estatus === "exito") {
        const serie = data.datos.map((item) => ({
          ano: item.year,
          poblacion: item.population,
        }));
        setDatosTendencia(serie);
      } else {
        mostrarToast(data.detail || 'Error al obtener la proyección');
      }
    } catch (err) {
      console.error('Error al obtener la tendencia', err);
      mostrarToast('No se pudo generar la línea de tendencia.');
    } finally {
      setCargandoTendencia(false);
    }
  };

  const consultarTendenciaComparativa = async () => {
    const targetA = munA || nombresCongelados.a;
    const targetB = munB || nombresCongelados.b;

    if (!targetA || !targetB) {
      mostrarToast('Selecciona ambos municipios para generar la tendencia.');
      return;
    }

    const error = validarRango(rangoInicioComp, rangoFinComp);
    if (error) { mostrarToast(error); return; }

    setCargandoTendenciaComp(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/api/proyeccion?municipio=${encodeURIComponent(targetA)}&anio_inicio=${rangoInicioComp}&anio_fin=${rangoFinComp}`).then((r) => r.json()),
        fetch(`${baseUrl}/api/proyeccion?municipio=${encodeURIComponent(targetB)}&anio_inicio=${rangoInicioComp}&anio_fin=${rangoFinComp}`).then((r) => r.json()),
      ]);

      if (resA.estatus === "exito" && resB.estatus === "exito") {
        const dictB = new Map(resB.datos.map((item) => [item.year, item.population]));
        const serie = resA.datos.map((itemA) => ({
          ano: itemA.year,
          a: itemA.population,
          b: dictB.get(itemA.year) || 0,
        }));
        setDatosTendenciaComp(serie);
        setNombresTendenciaComp({ a: targetA, b: targetB });
      } else {
        const msgErr = resA.detail || resB.detail || 'Municipio no encontrado o sin registros.';
        mostrarToast(msgErr);
      }
    } catch (err) {
      console.error('Error al obtener la tendencia comparativa', err);
      mostrarToast('No se pudo generar la comparación de tendencias.');
    } finally {
      setCargandoTendenciaComp(false);
    }
  };

  const consultarDistribucionEdad = async () => {
    const targetA = munA || nombresCongelados.a;
    const targetB = munB || nombresCongelados.b;
    if (!targetA || !targetB) return;

    setCargandoDistribucion(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/api/piramide?mun=${encodeURIComponent(targetA)}&inicio=${ano}&fin=${ano}`).then((r) => r.json()),
        fetch(`${baseUrl}/api/piramide?mun=${encodeURIComponent(targetB)}&inicio=${ano}&fin=${ano}`).then((r) => r.json()),
      ]);
      setDistribucionEdadComp({ a: resA.datos || null, b: resB.datos || null });
    } catch (err) {
      console.error('Error al obtener la distribución por edad', err);
      mostrarToast('No se pudo generar la distribución por edad.');
    } finally {
      setCargandoDistribucion(false);
    }
  };

  const alternarGraficaComparativa = async () => {
    const abrir = !mostrarGrafica;
    setMostrarGrafica(abrir);
    setMostrarTendenciaComp(false);

    if (abrir) {
      if (!munA || !munB) {
        mostrarToast('Selecciona ambos municipios primero.');
        setMostrarGrafica(false);
        return;
      }
      setCargando(true);
      try {
        const [resA, resB] = await Promise.all([fetchPoblacion(munA), fetchPoblacion(munB)]);
        setResultados({ a: resA.datos?.poblacion_total || 0, b: resB.datos?.poblacion_total || 0 });
        setNombresCongelados({ a: munA, b: munB });

        if (!distribucionEdadComp.a && !cargandoDistribucion) {
          consultarDistribucionEdad();
        }
      } catch (err) {
        console.error(err);
        mostrarToast(err.message || 'Error al obtener datos para la gráfica.');
        setMostrarGrafica(false);
      } finally {
        setCargando(false);
      }
    }
  };

  const exportarPDF = async () => {
    if (!capturaRef.current) return;
    try {
      const canvas = await html2canvas(capturaRef.current, {
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        ignoreElements: (el) => el.classList && el.classList.contains('no-capturar'),
      });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.setFontSize(16);
      doc.text('Reporte de Población', 40, 50);
      doc.setFontSize(10);
      doc.text(`Fecha de consulta: ${new Date().toLocaleString('es-MX')}`, 40, 68);
      doc.addImage(imgData, 'PNG', 40, 85, imgWidth, imgHeight);
      doc.save('reporte-poblacion.pdf');
    } catch (err) {
      console.error('Error al exportar PDF', err);
      mostrarToast('No se pudo generar el PDF.');
    }
  };

  const ComparativaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const valorActual = payload[0].value;
    const esA = label === nombresCongelados.a;
    const otroValor = esA ? resultados.b : resultados.a;
    const diferencia = valorActual - (otroValor || 0);
    const flecha = diferencia > 0 ? '▲' : diferencia < 0 ? '▼' : '■';
    const colorFlecha = diferencia > 0 ? PALETTE.success : diferencia < 0 ? PALETTE.danger : '#64748b';
    return (
      <div style={{
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        padding: '10px 14px',
        borderRadius: '6px',
        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        fontSize: '13px',
        color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
        <div>Año: <b>{ano}</b></div>
        <div>Población: <b>{valorActual.toLocaleString()}</b></div>
        <div style={{ color: colorFlecha, fontWeight: 'bold', marginTop: '4px' }}>
          {flecha} {Math.abs(diferencia).toLocaleString()} vs {esA ? nombresCongelados.b : nombresCongelados.a}
        </div>
      </div>
    );
  };

  const TendenciaComparativaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const valA = payload.find((p) => p.dataKey === 'a')?.value ?? 0;
    const valB = payload.find((p) => p.dataKey === 'b')?.value ?? 0;
    return (
      <div style={{
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        padding: '10px 14px',
        borderRadius: '6px',
        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        fontSize: '13px',
        color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Año {label}</div>
        <div style={{ color: PALETTE.wine }}>{nombresTendenciaComp.a}: <b>{valA.toLocaleString()}</b></div>
        <div style={{ color: PALETTE.gold, marginTop: '2px' }}>{nombresTendenciaComp.b}: <b>{valB.toLocaleString()}</b></div>
      </div>
    );
  };

  const renderDistribucionEdad = (datos, colorBase) => {
    if (!datos || datos.length === 0) return null;
    const datosOrdenados = ordenarEdades(datos);
    const total = datosOrdenados.reduce((acc, d) => acc + Math.abs(d.hombres || 0) + Math.abs(d.mujeres || 0), 0);
    const segmentos = datosOrdenados.map((d, i) => {
      const cantidad = Math.abs(d.hombres || 0) + Math.abs(d.mujeres || 0);
      const pct = total ? (cantidad / total) * 100 : 0;
      const opacidad = Math.max(0.32, 1 - i * (0.62 / Math.max(datosOrdenados.length - 1, 1)));
      return { edad: d.edad, pct, opacidad };
    });
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '24px',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {segmentos.map((s) => (
          <div
            key={s.edad}
            className="segmento-edad"
            title={`${s.edad}: ${s.pct.toFixed(1)}%`}
            style={{
              width: `${s.pct}%`,
              backgroundColor: colorBase,
              opacity: s.opacidad,
              borderRight: '1px solid rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`
        body { margin: 0; background-color: #f8fafc; }
        .vista-transition { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* ESTILO FORMAL DE CONTENEDORES COMO LA IMAGEN */
        .panel-section {
          background-color: ${isDarkMode ? '#1e293b' : '#ffffff'};
          border-radius: 10px;
          border: ${isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0'};
          padding: 18px 20px;
          margin-bottom: 14px;
          box-shadow: ${isDarkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)'};
          box-sizing: border-box;
          width: 100%;
        }

        .section-header {
          font-size: 11px;
          font-weight: 700;
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          text-transform: uppercase;
          letter-spacing: 0.8px;
          text-align: center;
          margin-bottom: 14px;
        }

        .interactive-btn:hover:not(:disabled) {
          background-color: #718096 !important;
        }
        
        .interactive-input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        .interactive-input::placeholder {
          color: #94a3b8;
          font-size: 13px;
        }
        select.interactive-input {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%3a475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 14px;
          padding-right: 32px;
        }
        select.interactive-input option {
          background-color: ${isDarkMode ? '#1e293b' : '#ffffff'};
          color: ${isDarkMode ? '#f8fafc' : '#2b3648'};
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
        }
        .btn-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        .progress-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 3px;
          overflow: hidden; background: #e2e8f0; z-index: 2000;
        }
        .progress-bar::after {
          content: ''; position: absolute; top: 0; left: 0; height: 100%; width: 50%;
          background: #8b9bb0;
          animation: loadingSlide 1s infinite ease-in-out;
        }
        @keyframes loadingSlide { 0% { left: -50%; } 100% { left: 100%; } }
        .toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          padding: 10px 18px; border-radius: 6px; z-index: 3000;
          font-size: 13px; font-weight: 500; color: #fff;
        }
        .toast-error { background: ${PALETTE.danger}; }
        .toast-success { background: ${PALETTE.success}; }
      `}</style>

      {/* CAPA DE FONDO DINÁMICO */}
      <div className="dynamic-background" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} aria-hidden="true">
        <FondoAnimado isDarkMode={isDarkMode} />
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div style={styles.card}>
        {(cargando || cargandoTendencia || cargandoTendenciaComp || cargandoDistribucion || cargandoUbicaciones) && <div className="progress-bar" />}

        {/* ENCABEZADO GLOBAL */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img src="/ayuntamiento.webp" alt="Ayuntamiento" style={styles.headerLogo} />
            <button
              className="interactive-btn theme-toggle"
              style={styles.themeButton}
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label="Cambiar tema"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <div style={styles.headerCenter}>
            <h1 style={styles.sedTitle}>S E D</h1>
            <span style={{ fontSize: '11px', color: isDarkMode ? '#cbd5e1' : PALETTE.navyLabel, fontWeight: '700', letterSpacing: '1px', marginTop: '5px', textTransform: 'uppercase' }}>
              Sistema de Estimación Demográfica
            </span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.secretariaText}>Secretaría<br />de Planeación</span>
          </div>
        </div>

        {/* PANEL LATERAL */}
        <button
          style={styles.panelToggleBtn(panelLateralAbierto)}
          onClick={() => setPanelLateralAbierto(!panelLateralAbierto)}
          title={panelLateralAbierto ? "Cerrar panel" : "Abrir más herramientas"}
        >
          {panelLateralAbierto ? '>' : '<'}
        </button>

        <div style={styles.sidePanel(panelLateralAbierto)}>
          <h3 style={{ color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle, fontSize: '13px', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
            Menú Principal
          </h3>

          <button
            type="button"
            className="interactive-btn"
            style={{ ...styles.button(false, isDarkMode), backgroundColor: vista === 'inicio' ? '#4a5568' : '#8b9bb0' }}
            onClick={() => { setVista('inicio'); setPanelLateralAbierto(false); }}
          >
            Inicio
          </button>

          <button
            type="button"
            className="interactive-btn"
            style={{ ...styles.button(false, isDarkMode), backgroundColor: vista === 'estimacion' ? '#4a5568' : '#8b9bb0' }}
            onClick={() => { setVista('estimacion'); setPanelLateralAbierto(false); }}
          >
            Estimación de Municipios
          </button>

          <button
            type="button"
            className="interactive-btn"
            style={{ ...styles.button(false, isDarkMode), backgroundColor: vista === 'comparar' ? '#4a5568' : '#8b9bb0' }}
            onClick={() => { setVista('comparar'); setPanelLateralAbierto(false); }}
          >
            Comparativa de Municipios
          </button>

          <button
            type="button"
            className="interactive-btn"
            style={{ ...styles.button(false, isDarkMode), backgroundColor: vista === 'mapa' ? '#4a5568' : '#8b9bb0' }}
            onClick={() => { setVista('mapa'); setPanelLateralAbierto(false); }}
          >
            Datos por Colonias
          </button>

          <button
            type="button"
            className="interactive-btn"
            style={styles.button(false, isDarkMode)}
            onClick={() => mostrarToast('Función en desarrollo', 'success')}
          >
            Comparativa de Colonias
          </button>
          <button
            type="button"
            className="interactive-btn"
            style={styles.button(false, isDarkMode)}
            onClick={() => exportarPDF()}
          >
            Generar Reportes PDF
          </button>
        </div>

        {vista === 'inicio' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={styles.inicioContainer}>
              <h2 style={styles.inicioTitle}>Plataforma de Análisis y Visualización Demográfica</h2>
              <p style={styles.inicioSubText}>
                Herramienta institucional para la consulta demográfica municipal, análisis de tendencias y proyecciones estratégicas de población en el estado.
              </p>
            </div>
          </div>
        )}

        {vista === 'mapa' && (
          <div style={{ width: '100%', minHeight: 'calc(100vh - 200px)', flex: 1 }}>
            <MapaInteractivo />
          </div>
        )}

        {/* VISTA ESTIMACIÓN */}
        {vista === 'estimacion' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={{ width: '100%', paddingBottom: '20px', textAlign: 'left' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: '20px',
                alignItems: 'start',
                marginBottom: '20px'
              }}>

                <div className="panel-section">
                  {(!mostrarPerfil || !datosPiramide) && !datosTendencia ? (
                    <div>
                      <h3 style={styles.title}>Parámetros de Consulta</h3>

                      <div>
                        <label style={styles.label}>Estado</label>
                        <select
                          className="interactive-input"
                          style={styles.input}
                          value={estadoSeleccionado}
                          onChange={handleEstadoChange}
                        >
                          <option value="">-- Selecciona un estado --</option>
                          {Object.keys(estadosData).map((est, idx) => (
                            <option key={`${est}-${idx}`} value={est}>{est}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={styles.label}>Municipio</label>
                        <select
                          className="interactive-input"
                          style={{ ...styles.input, opacity: !estadoSeleccionado ? 0.6 : 1 }}
                          value={municipio}
                          onChange={(e) => setMunicipio(e.target.value)}
                          disabled={!estadoSeleccionado}
                        >
                          <option value="">-- Selecciona un municipio --</option>
                          {municipiosLista.map((munItem, idx) => (
                            <option key={`${munItem}-${idx}`} value={munItem}>{munItem}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={styles.label}>Año</label>
                        <input className="interactive-input" style={styles.input} type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
                      </div>

                      <div>
                        <label style={styles.label}>Género</label>
                        <select className="interactive-input" style={styles.input} value={sexo} onChange={(e) => setSexo(e.target.value)}>
                          <option value="AMBOS">Ambos</option>
                          <option value="HOMBRES">Hombres</option>
                          <option value="MUJERES">Mujeres</option>
                        </select>
                      </div>

                      <button
                        className="interactive-btn"
                        type="button"
                        onClick={consultarPoblacion}
                        style={styles.button(cargando, isDarkMode)}
                        disabled={cargando}
                      >
                        <span className="btn-content">
                          {cargando && <span className="spinner" />}
                          {cargando ? 'Consultando...' : 'Consultar Estimación'}
                        </span>
                      </button>

                      {resultado !== null && (
                        <div style={{ ...styles.resultadoCard, marginTop: '14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '18px', fontWeight: '700', display: 'block' }}>{resultado.toLocaleString()} habitantes</span>
                          <button
                            type="button"
                            className="interactive-btn no-capturar"
                            style={{
                              display: 'block',
                              margin: '8px auto 0 auto',
                              padding: '4px 10px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              background: 'transparent',
                              border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1',
                              color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel,
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            onClick={() => setResultado(null)}
                          >
                            Ocultar Estimación
                          </button>
                        </div>
                      )}
                    </div>
                  ) : mostrarPerfil && datosPiramide ? (
                    <div ref={capturaRef} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ ...styles.title, margin: 0, textAlign: 'left' }}>Perfil Demográfico</h3>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: '#8b9bb0', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => setTipoGraficaPerfil(prev => prev === 'piramide' ? 'barras' : 'piramide')}
                          >
                            {tipoGraficaPerfil === 'piramide' ? 'Ver Vertical' : 'Ver Pirámide'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'transparent', border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => { setMostrarPerfil(false); setDatosPiramide(null); }}
                          >
                            Ocultar Perfil
                          </button>
                        </div>
                      </div>

                      {tipoGraficaPerfil === 'piramide' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px', fontSize: '11px' }}>
                            <span style={{ color: PALETTE.piramideMujeres, fontWeight: '600' }}>● Mujeres</span>
                            <span style={{ color: PALETTE.piramideHombres, fontWeight: '600' }}>● Hombres</span>
                          </div>
                          <div style={{ height: '420px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={ordenarEdades(datosPiramide).map(d => ({
                                  ...d,
                                  mujeres: -Math.abs(d.mujeres || 0),
                                  hombres: Math.abs(d.hombres || 0)
                                }))}
                                margin={{ top: 10, right: 15, left: 15, bottom: 10 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                <XAxis type="number" tickFormatter={(val) => Math.abs(val)} stroke={isDarkMode ? '#94a3b8' : '#475569'} domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                                <YAxis dataKey="edad" type="category" reversed={true} stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 10 }} width={45} interval={0} orientation="left" />
                                <Tooltip formatter={(val) => Math.abs(val)} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '6px', fontSize: '12px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }} />
                                <Bar dataKey="mujeres" fill={PALETTE.piramideMujeres} name="Mujeres" barSize={8} radius={[2, 0, 0, 2]}>
                                  <LabelList dataKey="mujeres" position="left" formatter={(v) => Math.abs(v).toLocaleString()} style={{ fontSize: '9px', fill: isDarkMode ? '#94a3b8' : '#475569' }} />
                                </Bar>
                                <Bar dataKey="hombres" fill={PALETTE.piramideHombres} name="Hombres" barSize={8} radius={[0, 2, 2, 0]}>
                                  <LabelList dataKey="hombres" position="right" formatter={(v) => Math.abs(v).toLocaleString()} style={{ fontSize: '9px', fill: isDarkMode ? '#94a3b8' : '#475569' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '420px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ordenarEdades(datosPiramide).map(d => ({ ...d, hombres: Math.abs(d.hombres || 0), mujeres: Math.abs(d.mujeres || 0) }))} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="edad" stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" />
                              <YAxis stroke={isDarkMode ? '#94a3b8' : '#475569'} tickFormatter={formatCompacto} tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => Math.abs(val)} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '6px', fontSize: '12px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }} />
                              <Bar dataKey="hombres" fill={PALETTE.piramideHombres} name="Hombres" barSize={8} radius={[2, 2, 0, 0]}>
                                <LabelList dataKey="hombres" position="top" formatter={formatCompacto} style={{ fontSize: '8px', fontWeight: '600', fill: PALETTE.piramideHombres }} />
                              </Bar>
                              <Bar dataKey="mujeres" fill={PALETTE.piramideMujeres} name="Mujeres" barSize={8} radius={[2, 2, 0, 0]}>
                                <LabelList dataKey="mujeres" position="top" formatter={formatCompacto} style={{ fontSize: '8px', fontWeight: '600', fill: PALETTE.piramideMujeres }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderRadius: '6px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, textAlign: 'left', textTransform: 'uppercase' }}>Distribución por edad</h4>
                        {renderDistribucionEdad(datosPiramide, PALETTE.piramideHombres)}
                      </div>
                      <div style={styles.narrativeBox}>
                        {generarAnalisisNarrativo(datosPiramide)}
                      </div>
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButton} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButtonPdf} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : datosTendencia ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle, textTransform: 'uppercase' }}>Tendencia Poblacional</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: '#8b9bb0', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => setTipoGraficaTendencia(prev => prev === 'linea' ? 'barras' : 'linea')}
                          >
                            {tipoGraficaTendencia === 'linea' ? 'Ver Barras' : 'Ver Líneas'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'transparent', border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => setDatosTendencia(null)}
                          >
                            Ocultar
                          </button>
                        </div>
                      </div>
                      <div style={{ height: '420px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficaTendencia === 'barras' ? (
                            <BarChart data={ordenarPorAno(datosTendencia)} margin={{ top: 20, right: 15, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="ano" stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 10 }} />
                              <YAxis stroke={isDarkMode ? '#94a3b8' : '#475569'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '6px', fontSize: '12px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }} />
                              <Bar dataKey="poblacion" fill="#8b9bb0" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="poblacion" position="top" fill={isDarkMode ? '#f8fafc' : PALETTE.navyTitle} formatter={formatCompacto} style={{ fontSize: '9px', fontWeight: '600' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <ComposedChart data={ordenarPorAno(datosTendencia)} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="ano" stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 10 }} />
                              <YAxis stroke={isDarkMode ? '#94a3b8' : '#475569'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v) => [v.toLocaleString(), 'Población']} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: '6px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0', fontSize: '12px' }} />
                              <Line type="monotone" dataKey="poblacion" name={municipio} stroke="#8b9bb0" strokeWidth={2} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }}>
                                <LabelList dataKey="poblacion" position="top" dy={-8} fill={isDarkMode ? '#f8fafc' : PALETTE.navyTitle} formatter={formatCompacto} style={{ fontSize: '10px', fontWeight: '600' }} />
                              </Line>
                            </ComposedChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                      <div style={styles.narrativeBox}>
                        {generarAnalisisTendencia(datosTendencia, municipio)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* COLUMNA DERECHA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="panel-section">
                    <div className="section-header">Edad Media</div>
                    <button
                      type="button"
                      className="interactive-btn"
                      style={styles.button(cargando, isDarkMode)}
                      onClick={obtenerNarrativaEdadMedia}
                      disabled={cargando}
                    >
                      {cargando ? 'Consultando...' : narrativaEdadMedia ? 'Ocultar Edad Media' : 'Consultar Edad Media'}
                    </button>
                    {narrativaEdadMedia && (
                      <div style={styles.narrativeBox}>
                        {narrativaEdadMedia}
                      </div>
                    )}
                  </div>

                  <div className="panel-section">
                    <div className="section-header">Gráfica Perfil Demográfico</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoInicio} onChange={(e) => setRangoInicio(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} />
                      </div>
                    </div>
                    <button
                      className="interactive-btn"
                      type="button"
                      style={styles.button(cargando, isDarkMode)}
                      onClick={() => { setMostrarPerfil(true); consultarPiramide(); }}
                      disabled={cargando}
                    >
                      <span className="btn-content">
                        {cargando && <span className="spinner" />}
                        {cargando ? 'Generando...' : 'Generar Perfil'}
                      </span>
                    </button>
                  </div>

                  <div className="panel-section">
                    <div className="section-header">Ver Tendencia</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoInicioTendencia} onChange={(e) => setRangoInicioTendencia(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoFinTendencia} onChange={(e) => setRangoFinTendencia(e.target.value)} />
                      </div>
                    </div>
                    <button
                      className="interactive-btn"
                      type="button"
                      style={styles.button(cargandoTendencia, isDarkMode)}
                      onClick={consultarTendencia}
                      disabled={cargandoTendencia}
                    >
                      <span className="btn-content">
                        {cargandoTendencia && <span className="spinner" />}
                        {cargandoTendencia ? 'Calculando...' : 'Generar Tendencia'}
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VISTA COMPARAR */}
        {vista === 'comparar' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={{ width: '100%', paddingBottom: '20px', textAlign: 'left' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: '20px',
                alignItems: 'start',
                marginBottom: '20px'
              }}>
                <div className="panel-section">
                  {resultados.a === null && !mostrarGrafica && !mostrarTendenciaComp ? (
                    <form onSubmit={compararPoblacion}>
                      <h3 style={styles.title}>Parámetros de Consulta Comparativa</h3>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div>
                            <label style={styles.label}>Estado A</label>
                            <select
                              className="interactive-input"
                              style={styles.input}
                              value={estadoA}
                              onChange={handleEstadoAChange}
                            >
                              <option value="">-- Selecciona estado --</option>
                              {Object.keys(estadosData).map((est, idx) => (
                                <option key={`estA-${est}-${idx}`} value={est}>{est}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={styles.label}>Municipio A</label>
                            <select
                              className="interactive-input"
                              style={{ ...styles.input, opacity: !estadoA ? 0.6 : 1 }}
                              value={munA}
                              onChange={(e) => setMunA(e.target.value)}
                              disabled={!estadoA}
                            >
                              <option value="">-- Selecciona municipio --</option>
                              {municipiosListaA.map((munItem, idx) => (
                                <option key={`munA-${munItem}-${idx}`} value={munItem}>{munItem}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="interactive-btn swap-btn"
                          style={styles.swapButton}
                          onClick={intercambiarMunicipios}
                          title="Intercambiar municipios"
                        >
                          ⇄
                        </button>

                        <div style={{ flex: 1 }}>
                          <div>
                            <label style={styles.label}>Estado B</label>
                            <select
                              className="interactive-input"
                              style={styles.input}
                              value={estadoB}
                              onChange={handleEstadoBChange}
                            >
                              <option value="">-- Selecciona estado --</option>
                              {Object.keys(estadosData).map((est, idx) => (
                                <option key={`estB-${est}-${idx}`} value={est}>{est}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={styles.label}>Municipio B</label>
                            <select
                              className="interactive-input"
                              style={{ ...styles.input, opacity: !estadoB ? 0.6 : 1 }}
                              value={munB}
                              onChange={(e) => setMunB(e.target.value)}
                              disabled={!estadoB}
                            >
                              <option value="">-- Selecciona municipio --</option>
                              {municipiosListaB.map((munItem, idx) => (
                                <option key={`munB-${munItem}-${idx}`} value={munItem}>{munItem}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={styles.label}>Año</label>
                        <input className="interactive-input" style={styles.input} type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
                      </div>
                      <div>
                        <label style={styles.label}>Género</label>
                        <select className="interactive-input" style={styles.input} value={sexo} onChange={(e) => setSexo(e.target.value)}>
                          <option value="AMBOS">Ambos</option>
                          <option value="HOMBRES">Hombres</option>
                          <option value="MUJERES">Mujeres</option>
                        </select>
                      </div>
                    </form>
                  ) : resultados.a !== null && !mostrarGrafica && !mostrarTendenciaComp ? (
                    <div ref={capturaRef} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ ...styles.title, margin: 0, textAlign: 'left' }}>Resultado de Contraste</h3>
                        <button
                          type="button"
                          className="interactive-btn no-capturar"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'transparent', border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, cursor: 'pointer', fontWeight: '600' }}
                          onClick={() => setResultados({ a: null, b: null })}
                        >
                          Ocultar Contraste
                        </button>
                      </div>

                      {(() => {
                        const valA = resultados.a;
                        const valB = resultados.b;
                        const maxVal = Math.max(valA, valB) || 1;
                        const brecha = Math.abs(valA - valB);
                        const pctA = Math.round((valA / maxVal) * 100);
                        const pctB = Math.round((valB / maxVal) * 100);
                        const esAMayor = valA >= valB;
                        const esBMayor = valB >= valA;

                        const getCardStyle = (esMayor) => ({
                          ...styles.resultadoCard,
                          flex: 1,
                          minWidth: '180px',
                          position: 'relative',
                          overflow: 'hidden',
                          border: esMayor
                            ? '2px solid #8b9bb0'
                            : isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                          paddingBottom: '20px',
                        });

                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap',
                            marginTop: '10px'
                          }}>
                            <div style={getCardStyle(esAMayor)}>
                              <div style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, fontWeight: '600', marginBottom: '4px' }}>
                                {nombresCongelados.a}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                {valA.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.8 }}>hab.</span>
                              </div>
                              <div
                                title={`Escala: ${pctA}%`}
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  height: '4px',
                                  width: `${pctA}%`,
                                  backgroundColor: '#8b9bb0',
                                }}
                              />
                            </div>

                            <div style={{
                              backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                              color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle,
                              padding: '8px 14px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1',
                              margin: '8px 0'
                            }}>
                              <span>Diferencia:</span>
                              <span>{brecha.toLocaleString()} hab.</span>
                            </div>

                            <div style={getCardStyle(esBMayor)}>
                              <div style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, fontWeight: '600', marginBottom: '4px' }}>
                                {nombresCongelados.b}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                {valB.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.8 }}>hab.</span>
                              </div>
                              <div
                                title={`Escala: ${pctB}%`}
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  height: '4px',
                                  width: `${pctB}%`,
                                  backgroundColor: '#8b9bb0',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButton} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButtonPdf} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : mostrarGrafica ? (
                    <div ref={capturaRef} style={{ width: '100%', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle, textTransform: 'uppercase' }}>
                          Gráfica de municipios
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: '#8b9bb0', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => setTipoGraficaComp(prev => prev === 'barras' ? 'linea' : 'barras')}
                          >
                            {tipoGraficaComp === 'barras' ? 'Ver Líneas' : 'Ver Barras'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'transparent', border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, cursor: 'pointer', fontWeight: '600' }}
                            onClick={() => setMostrarGrafica(false)}
                          >
                            Ocultar Gráfica
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <span style={styles.legendChip(PALETTE.wine, isDarkMode)}>● {nombresCongelados.a || munA || 'Municipio A'}</span>
                        <span style={styles.legendChip('#8b9bb0', isDarkMode)}>● {nombresCongelados.b || munB || 'Municipio B'}</span>
                      </div>

                      <div style={{ height: '420px', width: '100%' }}>
                        <ResponsiveContainer>
                          {tipoGraficaComp === 'barras' ? (
                            <BarChart
                              data={ordenarDeMenorAMayor([
                                { name: nombresCongelados.a || munA || 'Municipio A', val: resultados.a !== null ? resultados.a : 0 },
                                { name: nombresCongelados.b || munB || 'Municipio B', val: resultados.b !== null ? resultados.b : 0 }
                              ])}
                              margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="name" tick={{ fill: isDarkMode ? '#94a3b8' : '#475569', fontSize: 11 }} />
                              <YAxis tick={{ fill: isDarkMode ? '#94a3b8' : '#475569' }} domain={[0, 'auto']} tickFormatter={formatCompacto} />
                              <Tooltip cursor={{ fill: 'transparent' }} content={<ComparativaTooltip />} />
                              <Bar dataKey="val" fill="#8b9bb0" radius={[4, 4, 0, 0]} barSize={60}>
                                <LabelList dataKey="val" position="top" fill={isDarkMode ? '#f8fafc' : PALETTE.navyTitle} formatter={(value) => value.toLocaleString()} style={{ fontSize: '11px', fontWeight: '600' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <LineChart
                              data={ordenarDeMenorAMayor([
                                { name: nombresCongelados.a || munA || 'Municipio A', val: resultados.a !== null ? resultados.a : 0 },
                                { name: nombresCongelados.b || munB || 'Municipio B', val: resultados.b !== null ? resultados.b : 0 }
                              ])}
                              margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                              <XAxis dataKey="name" tick={{ fill: isDarkMode ? '#94a3b8' : '#475569', fontSize: 11 }} />
                              <YAxis tick={{ fill: isDarkMode ? '#94a3b8' : '#475569' }} domain={[0, 'auto']} tickFormatter={formatCompacto} />
                              <Tooltip content={<ComparativaTooltip />} />
                              <Line type="monotone" dataKey="val" stroke="#8b9bb0" strokeWidth={2} dot={{ r: 5, fill: '#2563eb' }} activeDot={{ r: 7 }}>
                                <LabelList dataKey="val" position="top" fill={isDarkMode ? '#f8fafc' : PALETTE.navyTitle} formatter={(value) => value.toLocaleString()} style={{ fontSize: '11px', fontWeight: '600' }} />
                              </Line>
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cargandoDistribucion && (
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, textAlign: 'center' }}>Cargando distribución por edad...</div>
                        )}
                        {distribucionEdadComp.a && (
                          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: PALETTE.navyTitle, textAlign: 'left', textTransform: 'uppercase' }}>Distribución por edad — {nombresCongelados.a || munA}</h4>
                            {renderDistribucionEdad(distribucionEdadComp.a, PALETTE.piramideHombres)}
                          </div>
                        )}
                        {distribucionEdadComp.b && (
                          <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#8b9bb0', textAlign: 'left', textTransform: 'uppercase' }}>Distribución por edad — {nombresCongelados.b || munB}</h4>
                            {renderDistribucionEdad(distribucionEdadComp.b, PALETTE.piramideMujeres)}
                          </div>
                        )}
                      </div>
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButton} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={styles.exportButtonPdf} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : mostrarTendenciaComp ? (
                    <div style={{ width: '100%', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isDarkMode ? '#f8fafc' : PALETTE.navyTitle, textTransform: 'uppercase' }}>Tendencia Comparada</span>
                        <button
                          className="interactive-btn no-capturar"
                          type="button"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'transparent', border: isDarkMode ? '1px solid #334155' : '1px solid #cbd5e1', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, cursor: 'pointer', fontWeight: '600' }}
                          onClick={() => setMostrarTendenciaComp(false)}
                        >
                          Ocultar Tendencia
                        </button>
                      </div>

                      {datosTendenciaComp ? (
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="interactive-btn no-capturar"
                                type="button"
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: '#8b9bb0', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
                                onClick={() => setTipoGraficaTendenciaComp(prev => prev === 'linea' ? 'barras' : 'linea')}
                              >
                                {tipoGraficaTendenciaComp === 'linea' ? 'Ver Barras' : 'Ver Líneas'}
                              </button>
                              <span style={styles.legendChip(PALETTE.wine, isDarkMode)}>● {nombresTendenciaComp.a}</span>
                              <span style={styles.legendChip('#8b9bb0', isDarkMode)}>● {nombresTendenciaComp.b}</span>
                            </div>
                          </div>
                          <div style={{ height: '420px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              {tipoGraficaTendenciaComp === 'barras' ? (
                                <BarChart data={ordenarPorAno(datosTendenciaComp)} margin={{ top: 20, right: 25, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                  <XAxis dataKey="ano" stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 11 }} />
                                  <YAxis stroke={isDarkMode ? '#94a3b8' : '#475569'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                                  <Tooltip content={<TendenciaComparativaTooltip />} />
                                  <Bar dataKey="a" name={nombresTendenciaComp.a} fill={PALETTE.wine} radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="a" position="top" fill={isDarkMode ? '#f8fafc' : PALETTE.navyTitle} formatter={formatCompacto} style={{ fontSize: '9px', fontWeight: '600' }} />
                                  </Bar>
                                  <Bar dataKey="b" name={nombresTendenciaComp.b} fill="#8b9bb0" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="b" position="top" fill={isDarkMode ? '#f8fafc' : '#8b9bb0'} formatter={formatCompacto} style={{ fontSize: '9px', fontWeight: '600' }} />
                                  </Bar>
                                </BarChart>
                              ) : (
                                <ComposedChart data={ordenarPorAno(datosTendenciaComp)} margin={{ top: 20, right: 25, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                  <XAxis dataKey="ano" stroke={isDarkMode ? '#94a3b8' : '#475569'} tick={{ fontSize: 11 }} />
                                  <YAxis stroke={isDarkMode ? '#94a3b8' : '#475569'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                                  <Tooltip content={<TendenciaComparativaTooltip />} />
                                  <Line type="monotone" dataKey="a" name={nombresTendenciaComp.a} stroke={PALETTE.wine} strokeWidth={2} dot={{ r: 4, fill: PALETTE.wine }} activeDot={{ r: 6 }} />
                                  <Line type="monotone" dataKey="b" name={nombresTendenciaComp.b} stroke="#8b9bb0" strokeWidth={2} dot={{ r: 4, fill: '#8b9bb0' }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                          <div style={styles.narrativeBox}>
                            {generarAnalisisTendenciaComparativa(datosTendenciaComp, nombresTendenciaComp.a, nombresTendenciaComp.b)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <p style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : PALETTE.navyLabel, marginBottom: '12px' }}>Configura el periodo y genera las tendencias comparadas.</p>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...styles.label, fontSize: '10px' }}>Periodo Inicio</label>
                              <input className="interactive-input" style={{ ...styles.input, padding: '8px' }} type="number" value={rangoInicioComp} onChange={(e) => setRangoInicioComp(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...styles.label, fontSize: '10px' }}>Periodo Fin</label>
                              <input className="interactive-input" style={{ ...styles.input, padding: '8px' }} type="number" value={rangoFinComp} onChange={(e) => setRangoFinComp(e.target.value)} />
                            </div>
                          </div>
                          <button className="interactive-btn" type="button" style={styles.button(cargandoTendenciaComp, isDarkMode)} onClick={consultarTendenciaComparativa} disabled={cargandoTendenciaComp}>
                            <span className="btn-content">
                              {cargandoTendenciaComp && <span className="spinner" />}
                              {cargandoTendenciaComp ? 'Calculando...' : 'Generar Tendencias'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="panel-section">
                    <div className="section-header">Contraste de Datos</div>
                    <button
                      type="button"
                      className="interactive-btn"
                      style={styles.button(cargando, isDarkMode)}
                      onClick={() => {
                        if (!munA || !munB) {
                          mostrarToast('Selecciona ambos municipios para contrastar.');
                          return;
                        }
                        compararPoblacion();
                      }}
                      disabled={cargando}
                    >
                      {cargando ? 'Contrastando...' : resultados.a !== null ? 'Ocultar Contraste' : 'Consultar Contraste'}
                    </button>
                  </div>

                  <div className="panel-section">
                    <div className="section-header">Gráfica de municipios</div>
                    <button
                      className="interactive-btn"
                      type="button"
                      style={styles.button(cargando, isDarkMode)}
                      onClick={alternarGraficaComparativa}
                      disabled={cargando}
                    >
                      <span className="btn-content">
                        {cargando && <span className="spinner" />}
                        {cargando ? 'Cargando...' : mostrarGrafica ? 'Ocultar Gráfica' : 'Graficar Municipios'}
                      </span>
                    </button>
                  </div>

                  <div className="panel-section">
                    <div className="section-header">Ver Tendencias</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoInicioComp} onChange={(e) => setRangoInicioComp(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '8px', marginBottom: '0' }} type="number" value={rangoFinComp} onChange={(e) => setRangoFinComp(e.target.value)} />
                      </div>
                    </div>
                    <button
                      className="interactive-btn"
                      type="button"
                      style={styles.button(cargandoTendenciaComp, isDarkMode)}
                      onClick={() => {
                        const targetA = munA || nombresCongelados.a;
                        const targetB = munB || nombresCongelados.b;
                        if (!targetA || !targetB) {
                          mostrarToast('Selecciona ambos municipios para generar la tendencia.');
                          return;
                        }
                        setMostrarTendenciaComp(true);
                        setMostrarGrafica(false);
                        setResultados({ a: null, b: null });
                        consultarTendenciaComparativa();
                      }}
                      disabled={cargandoTendenciaComp}
                    >
                      <span className="btn-content">
                        {cargandoTendenciaComp && <span className="spinner" />}
                        {cargandoTendenciaComp ? 'Calculando...' : 'Generar Tendencias'}
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;