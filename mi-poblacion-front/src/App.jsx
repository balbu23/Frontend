import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const baseUrl = 'https://backend-production-1a3af.up.railway.app';

const PALETTE = {
  wine:      '#741b2a',
  wineDeep:  '#4f0f1c',
  wineLight: '#a62a40',
  gold:      '#c9a15a',
  goldSoft:  '#e4c98a',
  danger:    '#d64545',
  success:   '#2e7d32',
  piramideHombres: '#a62a40',
  piramideMujeres: '#e4c98a',
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
    maxWidth: '1300px',
    display: 'flex',
    flexDirection: 'column',
    background: isDarkMode
      ? 'radial-gradient(circle at 20% 20%, #17131b 0%, #0d0b10 55%, #070609 100%)'
      : 'radial-gradient(circle at 20% 20%, #fdfbf7 0%, #f4ecdf 100%)',
    fontFamily: '"Montserrat", sans-serif',
    padding: '0 0px',
    margin: '0 auto',
    position: 'relative',
    transition: 'background 0.4s ease',
    overflowX: 'hidden',
    paddingTop:'90px',
    boxSizing: 'border-box',
  },
  themeButton: {
    position: 'absolute',
    top: '14px',
    right: '34px',
    padding: '12px',
    borderRadius: '50%',
    border: isDarkMode ? `1px solid ${PALETTE.gold}55` : `1px solid ${PALETTE.wine}33`,
    cursor: 'pointer',
    background: isDarkMode ? '#221c28' : '#ffffff',
    fontSize: '18px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(116,27,42,0.1)',
    zIndex: 100,
  },
  card: {
    backgroundColor: isDarkMode ? '#1a1520' : '#ffffff',
    padding: '32px 48px',
    borderRadius: '0px',
    border: 'none',
    boxShadow: 'none',
    width: '100p%',
    maxWidth: '100%',
    minHeight: '100vh',
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
    borderBottom: '3px solid #c5bf6c', 
    paddingBottom: '0px',
    marginBottom: '30px',
    position: 'fixed',
    top: 0,
    left: -37,
    width:'100%',
    zIndex: 1000, 
    backgroundColor: isDarkMode ? '#1a1520' : '#ffffff',
    
    paddingTop: '0px',
    paddingLeft: '38px',
    paddingRight: '38px',
    boxShadow: isDarkMode 
      ? '0 10px 20px -10px rgba(0,0,0,0.6)' 
      : '0 10px 20px -10px rgba(116,27,42,0.1)',
    transition: 'background-color 0.4s ease, box-shadow 0.3s ease',
  },
 
  headerLogo: {
    width: '140px',
    height: 'auto',
    filter: isDarkMode ? 'drop-shadow(0 2px 8px rgba(201,161,90,0.2))' : 'none',
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
    fontSize: '60px',
    fontWeight: '1000',
    color: isDarkMode ? PALETTE.goldSoft : '#2a2233',
    letterSpacing: '5px',
    textShadow: isDarkMode ? '0 4px 12px rgba(201,161,90,0.2)' : '0 4px 12px rgba(116,27,42,0.1)',
    lineHeight: '1',
  },
  headerRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  secretariaText: {
    fontSize: '15px',
    fontWeight: '700',
    color: isDarkMode ? '#d0c2db' : '#5c2d36',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    lineHeight: '1.2',
  },
  inicioMainWrapper: {
    display: 'flex',
    flex: 1,
    position: 'relative',
    alignItems: 'center',
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
    maxWidth: '550px',
    paddingRight: '40px',
  },
  inicioTitle: {
    fontSize: '45px',
    fontWeight: '800',
    color: isDarkMode ? '#fff' : PALETTE.wine,
    marginBottom: '26px',
    lineHeight: '1.4',
  },
  inicioSubText: {
    fontSize: '15px',
    color: isDarkMode ? '#b8adc4' : '#6a5057',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  panelToggleBtn: (isOpen) => ({
   position: 'absolute',
    right: isOpen ? '300px' : '0px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '46px',
    backgroundColor: isDarkMode ? '#b8860b' : '#2a2233',
    color: '#ffffff',
    border: 'none',
    borderTopLeftRadius: '10px',
    borderBottomLeftRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s',
    zIndex: 10,
    boxShadow: '-4px 0 15px rgba(0,0,0,0.15)',
  }),
  sidePanel: (isOpen) => ({
   position: 'absolute',
    right: isOpen ? '0px' : '-300px',
    top: '0px',
    bottom: '0px',
    width: '300px',
    backgroundColor: isDarkMode ? '#1a1520' : '#f8f4ec',
    borderLeft: isDarkMode ? '1px solid #b8860b44' : '1px solid #80002022',
    padding: '24px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'right 0.40s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 9,
    boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.15)' : 'none',
    overflowY: 'auto',
    textAlign: 'left',
  }),
  title: {
    color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine,
    fontSize: '26px',
    marginBottom: '26px',
    fontWeight: '800',
    letterSpacing: '-0.3px',
  },
  label: {
    color: isDarkMode ? '#d0c2db' : '#5c2d36',
    fontWeight: '800',
    fontSize: '11.5px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '16px',
    borderRadius: '16px',
    border: isDarkMode ? `1.5px solid ${PALETTE.gold}35` : `1.5px solid ${PALETTE.wine}25`,
    fontSize: '15px',
    boxSizing: 'border-box',
    textAlign: 'center',
    backgroundColor: isDarkMode ? '#231d2b' : '#fffcf9',
    backgroundImage: isDarkMode
      ? `linear-gradient(160deg, #251f2e 0%, #1e1826 100%)`
      : `linear-gradient(160deg, #ffffff 0%, #fbf5ef 100%)`,
    color: isDarkMode ? '#fff' : '#1f191b',
    boxShadow: isDarkMode
      ? `0 4px 18px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(201,161,90,0.06)`
      : `0 4px 16px rgba(116,27,42,0.06), inset 0 0 0 1px rgba(116,27,42,0.02)`,
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    outline: 'none',
  },
  button: (isCargando, isDarkMode) => ({
    width: '100%',
    padding: '15px',
    backgroundImage: isDarkMode
      ? `linear-gradient(135deg, ${PALETTE.wineLight}, ${PALETTE.wineDeep})`
      : `linear-gradient(135deg, ${PALETTE.wine}, ${PALETTE.wineDeep})`,
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: isCargando ? 'not-allowed' : 'pointer',
    marginTop: '10px',
    opacity: isCargando ? 0.75 : 1,
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: isDarkMode
      ? '0 8px 24px rgba(166,42,64,0.38)'
      : '0 8px 24px rgba(116,27,42,0.26)',
  }),
  resultadoCard: {
    padding: '16px',
    backgroundColor: isDarkMode ? '#231d2b' : '#fdf2f4',
    borderRadius: '16px',
    border: isDarkMode ? `1px solid ${PALETTE.gold}44` : `1px solid ${PALETTE.wine}44`,
    marginTop: '12px',
    color: isDarkMode ? '#fff' : '#1f191b',
    transition: 'all 0.3s ease',
  },
  exportButton: {
    marginTop: '16px',
    padding: '14px 20px',
    backgroundImage: isDarkMode
      ? `linear-gradient(135deg, ${PALETTE.wineDeep}, #1f1826)`
      : 'linear-gradient(135deg, #2c2c2c, #0d0d0d)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
  },
  swapButton: {
    alignSelf: 'center',
    marginTop: '24px',
    width: '42px',
    height: '42px',
    minWidth: '42px',
    borderRadius: '50%',
    border: isDarkMode ? `1.5px solid ${PALETTE.gold}66` : `1.5px solid ${PALETTE.wine}44`,
    background: isDarkMode ? '#231d2b' : '#ffffff',
    color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine,
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: isDarkMode ? '0 4px 14px rgba(0,0,0,0.4)' : '0 4px 14px rgba(116,27,42,0.12)',
  },
  exportButtonPdf: {
    marginTop: '12px',
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine,
    border: isDarkMode ? `1.5px solid ${PALETTE.gold}66` : `1.5px solid ${PALETTE.wine}55`,
    borderRadius: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  narrativeBox: {
    marginTop: '18px',
    padding: '16px 18px',
    border: `1.5px dashed ${PALETTE.gold}`,
    borderRadius: '14px',
    fontSize: '13.5px',
    lineHeight: '1.5',
    textAlign: 'justify',
    backgroundColor: isDarkMode ? '#1f1926' : '#fcf5ec',
    color: isDarkMode ? '#e4dbe8' : '#3a2d2a',
  },
  legendChip: (color, isDarkMode) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: `${color}1f`,
    color: isDarkMode ? '#fff' : color,
    border: `1px solid ${color}55`,
    boxShadow: `0 2px 10px ${color}15`,
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

  // Estado unificado para controlar la apertura del panel lateral en cualquier vista
  const [panelLateralAbierto, setPanelLateralAbierto] = useState(true);

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
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
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
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
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
    const colorFlecha = diferencia > 0 ? PALETTE.success : diferencia < 0 ? PALETTE.danger : '#888';
    return (
      <div style={{
        backgroundColor: isDarkMode ? '#2d2438' : '#fff',
        padding: '10px 14px',
        borderRadius: '10px',
        border: `1px solid ${PALETTE.gold}55`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
        fontSize: '13px',
        color: isDarkMode ? '#fff' : '#333',
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
        backgroundColor: isDarkMode ? '#2d2438' : '#fff',
        padding: '10px 14px',
        borderRadius: '10px',
        border: `1px solid ${PALETTE.gold}55`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
        fontSize: '13px',
        color: isDarkMode ? '#fff' : '#333',
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
          height: '30px',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: isDarkMode ? '0 4px 14px rgba(0,0,0,0.35)' : '0 4px 14px rgba(116,27,42,0.14)',
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
              borderRight: isDarkMode ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(255,255,255,0.55)',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes viewEnter {
          from { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .vista-transition { animation: viewEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .interactive-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.015);
          filter: brightness(1.12);
          box-shadow: 0 10px 28px rgba(116, 27, 42, 0.4), 0 0 22px rgba(201, 161, 90, 0.35);
        }
        .interactive-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.99);
        }
        .interactive-input:hover {
          border-color: ${PALETTE.gold} !important;
          box-shadow: 0 0 0 3px rgba(201, 161, 90, 0.16), 0 8px 20px rgba(116, 27, 42, 0.16);
          transform: translateY(-1px);
        }
        .interactive-input:focus {
          border-color: ${PALETTE.gold} !important;
          box-shadow: 0 0 0 4px rgba(201, 161, 90, 0.22), 0 0 16px rgba(116, 27, 42, 0.18);
          transform: translateY(-1px);
        }
        select.interactive-input {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          cursor: pointer;
          background-image: linear-gradient(45deg, transparent 50%, ${PALETTE.gold} 50%), linear-gradient(135deg, ${PALETTE.gold} 50%, transparent 50%);
          background-position: calc(100% - 22px) calc(1em + 2px), calc(100% - 17px) calc(1em + 2px);
          background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; padding-right: 40px;
        }
        select.interactive-input::-ms-expand { display: none; }
        select.interactive-input option {
          background-color: ${isDarkMode ? '#252030' : '#fffdfb'};
          color: ${isDarkMode ? '#ffffff' : '#3a2a2f'};
        }
        .resultado-glow:hover {
          box-shadow: 0 0 0 2px rgba(201, 161, 90, 0.35), 0 8px 24px rgba(116, 27, 42, 0.18);
          transform: translateY(-2px);
        }
        .campo-glow {
          border-radius: 16px; padding: 8px 8px 0 8px; transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
        }
        .campo-glow:hover {
          background: ${isDarkMode ? 'rgba(201, 161, 90, 0.06)' : 'rgba(116, 27, 42, 0.04)'};
          box-shadow: 0 8px 20px rgba(116, 27, 42, 0.10), 0 0 14px rgba(201, 161, 90, 0.16);
          transform: translateY(-2px);
        }
        .theme-toggle:hover {
          transform: rotate(15deg) scale(1.08);
          box-shadow: 0 0 18px rgba(201, 161, 90, 0.45);
        }
        .label-glow {
          position: relative;
          text-shadow: ${isDarkMode ? '0 0 12px rgba(228,201,138,0.30)' : '0 0 10px rgba(116,27,42,0.10)'};
        }
        .label-glow::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 7px;
          flex-shrink: 0;
          background: ${PALETTE.gold};
          box-shadow: 0 0 8px ${PALETTE.gold}, 0 0 2px ${PALETTE.gold};
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .btn-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        @keyframes loadingSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .progress-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          overflow: hidden;
          background: ${isDarkMode ? 'rgba(201,161,90,0.15)' : 'rgba(116,27,42,0.10)'};
          z-index: 5;
        }
        .progress-bar::after {
          content: '';
          position: absolute; top: 0; left: 0; height: 100%; width: 40%;
          background: linear-gradient(90deg, transparent, ${PALETTE.gold}, transparent);
          animation: loadingSlide 1.1s ease-in-out infinite;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .toast {
       position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 22px;
          border-radius: 12px;
          z-index: 2000; /* <--- Aumenta este valor para que quede por encima del header (z-index: 1000) */
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          animation: toastIn 0.3s ease-out;
          color: #fff;
        }
        .toast-error { background: ${PALETTE.danger}; }
        .toast-success { background: ${PALETTE.success}; }
        .swap-btn:hover {
          transform: rotate(180deg) scale(1.1);
          box-shadow: 0 0 16px rgba(201, 161, 90, 0.5);
        }
        @keyframes resultEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .result-enter { animation: resultEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
        .segmento-edad {
          position: relative;
          transition: filter 0.2s ease;
          cursor: default;
        }
        .segmento-edad:hover {
          filter: brightness(1.25);
        }
      `}</style>
      
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      
      <button className="interactive-btn theme-toggle" style={styles.themeButton} onClick={() => setIsDarkMode(!isDarkMode)}>
        {isDarkMode ? '☀️' : '🌙'}
      </button>
      
      <div style={styles.card}>
        {(cargando || cargandoTendencia || cargandoTendenciaComp || cargandoDistribucion || cargandoUbicaciones) && <div className="progress-bar" />}
        
        {/* ENCABEZADO GLOBAL */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img src="/ayuntamiento.webp" alt="Ayuntamiento" style={styles.headerLogo} />
          </div>
          <div style={styles.headerCenter}>
            <h1 style={styles.sedTitle}>S E D</h1>
            <span style={{ fontSize: '15px', color: isDarkMode ? PALETTE.goldSoft : PALETTE.gold, fontWeight: '900', letterSpacing: '0.5px', marginTop: '4px' }}>
              (Sistema de Estimación Demográfica)
            </span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.secretariaText}>Secretaría<br/>de Planeación</span>
          </div>
        </div>

      
        {vista === 'inicio' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={styles.inicioContainer}>
              <h2 style={styles.inicioTitle}>Plataforma de Análisis, Proyecciones y Visualización de tendencias poblacionales</h2>
              <p style={styles.inicioSubText}>
                Herramienta institucional para la consulta demográfica municipal, análisis de tendencias y proyecciones estratégicas de población en el estado.
              </p>
            </div>


            <button
              style={styles.panelToggleBtn(panelLateralAbierto)}
              onClick={() => setPanelLateralAbierto(!panelLateralAbierto)}
              title={panelLateralAbierto ? "Cerrar panel" : "Abrir más herramientas"}
            >
              {panelLateralAbierto ? '>' : '<'}
            </button>

            {/* Panel lateral derecho (Herramientas adicionales) */}
            <div style={styles.sidePanel(panelLateralAbierto)}>
              <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '15px', fontWeight: '800', margin: '0 0 10px 0' }}>
                Más Herramientas
              </h3>
              <p style={{ fontSize: '12.5px', color: isDarkMode ? '#bbb' : '#555', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                Acceso rápido a las funciones principales.
              </p>
              
              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px' }}
                onClick={() => setVista('estimacion')}
              >
                Ir a Estimación
              </button>

              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px' }}
                onClick={() => setVista('comparar')}
              >
                Ir a Comparativa
              </button>
            </div>
          </div>
        )}

        {/* VISTA ESTIMACIÓN */}
        {vista === 'estimacion' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={{ width: '100%', paddingBottom: '20px', textAlign: 'left' }}>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: '24px',
                alignItems: 'start',
                marginBottom: '30px'
              }}>
                
                <div style={{
                  backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                  padding: '24px',
                  borderRadius: '20px',
                  border: isDarkMode ? `1px solid ${PALETTE.gold}22` : `1px solid ${PALETTE.wine}15`,
                  boxSizing: 'border-box',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  {(!mostrarPerfil || !datosPiramide) && !datosTendencia ? (
                    <div>
                      <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '15px', fontWeight: '800', marginBottom: '20px' }}>
                        Parámetros de Consulta
                      </h3>

                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Estado</label>
                        <select
                          className="interactive-input"
                          style={styles.input}
                          value={estadoSeleccionado}
                          onChange={handleEstadoChange}
                        >
                          <option value="">-- Selecciona un estado --</option>
                          {Object.keys(estadosData).map((est) => (
                            <option key={est} value={est}>{est}</option>
                          ))}
                        </select>
                      </div>

                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Municipio</label>
                        <select
                          className="interactive-input"
                          style={{ ...styles.input, opacity: !estadoSeleccionado ? 0.7 : 1 }}
                          value={municipio}
                          onChange={(e) => setMunicipio(e.target.value)}
                          disabled={!estadoSeleccionado}
                        >
                          <option value="">-- Selecciona un municipio --</option>
                          {municipiosLista.map((munItem, idx) => (
                            <option key={idx} value={munItem}>{munItem}</option>
                          ))}
                        </select>
                      </div>

                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Año</label>
                        <input className="interactive-input" style={styles.input} type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
                      </div>

                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Género</label>
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
                        <div className="resultado-glow" style={{ ...styles.resultadoCard, marginTop: '16px', textAlign: 'center' }}>
                          <b>{resultado.toLocaleString()}</b> habitantes
                          <button
                            type="button"
                            className="interactive-btn no-capturar"
                            style={{
                              display: 'block',
                              margin: '8px auto 0 auto',
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              borderRadius: '8px',
                              background: 'transparent',
                              border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`,
                              color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine,
                              cursor: 'pointer',
                              fontWeight: 'bold'
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, margin: 0, fontSize: '15px' }}>Perfil Demográfico (0-4 a 85+ años)</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: PALETTE.gold, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setTipoGraficaPerfil(prev => prev === 'piramide' ? 'barras' : 'piramide')}
                          >
                            {tipoGraficaPerfil === 'piramide' ? 'Ver Vertical' : 'Ver Pirámide'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: 'transparent', border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => { setMostrarPerfil(false); setDatosPiramide(null); }}
                          >
                            Ocultar Perfil
                          </button>
                        </div>
                      </div>
                      
                      {tipoGraficaPerfil === 'piramide' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px', fontSize: '12px' }}>
                            <span style={{ color: PALETTE.piramideMujeres, fontWeight: 'bold' }}>● Mujeres</span>
                            <span style={{ color: PALETTE.piramideHombres, fontWeight: 'bold' }}>● Hombres</span>
                          </div>
                          <div style={{ height: '450px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={ordenarEdades(datosPiramide).map(d => ({
                                  ...d,
                                  mujeres: -Math.abs(d.mujeres || 0),
                                  hombres: Math.abs(d.hombres || 0)
                                }))}
                                margin={{top: 10, right: 15, left: 15, bottom: 10}}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3c3245' : '#eee'} />
                                <XAxis type="number" tickFormatter={(val) => Math.abs(val)} stroke={isDarkMode ? '#fff' : '#000'} domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                                <YAxis dataKey="edad" type="category" reversed={true} stroke={isDarkMode ? '#fff' : '#000'} tick={{ fontSize: 10 }} width={45} interval={0} orientation="left" />
                                <Tooltip formatter={(val) => Math.abs(val)} contentStyle={{backgroundColor: isDarkMode ? '#333' : '#fff', borderRadius: '8px', fontSize: '12px'}} />
                                <Bar dataKey="mujeres" fill={PALETTE.piramideMujeres} name="Mujeres" barSize={10} radius={[4, 0, 0, 4]}>
                                  <LabelList dataKey="mujeres" position="left" formatter={(v) => Math.abs(v).toLocaleString()} style={{ fontSize: '9px', fill: isDarkMode ? '#ccc' : '#444' }} />
                                </Bar>
                                <Bar dataKey="hombres" fill={PALETTE.piramideHombres} name="Hombres" barSize={10} radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="hombres" position="right" formatter={(v) => Math.abs(v).toLocaleString()} style={{ fontSize: '9px', fill: isDarkMode ? '#ccc' : '#444' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '450px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ordenarEdades(datosPiramide).map(d => ({ ...d, hombres: Math.abs(d.hombres || 0), mujeres: Math.abs(d.mujeres || 0) }))} margin={{top: 20, right: 10, left: 0, bottom: 20}}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3c3245' : '#eee'} />
                              <XAxis dataKey="edad" stroke={isDarkMode ? '#fff' : '#000'} tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" />
                              <YAxis stroke={isDarkMode ? '#fff' : '#000'} tickFormatter={formatCompacto} tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => Math.abs(val)} contentStyle={{backgroundColor: isDarkMode ? '#333' : '#fff', borderRadius: '8px', fontSize: '12px'}} />
                              <Bar dataKey="hombres" fill={PALETTE.piramideHombres} name="Hombres" barSize={10} radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="hombres" position="top" formatter={formatCompacto} style={{ fontSize: '8px', fontWeight: '700', fill: PALETTE.piramideHombres }} />
                              </Bar>
                              <Bar dataKey="mujeres" fill={PALETTE.piramideMujeres} name="Mujeres" barSize={10} radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="mujeres" position="top" formatter={formatCompacto} style={{ fontSize: '8px', fontWeight: '700', fill: PALETTE.piramideMujeres }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: isDarkMode ? '#1f1a25' : '#ffffff', borderRadius: '10px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, textAlign: 'left' }}>Distribución por edad</h4>
                        {renderDistribucionEdad(datosPiramide, PALETTE.piramideHombres)}
                      </div>
                      <div style={{ marginTop: '14px', padding: '12px', border: '1px dashed #c9a15a', borderRadius: '10px', fontSize: '12px', textAlign: 'justify' }}>
                        {generarAnalisisNarrativo(datosPiramide)}
                      </div>
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButton, marginTop: '12px', padding: '10px' }} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButtonPdf, marginTop: '8px', padding: '10px' }} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : datosTendencia ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine }}>Tendencia (CONAPO)</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px', background: PALETTE.gold, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setTipoGraficaTendencia(prev => prev === 'linea' ? 'barras' : 'linea')}
                          >
                            {tipoGraficaTendencia === 'linea' ? 'Ver Barras' : 'Ver Líneas'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px', background: 'transparent', border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setDatosTendencia(null)}
                          >
                            Ocultar
                          </button>
                        </div>
                      </div>
                      <div style={{ height: '450px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficaTendencia === 'barras' ? (
                            <BarChart data={ordenarPorAno(datosTendencia)} margin={{ top: 20, right: 15, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3c3245' : '#eee'} />
                              <XAxis dataKey="ano" stroke={isDarkMode ? '#fff' : '#000'} tick={{ fontSize: 10 }} />
                              <YAxis stroke={isDarkMode ? '#fff' : '#000'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ backgroundColor: isDarkMode ? '#333' : '#fff', borderRadius: '8px', fontSize: '12px' }} />
                              <Bar dataKey="poblacion" fill={PALETTE.wine} radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="poblacion" position="top" fill={isDarkMode ? PALETTE.goldSoft : PALETTE.wine} formatter={formatCompacto} style={{ fontSize: '9px', fontWeight: '700' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <ComposedChart data={ordenarPorAno(datosTendencia)} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                              <defs>
                                <linearGradient id="gradTendenciaSolo" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={PALETTE.wineLight} stopOpacity={0.45} />
                                  <stop offset="95%" stopColor={PALETTE.wineDeep} stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="lineaGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={PALETTE.wineLight} />
                                  <stop offset="100%" stopColor={PALETTE.wine} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#3c3245' : '#e0e0e0'} />
                              <XAxis dataKey="ano" stroke={isDarkMode ? '#e0d8e5' : '#4a3f42'} tick={{ fontSize: 10, fontWeight: '600' }} />
                              <YAxis stroke={isDarkMode ? '#e0d8e5' : '#4a3f42'} tickFormatter={formatCompacto} width={45} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v) => [v.toLocaleString(), 'Población']} contentStyle={{ backgroundColor: isDarkMode ? '#281f33' : '#ffffff', borderRadius: '12px', border: `1px solid ${PALETTE.gold}`, fontSize: '12px' }} />
                              <Area type="monotone" dataKey="poblacion" stroke="none" fill="url(#gradTendenciaSolo)" />
                              <Line type="monotone" dataKey="poblacion" name={municipio} stroke="url(#lineaGradient)" strokeWidth={3} dot={{ r: 5, fill: PALETTE.gold, stroke: isDarkMode ? '#1a1520' : '#ffffff', strokeWidth: 2 }} activeDot={{ r: 7 }}>
                                <LabelList dataKey="poblacion" position="top" dy={-8} fill={isDarkMode ? PALETTE.goldSoft : PALETTE.wine} formatter={formatCompacto} style={{ fontSize: '10px', fontWeight: '800' }} />
                              </Line>
                            </ComposedChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                      <div style={{ ...styles.narrativeBox, fontSize: '12px', marginTop: '12px' }}>
                        {generarAnalisisTendencia(datosTendencia, municipio)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* COLUMNA DERECHA: Botones Laterales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Edad Media
                    </h4>
                    <button 
                      type="button" 
                      className="interactive-btn" 
                      style={{ ...styles.button(cargando, isDarkMode), marginTop: '0', background: PALETTE.gold }} 
                      onClick={obtenerNarrativaEdadMedia} 
                      disabled={cargando}
                    >
                      {cargando ? 'Consultando...' : narrativaEdadMedia ? 'Ocultar Edad Media' : 'Consultar Edad Media'}
                    </button>
                    {narrativaEdadMedia && (
                      <div className="result-enter" style={{ ...styles.narrativeBox, marginTop: '12px', fontSize: '12px' }}>
                        {narrativaEdadMedia}
                      </div>
                    )}
                  </div>

                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Gráfica Perfil Demográfico
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoInicio} onChange={(e) => setRangoInicio(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} />
                      </div>
                    </div>
                    <button 
                      className="interactive-btn" 
                      type="button" 
                      style={{ ...styles.button(cargando, isDarkMode), marginTop: '0' }} 
                      onClick={() => { setMostrarPerfil(true); consultarPiramide(); }} 
                      disabled={cargando}
                    >
                      <span className="btn-content">
                        {cargando && <span className="spinner" />}
                        {cargando ? 'Generando...' : 'Generar Perfil'}
                      </span>
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Ver Tendencia
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoInicioTendencia} onChange={(e) => setRangoInicioTendencia(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoFinTendencia} onChange={(e) => setRangoFinTendencia(e.target.value)} />
                      </div>
                    </div>
                    <button 
                      className="interactive-btn" 
                      type="button" 
                      style={{ ...styles.button(cargandoTendencia, isDarkMode), marginTop: '0' }} 
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

            {/* Botón de la flechita para desplegar panel lateral */}
            <button
              style={styles.panelToggleBtn(panelLateralAbierto)}
              onClick={() => setPanelLateralAbierto(!panelLateralAbierto)}
              title={panelLateralAbierto ? "Cerrar panel" : "Abrir más herramientas"}
            >
              {panelLateralAbierto ? '>' : '<'}
            </button>

            {/* Panel lateral derecho (Navegación / Herramientas adicionales) */}
            <div style={styles.sidePanel(panelLateralAbierto)}>
              <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '15px', fontWeight: '800', margin: '0 0 10px 0' }}>
                Navegación Rápida
              </h3>
              <p style={{ fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                Cambia de sección o accede a otras herramientas del sistema.
              </p>
              
              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px' }}
                onClick={() => setVista('inicio')}
              >
                Ir a Inicio
              </button>

              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px', background: PALETTE.gold }}
                onClick={() => setVista('comparar')}
              >
                Ir a Comparativa
              </button>
            </div>
          </div>
        )}

        {vista === 'comparar' && (
          <div className="vista-transition" style={styles.inicioMainWrapper}>
            <div style={{ width: '100%', paddingBottom: '20px', textAlign: 'left' }}>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: '24px',
                alignItems: 'start',
                marginBottom: '30px'
              }}>
                
                <div style={{
                  backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                  padding: '24px',
                  borderRadius: '20px',
                  border: isDarkMode ? `1px solid ${PALETTE.gold}22` : `1px solid ${PALETTE.wine}15`,
                  boxSizing: 'border-box',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  {resultados.a === null && !mostrarGrafica && !mostrarTendenciaComp ? (
                    <form onSubmit={compararPoblacion}>
                      <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '15px', fontWeight: '800', marginBottom: '20px' }}>
                        Parámetros de Consulta Comparativa
                      </h3>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div className="campo-glow">
                            <label className="label-glow" style={styles.label}>Estado A</label>
                            <select
                              className="interactive-input"
                              style={styles.input}
                              value={estadoA}
                              onChange={handleEstadoAChange}
                            >
                              <option value="">-- Selecciona estado --</option>
                              {Object.keys(estadosData).map((est) => (
                                <option key={est} value={est}>{est}</option>
                              ))}
                            </select>
                          </div>
                          <div className="campo-glow">
                            <label className="label-glow" style={styles.label}>Municipio A</label>
                            <select
                              className="interactive-input"
                              style={{ ...styles.input, opacity: !estadoA ? 0.7 : 1 }}
                              value={munA}
                              onChange={(e) => setMunA(e.target.value)}
                              disabled={!estadoA}
                            >
                              <option value="">-- Selecciona municipio --</option>
                              {municipiosListaA.map((munItem, idx) => (
                                <option key={idx} value={munItem}>{munItem}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          className="swap-btn"
                          style={styles.swapButton}
                          onClick={intercambiarMunicipios}
                          title="Intercambiar municipios"
                        >
                          ⇄
                        </button>
                        
                        <div style={{ flex: 1 }}>
                          <div className="campo-glow">
                            <label className="label-glow" style={styles.label}>Estado B</label>
                            <select
                              className="interactive-input"
                              style={styles.input}
                              value={estadoB}
                              onChange={handleEstadoBChange}
                            >
                              <option value="">-- Selecciona estado --</option>
                              {Object.keys(estadosData).map((est) => (
                                <option key={est} value={est}>{est}</option>
                              ))}
                            </select>
                          </div>
                          <div className="campo-glow">
                            <label className="label-glow" style={styles.label}>Municipio B</label>
                            <select
                              className="interactive-input"
                              style={{ ...styles.input, opacity: !estadoB ? 0.7 : 1 }}
                              value={munB}
                              onChange={(e) => setMunB(e.target.value)}
                              disabled={!estadoB}
                            >
                              <option value="">-- Selecciona municipio --</option>
                              {municipiosListaB.map((munItem, idx) => (
                                <option key={idx} value={munItem}>{munItem}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Año</label>
                        <input className="interactive-input" style={styles.input} type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
                      </div>
                      <div className="campo-glow">
                        <label className="label-glow" style={styles.label}>Género</label>
                        <select className="interactive-input" style={styles.input} value={sexo} onChange={(e) => setSexo(e.target.value)}>
                          <option value="AMBOS">Ambos</option><option value="HOMBRES">Hombres</option><option value="MUJERES">Mujeres</option>
                        </select>
                      </div>
                    </form>
                  ) : resultados.a !== null && !mostrarGrafica && !mostrarTendenciaComp ? (
                    <div ref={capturaRef} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, margin: 0, fontSize: '15px' }}>Resultado de Contraste</h3>
                        <button
                          type="button"
                          className="interactive-btn no-capturar"
                          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: 'transparent', border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, cursor: 'pointer', fontWeight: 'bold' }}
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
                            ? `2px solid ${PALETTE.gold}`
                            : isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                          boxShadow: esMayor
                            ? `0 0 20px ${PALETTE.gold}35, 0 8px 24px rgba(0,0,0,0.12)`
                            : 'none',
                          paddingBottom: '26px',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
                            <div className="resultado-glow" style={getCardStyle(esAMayor)}>
                              <div style={{ fontSize: '13.5px', color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontWeight: '700', marginBottom: '6px' }}>
                                {nombresCongelados.a} {esAMayor && <span style={{ color: PALETTE.gold, marginLeft: '4px' }}>★</span>}
                              </div>
                              <div style={{ fontSize: '20px', fontWeight: '800' }}>
                                {valA.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.8 }}>hab.</span>
                              </div>
                              <div
                                title={`Escala: ${pctA}%`}
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  height: '6px',
                                  width: `${pctA}%`,
                                  backgroundColor: esAMayor ? PALETTE.gold : PALETTE.wine,
                                  borderRadius: '0 4px 4px 0',
                                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                }}
                              />
                            </div>

                            <div style={{
                              backgroundColor: isDarkMode ? '#110e16' : '#231d2b',
                              color: '#ffffff',
                              padding: '10px 18px',
                              borderRadius: '999px',
                              fontSize: '13px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                              whiteSpace: 'nowrap',
                              border: `1px solid ${PALETTE.gold}55`,
                              margin: '10px 0'
                            }}>
                              <span style={{ color: PALETTE.goldSoft }}>Dif:</span>
                              <span style={{ color: '#fff', letterSpacing: '0.4px' }}> {brecha.toLocaleString()} hab.</span>
                            </div>

                            <div className="resultado-glow" style={getCardStyle(esBMayor)}>
                              <div style={{ fontSize: '13.5px', color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontWeight: '700', marginBottom: '6px' }}>
                                {nombresCongelados.b} {esBMayor && <span style={{ color: PALETTE.gold, marginLeft: '4px' }}>★</span>}
                              </div>
                              <div style={{ fontSize: '20px', fontWeight: '800' }}>
                                {valB.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.8 }}>hab.</span>
                              </div>
                              <div
                                title={`Escala: ${pctB}%`}
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  height: '6px',
                                  width: `${pctB}%`,
                                  backgroundColor: esBMayor ? PALETTE.gold : PALETTE.wine,
                                  borderRadius: '0 4px 4px 0',
                                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButton, marginTop: '20px', padding: '10px' }} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButtonPdf, marginTop: '8px', padding: '10px' }} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : mostrarGrafica ? (
                    <div ref={capturaRef} style={{ width: '100%', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, letterSpacing: '0.2px' }}>
                          Grafica de municipios
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', background: PALETTE.gold, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setTipoGraficaComp(prev => prev === 'barras' ? 'linea' : 'barras')}
                          >
                            {tipoGraficaComp === 'barras' ? 'Ver Gráfica de Líneas' : 'Ver Gráfica de Barras'}
                          </button>
                          <button
                            className="interactive-btn no-capturar"
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', background: 'transparent', border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => setMostrarGrafica(false)}
                          >
                            Ocultar Gráfica
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <span style={styles.legendChip(PALETTE.wine, isDarkMode)}>● {nombresCongelados.a || munA || 'Municipio A'}</span>
                        <span style={styles.legendChip(PALETTE.gold, isDarkMode)}>● {nombresCongelados.b || munB || 'Municipio B'}</span>
                      </div>

                      <div style={{ height: '450px', width: '100%' }}>
                        <ResponsiveContainer>
                          {tipoGraficaComp === 'barras' ? (
                            <BarChart
                              data={ordenarDeMenorAMayor([
                                { name: nombresCongelados.a || munA || 'Municipio A', val: resultados.a !== null ? resultados.a : 0 },
                                { name: nombresCongelados.b || munB || 'Municipio B', val: resultados.b !== null ? resultados.b : 0 }
                              ])}
                              margin={{ top: 35, right: 30, left: 20, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="barraTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isDarkMode ? PALETTE.wineLight : PALETTE.wine} />
                                  <stop offset="100%" stopColor={PALETTE.wineDeep} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                              <XAxis dataKey="name" tick={{fill: isDarkMode ? '#fff' : '#000', fontSize: 12}} />
                              <YAxis tick={{fill: isDarkMode ? '#fff' : '#000'}} domain={[0, 'auto']} tickFormatter={formatCompacto} />
                              <Tooltip cursor={{fill: 'transparent'}} content={<ComparativaTooltip />} />
                              <Bar dataKey="val" fill="url(#barraTotal)" radius={[10, 10, 0, 0]} barSize={80}>
                                <LabelList dataKey="val" position="top" fill={isDarkMode ? PALETTE.goldSoft : PALETTE.wine} formatter={(value) => value.toLocaleString()} style={{ fontSize: '12px', fontWeight: '700' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <LineChart
                              data={ordenarDeMenorAMayor([
                                { name: nombresCongelados.a || munA || 'Municipio A', val: resultados.a !== null ? resultados.a : 0 },
                                { name: nombresCongelados.b || munB || 'Municipio B', val: resultados.b !== null ? resultados.b : 0 }
                              ])}
                              margin={{ top: 35, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                              <XAxis dataKey="name" tick={{fill: isDarkMode ? '#fff' : '#000', fontSize: 12}} />
                              <YAxis tick={{fill: isDarkMode ? '#fff' : '#000'}} domain={[0, 'auto']} tickFormatter={formatCompacto} />
                              <Tooltip content={<ComparativaTooltip />} />
                              <Line type="monotone" dataKey="val" stroke={PALETTE.wine} strokeWidth={4} dot={{ r: 6, fill: PALETTE.gold, stroke: isDarkMode ? '#1c1720' : '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8, fill: PALETTE.wineLight, stroke: PALETTE.gold, strokeWidth: 3 }}>
                                <LabelList dataKey="val" position="top" fill={isDarkMode ? PALETTE.goldSoft : PALETTE.wine} formatter={(value) => value.toLocaleString()} style={{ fontSize: '12px', fontWeight: '700' }} />
                              </Line>
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {cargandoDistribucion && (
                          <div style={{ fontSize: '13px', color: isDarkMode ? '#b8adc4' : '#8a7176', textAlign: 'center' }}>Cargando distribución por edad...</div>
                        )}
                        {distribucionEdadComp.a && (
                          <div className="result-enter" style={{ padding: '14px', borderRadius: '12px', backgroundColor: isDarkMode ? '#1f1a25' : '#fdf9f6' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: PALETTE.wine, textAlign: 'left' }}>Distribución por edad (0-4 a 85+) — {nombresCongelados.a || munA}</h4>
                            {renderDistribucionEdad(distribucionEdadComp.a, PALETTE.piramideHombres)}
                          </div>
                        )}
                        {distribucionEdadComp.b && (
                          <div className="result-enter" style={{ padding: '14px', borderRadius: '12px', backgroundColor: isDarkMode ? '#1f1a25' : '#fdf9f6' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#a67c1f', textAlign: 'left' }}>Distribución por edad (0-4 a 85+) — {nombresCongelados.b || munB}</h4>
                            {renderDistribucionEdad(distribucionEdadComp.b, PALETTE.piramideMujeres)}
                          </div>
                        )}
                      </div>
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButton, marginTop: '16px', padding: '10px' }} onClick={exportarImagen}>Descargar PNG</button>
                      <button className="interactive-btn no-capturar" type="button" style={{ ...styles.exportButtonPdf, marginTop: '8px', padding: '10px' }} onClick={exportarPDF}>Descargar PDF</button>
                    </div>
                  ) : mostrarTendenciaComp ? (
                    <div style={{ width: '100%', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine }}>Tendencia Poblacional Comparada</span>
                        <button
                          className="interactive-btn no-capturar"
                          type="button"
                          style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px', background: 'transparent', border: `1px solid ${isDarkMode ? PALETTE.goldSoft : PALETTE.wine}`, color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => setMostrarTendenciaComp(false)}
                        >
                          Ocultar Tendencia
                        </button>
                      </div>

                      {datosTendenciaComp ? (
                        <div className="result-enter" style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="interactive-btn no-capturar"
                                type="button"
                                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', background: PALETTE.gold, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={() => setTipoGraficaTendenciaComp(prev => prev === 'linea' ? 'barras' : 'linea')}
                              >
                                {tipoGraficaTendenciaComp === 'linea' ? 'Ver Gráfica de Barras' : 'Ver Gráfica de Líneas'}
                              </button>
                              <span style={styles.legendChip(PALETTE.wine, isDarkMode)}>● {nombresTendenciaComp.a}</span>
                              <span style={styles.legendChip(PALETTE.gold, isDarkMode)}>● {nombresTendenciaComp.b}</span>
                            </div>
                          </div>
                          <div style={{ height: '450px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              {tipoGraficaTendenciaComp === 'barras' ? (
                                <BarChart data={ordenarPorAno(datosTendenciaComp)} margin={{ top: 25, right: 25, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3c3245' : '#eee'} />
                                  <XAxis dataKey="ano" stroke={isDarkMode ? '#fff' : '#000'} tick={{ fontSize: 12 }} />
                                  <YAxis stroke={isDarkMode ? '#fff' : '#000'} tickFormatter={formatCompacto} width={55} tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                                  <Tooltip content={<TendenciaComparativaTooltip />} />
                                  <Bar dataKey="a" name={nombresTendenciaComp.a} fill={PALETTE.wine} radius={[6, 6, 0, 0]}>
                                    <LabelList dataKey="a" position="top" fill={isDarkMode ? PALETTE.goldSoft : PALETTE.wine} formatter={formatCompacto} style={{ fontSize: '10px', fontWeight: '700' }} />
                                  </Bar>
                                  <Bar dataKey="b" name={nombresTendenciaComp.b} fill={PALETTE.gold} radius={[6, 6, 0, 0]}>
                                    <LabelList dataKey="b" position="top" fill={isDarkMode ? PALETTE.goldSoft : PALETTE.gold} formatter={formatCompacto} style={{ fontSize: '10px', fontWeight: '700' }} />
                                  </Bar>
                                </BarChart>
                              ) : (
                                <ComposedChart data={ordenarPorAno(datosTendenciaComp)} margin={{ top: 30, right: 25, left: 0, bottom: 5 }}>
                                  <defs>
                                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={PALETTE.wine} stopOpacity={0.35} />
                                      <stop offset="95%" stopColor={PALETTE.wine} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={PALETTE.gold} stopOpacity={0.35} />
                                      <stop offset="95%" stopColor={PALETTE.gold} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#3c3245' : '#eee'} />
                                  <XAxis dataKey="ano" stroke={isDarkMode ? '#fff' : '#000'} tick={{ fontSize: 12 }} />
                                  <YAxis stroke={isDarkMode ? '#fff' : '#000'} tickFormatter={formatCompacto} width={55} tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                                  <Tooltip content={<TendenciaComparativaTooltip />} />
                                  <Area type="monotone" dataKey="a" stroke="none" fill="url(#gradA)" />
                                  <Area type="monotone" dataKey="b" stroke="none" fill="url(#gradB)" />
                                  <Line type="monotone" dataKey="a" name={nombresTendenciaComp.a} stroke={PALETTE.wine} strokeWidth={4} dot={{ r: 5, fill: PALETTE.wine, stroke: isDarkMode ? '#1a1520' : '#ffffff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                  <Line type="monotone" dataKey="b" name={nombresTendenciaComp.b} stroke={PALETTE.gold} strokeWidth={4} dot={{ r: 5, fill: PALETTE.gold, stroke: isDarkMode ? '#1a1520' : '#ffffff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </ComposedChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                          <div style={styles.narrativeBox}>
                            {generarAnalisisTendenciaComparativa(datosTendenciaComp, nombresTendenciaComp.a, nombresTendenciaComp.b)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px' }}>
                          <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#666', marginBottom: '15px' }}>Configura el periodo y genera las tendencias comparadas.</p>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...styles.label, fontSize: '10px' }}>Periodo Inicio</label>
                              <input className="interactive-input" style={{ ...styles.input, padding: '10px' }} type="number" value={rangoInicioComp} onChange={(e) => setRangoInicioComp(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...styles.label, fontSize: '10px' }}>Periodo Fin</label>
                              <input className="interactive-input" style={{ ...styles.input, padding: '10px' }} type="number" value={rangoFinComp} onChange={(e) => setRangoFinComp(e.target.value)} />
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Contraste de Datos
                    </h4>
                    <button 
                      type="button" 
                      className="interactive-btn" 
                      style={{ ...styles.button(cargando, isDarkMode), marginTop: '0', background: PALETTE.gold }} 
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

                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Grafica de municipios
                    </h4>
                    <button 
                      className="interactive-btn" 
                      type="button" 
                      style={{ ...styles.button(cargando, isDarkMode), marginTop: '0' }} 
                      onClick={alternarGraficaComparativa}
                      disabled={cargando}
                    >
                      <span className="btn-content">
                        {cargando && <span className="spinner" />}
                        {cargando ? 'Cargando...' : mostrarGrafica ? 'Ocultar Gráfica' : 'Graficar Municipios'}
                      </span>
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: isDarkMode ? '#221c2a' : '#fcf8f4',
                    padding: '18px',
                    borderRadius: '20px',
                    border: isDarkMode ? `1px solid ${PALETTE.gold}33` : `1px solid ${PALETTE.wine}22`,
                    boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(116,27,42,0.06)'
                  }}>
                    <h4 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '14px', fontWeight: '800', margin: '0 0 10px 0' }}>
                      Ver Tendencias
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Inicio</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoInicioComp} onChange={(e) => setRangoInicioComp(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...styles.label, fontSize: '10px', marginBottom: '4px' }}>Fin</label>
                        <input className="interactive-input" style={{ ...styles.input, padding: '10px', marginBottom: '0' }} type="number" value={rangoFinComp} onChange={(e) => setRangoFinComp(e.target.value)} />
                      </div>
                    </div>
                    <button 
                      className="interactive-btn" 
                      type="button" 
                      style={{ ...styles.button(cargandoTendenciaComp, isDarkMode), marginTop: '0' }} 
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

            {/* Botón de la flechita para desplegar panel lateral */}
            <button
              style={styles.panelToggleBtn(panelLateralAbierto)}
              onClick={() => setPanelLateralAbierto(!panelLateralAbierto)}
              title={panelLateralAbierto ? "Cerrar panel" : "Abrir más herramientas"}
            >
              {panelLateralAbierto ? '>' : '<'}
            </button>

            {/* Panel lateral derecho (Navegación / Herramientas adicionales) */}
            <div style={styles.sidePanel(panelLateralAbierto)}>
              <h3 style={{ color: isDarkMode ? PALETTE.goldSoft : PALETTE.wine, fontSize: '15px', fontWeight: '800', margin: '0 0 10px 0' }}>
                Navegación Rápida
              </h3>
              <p style={{ fontSize: '12.5px', color: isDarkMode ? '#bbb' : '#555', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                Cambia de sección o accede a otras herramientas.
              </p>
              
              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px' }}
                onClick={() => setVista('inicio')}
              >
                Ir a Inicio
              </button>

              <button 
                className="interactive-btn"
                style={{ ...styles.button(false, isDarkMode), fontSize: '13px', padding: '12px', background: PALETTE.gold }}
                onClick={() => setVista('estimacion')}
              >
                Ir a Estimación
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;