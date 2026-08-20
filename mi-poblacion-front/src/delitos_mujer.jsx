import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function DelitosMujer( {baseUrl ='http://localhost:8000' } ) {
  const [datos, setDatos] = useState([]);
  const [anio, setAnio] = useState('2024');
  const [bienJuridico, setBienJuridico] = useState('Todos');
  const [cargando, setCargando] = useState(false);
  const [mostrarGrafica, setMostrarGrafica] = useState(true);

  const GUINDA = '#581825';
  const DORADO = '#c69c52';
  const BG_PANEL = '#fbf9f5';
  const BG_INPUT = '#faf8f5';
  const BORDER_COLOR = '#ebe5dc';

  const fetchDatos = async () => {
    setCargando(true);
    try {
      let url = `${baseUrl}/api/delitos?anio=${anio}`;
      if (bienJuridico !== 'Todos') {
        url += `&bien_juridico=${encodeURIComponent(bienJuridico)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setDatos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al consultar la API:', err);
      setDatos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, [anio, bienJuridico]);

  const totalDelitos = datos.reduce((acc, curr) => acc + (Number(curr.total || curr.Total) || 0), 0);

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dataGrafica = meses.map(mes => {
    const claveMes = mes.toLowerCase();
    const sumaMes = datos.reduce((acc, curr) => acc + (Number(curr[claveMes] || curr[mes]) || 0), 0);
    return { mes: mes.substring(0, 3), Total: sumaMes };
  });

  const botonesAccion = [
    { label: 'Delito de mayor Incidencia', action: () => alert('Delito de mayor Incidencia') },
    { label: 'Línea de Tendencia Multianual', action: () => alert('Línea de Tendencia Multianual') },
    { label: 'Mapa de Calor', action: () => alert('Mapa de Calor') },
    { label: 'Filtro Cruzado', action: () => alert('Filtro Cruzado') },
    { label: 'Metas de Reducción', action: () => alert('Metas de Reducción') },
    { label: 'Indicadores Demográficos Mujer', action: () => alert('Indicadores Demográficos Mujer') },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f2eb', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.1fr', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* PANEL IZQUIERDO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: BG_PANEL, borderRadius: '18px', padding: '28px', border: `1px solid ${BORDER_COLOR}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h2 style={{ color: GUINDA, fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '24px' }}>
              Parámetros de Consulta - Incidencia Delictiva Mujer
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Filtro Año */}
              <div>
                <label style={{ color: GUINDA, fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  • AÑO DE CONSULTA
                </label>
                <select
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '25px',
                    border: `1px solid ${BORDER_COLOR}`,
                    backgroundColor: BG_INPUT,
                    color: '#333',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                >
                  {['2026', '2025', '2024', '2023', '2022', '2021', '2020'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Bien Jurídico */}
              <div>
                <label style={{ color: GUINDA, fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  • BIEN JURÍDICO AFECTADO
                </label>
                <select
                  value={bienJuridico}
                  onChange={(e) => setBienJuridico(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '25px',
                    border: `1px solid ${BORDER_COLOR}`,
                    backgroundColor: BG_INPUT,
                    color: '#333',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                >
                  <option value="Todos">-- Todos los Bienes Jurídicos --</option>
                  <option value="La familia">La familia</option>
                  <option value="La libertad y la seguridad sexual">La libertad y la seguridad sexual</option>
                  <option value="La vida y la Integridad corporal">La vida y la Integridad corporal</option>
                  <option value="El patrimonio">El patrimonio</option>
                  <option value="La sociedad">La sociedad</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: GUINDA, fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  Resultados Desglosados ({datos.length} registros)
                </h3>
              </div>

              <div style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${BORDER_COLOR}` }}>
                {cargando ? (
                  <div style={{ padding: '35px', textAlign: 'center', color: GUINDA, fontWeight: '500' }}>
                    Consultando base de datos...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: BG_INPUT, borderBottom: `1px solid ${BORDER_COLOR}`, color: GUINDA }}>
                          <th style={{ padding: '12px 16px' }}>Modalidad / Delito</th>
                          <th style={{ padding: '10px' }}>Ene</th>
                          <th style={{ padding: '10px' }}>Feb</th>
                          <th style={{ padding: '10px' }}>Mar</th>
                          <th style={{ padding: '10px' }}>Abr</th>
                          <th style={{ padding: '10px' }}>May</th>
                          <th style={{ padding: '10px' }}>Jun</th>
                          <th style={{ padding: '10px' }}>Jul</th>
                          <th style={{ padding: '10px' }}>Ago</th>
                          <th style={{ padding: '10px' }}>Sep</th>
                          <th style={{ padding: '10px' }}>Oct</th>
                          <th style={{ padding: '10px' }}>Nov</th>
                          <th style={{ padding: '10px' }}>Dic</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.length > 0 ? (
                          datos.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}>
                              <td style={{ padding: '12px 16px', fontWeight: '600', color: '#2c3e50', minWidth: '180px' }}>
                                {row.modalidad || row.Modalidad || row.tipo_de_delito}
                              </td>
                              <td style={{ padding: '10px' }}>{row.enero || row.Enero || 0}</td>
                              <td style={{ padding: '10px' }}>{row.febrero || row.Febrero || 0}</td>
                              <td style={{ padding: '10px' }}>{row.marzo || row.Marzo || 0}</td>
                              <td style={{ padding: '10px' }}>{row.abril || row.Abril || 0}</td>
                              <td style={{ padding: '10px' }}>{row.mayo || row.Mayo || 0}</td>
                              <td style={{ padding: '10px' }}>{row.junio || row.Junio || 0}</td>
                              <td style={{ padding: '10px' }}>{row.julio || row.Julio || 0}</td>
                              <td style={{ padding: '10px' }}>{row.agosto || row.Agosto || 0}</td>
                              <td style={{ padding: '10px' }}>{row.septiembre || row.Septiembre || 0}</td>
                              <td style={{ padding: '10px' }}>{row.octubre || row.Octubre || 0}</td>
                              <td style={{ padding: '10px' }}>{row.noviembre || row.Noviembre || 0}</td>
                              <td style={{ padding: '10px' }}>{row.diciembre || row.Diciembre || 0}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'center', color: GUINDA }}>
                                {row.total || row.Total || 0}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="14" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                              No se encontraron registros para la consulta seleccionada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mostrarGrafica && (
            <div style={{ backgroundColor: BG_PANEL, borderRadius: '18px', padding: '24px', border: `1px solid ${BORDER_COLOR}` }}>
              <h3 style={{ color: GUINDA, fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '20px' }}>
                Comportamiento Mensual Acumulado ({anio})
              </h3>
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGrafica} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eae0d5" />
                    <XAxis dataKey="mes" tick={{ fill: GUINDA, fontSize: 12 }} />
                    <YAxis tick={{ fill: GUINDA, fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: BG_PANEL, borderRadius: '10px', border: `1px solid ${BORDER_COLOR}` }}
                      labelStyle={{ color: GUINDA, fontWeight: 'bold' }}
                    />
                    <Bar dataKey="Total" fill={DORADO} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* PANEL DERECHO DE ACCIONES Y BOTONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div style={{ backgroundColor: BG_PANEL, borderRadius: '18px', padding: '22px', border: `1px solid ${BORDER_COLOR}` }}>
            <h4 style={{ color: GUINDA, fontSize: '13px', fontWeight: 'bold', marginTop: 0, marginBottom: '14px', letterSpacing: '0.5px' }}>
              TOTAL DELICTIVO ({anio})
            </h4>
            <div
              style={{
                width: '100%',
                padding: '16px 8px',
                borderRadius: '30px',
                border: 'none',
                backgroundColor: DORADO,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '18px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(198, 156, 82, 0.35)',
                boxSizing: 'border-box'
              }}
            >
              {totalDelitos.toLocaleString()} Casos
            </div>
          </div>

          <div style={{ backgroundColor: BG_PANEL, borderRadius: '18px', padding: '22px', border: `1px solid ${BORDER_COLOR}` }}>
            <h4 style={{ color: GUINDA, fontSize: '13px', fontWeight: 'bold', marginTop: 0, marginBottom: '14px', letterSpacing: '0.5px' }}>
              VISUALIZACIÓN
            </h4>
            <button
              onClick={() => setMostrarGrafica(!mostrarGrafica)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '30px',
                border: 'none',
                backgroundColor: GUINDA,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(88, 24, 37, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {mostrarGrafica ? 'Ocultar Gráfica' : 'Mostrar Gráfica'}
            </button>
          </div>

          {/* NUEVA SECCIÓN DE HERRAMIENTAS Y MAPAS */}
          <div style={{ backgroundColor: BG_PANEL, borderRadius: '18px', padding: '22px', border: `1px solid ${BORDER_COLOR}` }}>
            <h4 style={{ color: GUINDA, fontSize: '13px', fontWeight: 'bold', marginTop: 0, marginBottom: '14px', letterSpacing: '0.5px' }}>
              HERRAMIENTAS Y CONSULTAS
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {botonesAccion.map((btn, index) => (
                <button
                  key={index}
                  onClick={btn.action}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '25px',
                    border: `1px solid ${GUINDA}`,
                    backgroundColor: '#fff',
                    color: GUINDA,
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = GUINDA;
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.color = GUINDA;
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}