import { useEffect, useState } from 'react';
import { api } from './api.js';
import { LoadState, Notice, useData } from './components.jsx';
import { CloudAccounts } from './cloud.jsx';

const number = n => new Intl.NumberFormat('es-CL').format(n || 0);
const when = value => value ? new Date(value).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short'}) : '—';
const price = plan => new Intl.NumberFormat('es-CL',{style:'currency',currency:plan.currency || 'USD'}).format(plan.amount/100);
const statusLabels = {active:'Activa',past_due:'Pago pendiente',canceled:'Cancelada',unpaid:'Sin pagar',trialing:'En prueba',incomplete:'Incompleta',incomplete_expired:'Vencida',pending:'Pendiente',failed:'Error',processed:'Procesado',ignored:'Ignorado',reserved:'Reservado',consumed:'Consumido',released:'Devuelto'};
function Pager({page,total,onChange}) {
  return total>25 && <div className="inline-actions billing-pagination"><button className="button secondary" disabled={page===1} onClick={()=>onChange(page-1)}>Anterior</button><span>Página {page}</span><button className="button secondary" disabled={page*25>=total} onClick={()=>onChange(page+1)}>Siguiente</button></div>;
}
function Balance({period}) {
  return <div className="billing-balance">
    <div><span className="muted">Créditos disponibles</span><strong>{number(period?.available)}</strong><span className="muted">de {number(period?.credits)} en este período</span></div>
    <div><span>Consumidos <b>{number(period?.consumed)}</b></span><span>En proceso <b>{number(period?.reserved)}</b></span><span>Fin del período <b>{when(period?.ends_at)}</b></span></div>
    {period && <progress aria-label="Créditos consumidos y reservados" max={period.credits} value={period.consumed+period.reserved}/>}
  </div>;
}
export function BillingPage() {
  const state=useData('/billing',0,{pollMs:5000,preserve:true});
  const [page,setPage]=useState(1);
  const history=useData(`/billing/history?page=${page}`,state.data?.period?.consumed,{pollMs:10000,preserve:true});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  async function redirect(path,body) {
    setBusy(path);setError('');
    try {const result=await api(`/billing/${path}`,{method:'POST',body});window.location.assign(result.url);}
    catch(e){setError(e.message);setBusy('');}
  }
  const data=state.data;
  const subscription=data?.subscription;
  const subscribed=subscription && ['active','past_due','trialing','incomplete','unpaid'].includes(subscription.status);
  return <><div className="page-heading"><div><h1>Facturación</h1><p className="muted">Tu plan y el uso de tus agentes.</p></div>{subscription && <button className="button secondary" disabled={!!busy} onClick={()=>redirect('portal',{})}>{busy==='portal'?'Abriendo…':'Gestionar suscripción ↗'}</button>}</div>
    <Notice error>{error}</Notice>
    <LoadState state={state}>{data && <>
      {data.environment==='sandbox' && <Notice>Entorno de prueba de Polar. Los pagos no son reales.</Notice>}
      {!data.enabled ? <Notice>Esta instancia funciona sin cobros de OpenFunnel.</Notice> : <>
        {!data.owner_exempt && window.location.hash.includes('checkout=success') && !data.period && <Notice>Estamos esperando la confirmación del pago. Tu saldo se actualizará automáticamente.</Notice>}
        {subscription && <p><strong>{data.plans.find(p=>p.product_id===subscription.product_id)?.name || 'Suscripción'}</strong> · {statusLabels[subscription.status] || subscription.status}{subscription.cancel_at_period_end ? ` · Finaliza el ${when(subscription.period_end)}`:''}</p>}
        {data.owner_exempt ? <>
          <Notice>Tu cuenta de dueño está exenta de suscripción y límite de créditos. El uso de tus proveedores se cobra en sus respectivas cuentas.</Notice>
          <div className="billing-balance"><div><span className="muted">Acceso del dueño</span><strong>Sin límite</strong><span className="muted">Sin cobro de créditos OpenFunnel</span></div><div><span>Usos completados <b>{number(data.exempt_usage?.consumed)}</b></span><span>En proceso <b>{number(data.exempt_usage?.reserved)}</b></span><span className="muted">Uso exento acumulado</span></div></div>
          {subscription && <Notice>La exención no cancela tu suscripción existente. Puedes gestionarla en el portal.</Notice>}
        </> : <Balance period={data.period}/> }
        {!data.owner_exempt && !data.period && <Notice>{subscribed?'Aún no hay un período pagado vigente. Revisa el estado de tu pago en el portal.':'Elige un plan para comenzar a usar tus agentes.'}</Notice>}
        {!data.owner_exempt && data.period?.available===0 && <Notice error>Agotaste los créditos del período. No pueden iniciarse nuevos usos del agente. Tras renovar, retoma las conversaciones pausadas; puedes seguir gestionando tus recursos.</Notice>}
        {!data.owner_exempt && !subscribed && <section aria-labelledby="billing-plans-title"><h2 id="billing-plans-title">Planes disponibles</h2>
          {!data.plans.length && <p className="muted">El administrador aún no ha publicado los planes.</p>}
          <div className="billing-plans">{data.plans.map(p=><article className="billing-plan" key={p.product_id}><h3>{p.name}</h3><p className="billing-price">{price(p)} <small>/ mes</small></p><p className="muted">+ impuestos aplicables</p><p><strong>{number(p.credits)} créditos</strong> por mes</p><p className="muted">Agentes, contactos y canales ilimitados.</p><button className="button primary" disabled={!!busy || !data.configured} onClick={()=>redirect('checkout',{product_id:p.product_id})}>{busy==='checkout'?'Preparando…':'Elegir plan'}</button></article>)}</div>
          {!data.configured && <Notice>El administrador debe completar la conexión de pagos.</Notice>}
        </section>}
      </>}
      <details className="billing-help"><summary>Cómo se cuentan los créditos</summary><p>Una llamada al modelo consume 1 crédito. Cada herramienta ejecutada consume 1 crédito, también en las pruebas y validaciones. Una respuesta puede usar varios créditos.</p><p>Las operaciones fallidas devuelven su reserva. Los reintentos técnicos del mismo paso no se cobran dos veces. Los créditos se renuevan con cada período pagado y no se acumulan.</p><p>Las claves de IA y Zernio son tuyas: esos proveedores te cobran directamente. Leer recursos y enviar mensajes manualmente no consume créditos OpenFunnel.</p></details>
      <section className="billing-history"><h2>Actividad de créditos</h2><LoadState state={history}>{history.data && <>
        {!history.data.items.length ? <p className="muted">Todavía no hay movimientos de créditos.</p> : <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Origen</th><th>Estado</th><th>Créditos</th></tr></thead><tbody>{history.data.items.map(r=><tr key={`${r.exempt}:${r.operation_key}`}><td>{when(r.created_at)}</td><td>{r.kind==='llm'?'Llamada al modelo':'Herramienta'}</td><td>{{agent:'Agente',test:'Prueba',validation:'Validación'}[r.source] || r.source}</td><td>{statusLabels[r.status]}</td><td>{r.exempt?'0 · Exento':r.status==='released'?'0':'1'}</td></tr>)}</tbody></table></div>}
        <Pager page={page} total={history.data.total} onChange={setPage}/>
      </>}</LoadState></section>
    </>}</LoadState></>;
}
function PlanEditor({plan,onSaved,onCancel,setDirty}) {
  const [credits,setCredits]=useState(plan.credits || '');
  const [published,setPublished]=useState(!!plan.published);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>setDirty(false),[setDirty]);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    try {await api(`/admin/billing/plans/${plan.product_id}`,{method:'PUT',body:{credits:Number(credits),published,expected_version:plan.version}});setDirty(false);onSaved();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <form onSubmit={submit}><Notice error>{error}</Notice><fieldset disabled={busy}><legend className="sr-only">Configurar {plan.name}</legend><div className="field"><label htmlFor={`credits-${plan.product_id}`}>Créditos por mes</label><input autoFocus id={`credits-${plan.product_id}`} type="number" min="1" max="100000000" step="1" required value={credits} onChange={e=>{setCredits(e.target.value);setDirty(true);}}/></div><label className="billing-check"><input type="checkbox" checked={published} disabled={!plan.eligible} onChange={e=>{setPublished(e.target.checked);setDirty(true);}}/>Ofrecer este plan</label><p className="muted">Los cambios de créditos se aplican al próximo período pagado.</p><div className="inline-actions"><button className="button primary">{busy?'Guardando…':'Guardar plan'}</button><button type="button" className="button secondary" onClick={onCancel}>Cancelar</button></div></fieldset></form>;
}
function BillingAdmin({setDirty,confirm}) {
  const [page,setPage]=useState(1);
  const state=useData(`/admin/billing?page=${page}`,0,{pollMs:15000,preserve:true});
  const [editing,setEditing]=useState(null);
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function action(path) {
    setBusy(path);setError('');setNotice('');
    try {await api(`/admin/billing/${path}`,{method:'POST',body:{}});state.retry();setNotice(path==='sync'?'Productos actualizados desde Polar.':'Evento pendiente de procesamiento.');}
    catch(e){setError(e.message);}finally{setBusy('');}
  }
  async function cancel() {if(await confirm('Descartar cambios','Los cambios de este plan no se guardarán.','Descartar')) {setDirty(false);setEditing(null);}}
  const data=state.data;
  return <><div className="page-heading"><div><h2>Facturación de la instancia</h2><p className="muted">Tus productos de Polar, con los créditos que tú defines.</p></div><a className="button secondary" href="https://polar.sh/dashboard" target="_blank" rel="noreferrer">Abrir Polar ↗</a></div>
    <Notice error>{error}</Notice><Notice>{notice}</Notice><LoadState state={state}>{data && <>
      <section className="provider-setup"><div className="page-heading"><div><strong>Polar · {data.environment==='sandbox'?'Pruebas':'Producción'}</strong><p className="muted">{data.tokenConfigured?'Token configurado':'Falta el token en el servidor'} · {data.enabled?'Cobros habilitados':'Cobros desactivados'}</p></div><button className="button primary" disabled={!!busy || !data.tokenConfigured || !!editing} onClick={()=>action('sync')}>{busy==='sync'?'Consultando…':'Sincronizar productos'}</button></div>
      {!data.tokenConfigured && <p>Configura <code>POLAR_TOKEN</code> en el entorno del backend y reinicia la API.</p>}
      <details className="billing-help"><summary>Conexión y webhook {data.webhookConfigured?'· Secreto configurado':'· Falta configurar'}</summary><p>En Polar → Settings → Webhooks, crea un endpoint Raw con API version 2026-04 y esta URL:</p><code className="billing-endpoint">{data.webhookURL}</code><p>Eventos: <code>order.paid</code>, <code>order.refunded</code> y <code>subscription.updated</code>. Guarda su secreto como <code>POLAR_WEBHOOK_SECRET</code>.</p><p>Para exigir suscripción: <code>BILLING_ENABLED=true</code>. Conserva desactivados cambios de plan y múltiples suscripciones en el portal de Polar. Usa impuestos Exclusive.</p><a href="./docs/facturacion.html" target="_blank" rel="noreferrer">Guía de configuración ↗</a></details></section>
      <h2>Planes</h2>{!data.plans.length && <p className="muted">Sincroniza para ver los productos que creaste en Polar.</p>}
      <div className="billing-plans">{data.plans.map(p=><article className="billing-plan" key={p.product_id}><div className="record-title"><h3>{p.name}</h3><span className="badge">{p.published && p.eligible?'Publicado':'No disponible'}</span></div><p className="billing-price">{price(p)} <small>/ mes</small></p><p className="muted">+ impuestos aplicables</p>
      {editing?.product_id===p.product_id ? <PlanEditor key={editing.version} plan={editing} setDirty={setDirty} onSaved={()=>{setEditing(null);state.retry();setNotice('Plan guardado.');}} onCancel={cancel}/> : <><p>{p.credits?`${number(p.credits)} créditos por mes`:'Asigna los créditos de este plan.'}</p>{!p.eligible && <p className="muted">Requiere precio fijo mensual, sin prueba gratuita y sin impuestos inclusivos. Revisa el producto en Polar.</p>}<button className="button secondary" disabled={!!editing} onClick={()=>setEditing(p)}>Configurar plan</button></>}
      </article>)}</div>
      <section className="billing-history"><h2>Suscripciones y consumo</h2><div className="table-scroll"><table><thead><tr><th>Cuenta</th><th>Suscripción</th><th>Disponibles</th><th>Consumidos</th><th>Fin del período</th></tr></thead><tbody>{data.accounts.map(a=><tr key={a.workspace_id}><td>{a.name}<br/><small>{a.email}</small></td><td>{a.owner_exempt?'Dueño exento':a.subscription?statusLabels[a.subscription.status] || a.subscription.status:'Sin suscripción'}{a.subscription?.cancel_at_period_end?' · No renueva':''}</td><td>{a.owner_exempt?'Sin límite':number(a.period?.available)}</td><td>{number(a.owner_exempt?a.exempt_usage?.consumed:a.period?.consumed)}</td><td>{a.owner_exempt?'—':when(a.period?.ends_at)}</td></tr>)}</tbody></table></div><Pager page={page} total={data.total} onChange={setPage}/></section>
      <details className="billing-help"><summary>Actividad de pagos y webhooks</summary>{!data.events.length?<p className="muted">Aún no se han recibido eventos de Polar.</p>:<div className="table-scroll"><table><thead><tr><th>Recibido</th><th>Evento</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{data.events.map(e=><tr key={e.id}><td>{when(e.received_at)}</td><td>{e.type}</td><td>{statusLabels[e.status]}</td><td>{e.error}{['pending','failed'].includes(e.status) && <button className="button secondary" disabled={!!busy} onClick={()=>action(`events/${encodeURIComponent(e.id)}/retry`)}>Reintentar</button>}</td></tr>)}</tbody></table></div>}</details>
    </>}</LoadState></>;
}
export function CloudAdmin({section,navigate,confirm,setDirty}) {
  const billing=section==='billing';
  return <><div className="page-heading"><div><p className="eyebrow">Instancia</p><h1>Administración</h1></div></div><nav className="module-navigation" aria-label="Administración"><button className={`button ${!billing?'selected':'secondary'}`} aria-current={!billing?'page':undefined} onClick={()=>navigate('/cloud_accounts')}>Cuentas</button><button className={`button ${billing?'selected':'secondary'}`} aria-current={billing?'page':undefined} onClick={()=>navigate('/cloud_accounts/billing')}>Facturación</button></nav>{billing?<BillingAdmin setDirty={setDirty} confirm={confirm}/>:<CloudAccounts confirm={confirm}/>}</>;
}
