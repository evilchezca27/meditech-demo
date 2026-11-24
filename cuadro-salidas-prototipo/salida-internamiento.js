const demoOrders = [
  {
    id: 'PED-2026-0003', createdAt: '2026-11-17T12:00:00.000Z', patient: 'Paciente demo 04', institution: 'Clínica Demo Norte', doctor: 'Dr. Ejemplo',
    surgeryDate: '2026-11-19', surgeryTime: '08:30', status: 'preparation', assemblyOwner: 'Almacén demo A', logisticsOwner: 'Conductor demo A', orderNotes: '', guideCreated: 'Pendiente',
    sets: [{ name: 'Set placa radio distal', ready: false }],
    quality: 'Pendiente', qualityOwner: '', qualityNotes: '', photos: [], photoFiles: [], photoUrls: [], guideName: '', guideUrl: '', guideDocument: null, needsResend: false, documents: { quotation: [], prescription: [], other: [] }
  },
  {
    id: 'PED-2026-0002', createdAt: '2026-11-16T12:00:00.000Z', patient: 'Paciente demo 05', institution: 'Hospital Demo Sur', doctor: 'Dra. Ejemplo',
    surgeryDate: '2026-11-20', surgeryTime: '10:00', status: 'approved', assemblyOwner: '', logisticsOwner: '', orderNotes: '', guideCreated: 'Pendiente',
    sets: [{ name: 'Set de clavícula', ready: false }],
    quality: 'Pendiente', qualityOwner: '', qualityNotes: '', photos: [], photoFiles: [], photoUrls: [], guideName: '', guideUrl: '', guideDocument: null, needsResend: false, documents: { quotation: [], prescription: [], other: [] }
  },
  {
    id: 'PED-2026-0001', createdAt: '2026-11-15T12:00:00.000Z', patient: 'Paciente demo 06', institution: 'Clínica Demo Este', doctor: 'Dr. Ejemplo 2',
    surgeryDate: '2026-11-18', surgeryTime: '14:00', status: 'interned', assemblyOwner: 'Almacén demo B', logisticsOwner: 'Logística demo B', orderNotes: '', guideCreated: 'Sí',
    sets: [{ name: 'Set intramedular', ready: true }],
    quality: 'Aprobado', qualityOwner: 'Almacén demo B', qualityNotes: '', photos: [], photoFiles: [], photoUrls: [], guideName: 'Guía firmada demo.pdf', guideUrl: '', guideDocument: null, needsResend: false, documents: { quotation: [], prescription: [], other: [] }
  }
];

const statusLabels = { approved: 'Pedido generado', preparation: 'En preparación', inTransit: 'En traslado', interned: 'Internado', cancelled: 'Cancelado' };
const statusClasses = { approved: 'blue', preparation: 'amber', inTransit: 'amber', interned: 'green', cancelled: 'red' };
const demoRoleLabels = {
  administrator: 'Administrador · Adm. / Finanzas',
  operator: 'Operador · Almacén',
  chief: 'Jefatura'
};
let currentRole = 'operator';
try { currentRole = sessionStorage.getItem('meditech-demo-role') || 'operator'; } catch (error) { currentRole = 'operator'; }
if (!['administrator', 'operator', 'chief'].includes(currentRole)) currentRole = 'operator';
const canOperate = currentRole === 'operator';
const canManageOrders = currentRole !== 'chief';
const canManageCatalogs = currentRole !== 'chief';
const canRequestAmendments = currentRole !== 'chief';
let selectedOrderId = demoOrders[0].id;
const orderList = document.querySelector('#order-list');
const searchInput = document.querySelector('#order-search');
const statusFilter = document.querySelector('#status-filter');
const materialList = document.querySelector('#material-list');
const photoInput = document.querySelector('#photo-input');
const guideInput = document.querySelector('#guide-input');
const guidePdfInput = document.querySelector('#guide-pdf-input');
const feedback = document.querySelector('#workflow-feedback');
const qualityStatus = document.querySelector('#quality-status');
const qualityOwner = document.querySelector('#quality-owner');
const qualityNotes = document.querySelector('#quality-notes');
const guideCreated = document.querySelector('#guide-created');
const orderDialog = document.querySelector('#generate-order-dialog');
const createOrderForm = document.querySelector('#create-order-form');
const orderSetsList = document.querySelector('#order-sets-list');
const amendmentDialog = document.querySelector('#amendment-dialog');
const amendmentForm = document.querySelector('#amendment-form');
let editingOrderId = null;
let activeAmendmentOrderId = null;
let orderSequence = 3;
let draftExistingDocuments = null;

const sharedOrdersKey = 'meditech-demo-orders-v1';
const catalogsStorageKey = 'meditech-demo-catalogs-v1';
let savedCatalogs = null;
try { savedCatalogs = JSON.parse(localStorage.getItem(catalogsStorageKey) || 'null'); } catch (error) { savedCatalogs = null; }
const institutionsCatalog = Array.isArray(savedCatalogs?.institutions) ? savedCatalogs.institutions : [
  { name: 'Clínica Demo Norte', type: 'Clínica' },
  { name: 'Hospital Demo Sur', type: 'Hospital' },
  { name: 'Clínica Demo Este', type: 'Clínica' }
];
const instrumentistsCatalog = Array.isArray(savedCatalogs?.instrumentists) ? savedCatalogs.instrumentists : ['Instrumentista A', 'Instrumentista B', 'Instrumentista C'];
const driversCatalog = Array.isArray(savedCatalogs?.drivers) ? savedCatalogs.drivers : ['Conductor A', 'Conductor B', 'Conductor C'];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer el archivo.'));
    }, { once: true });
    reader.addEventListener('error', () => reject(new Error(`No se pudo leer ${file.name}.`)), { once: true });
    reader.readAsDataURL(file);
  });
}

async function filesAsAttachments(fileList) {
  return Promise.all(Array.from(fileList || [], async (file) => ({
    name: file.name,
    type: file.type || '',
    url: await readFileAsDataUrl(file)
  })));
}

function revokeBlobUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

function saveSharedCatalogs() {
  try { localStorage.setItem(catalogsStorageKey, JSON.stringify({ institutions: institutionsCatalog, instrumentists: instrumentistsCatalog, drivers: driversCatalog })); }
  catch (error) { console.warn('No se pudieron guardar los catálogos compartidos.', error); }
}

try {
  const previousOrders = JSON.parse(localStorage.getItem(sharedOrdersKey) || '[]');
  if (Array.isArray(previousOrders)) {
    previousOrders.forEach((order) => {
      const sequence = Number(String(order.id || '').match(/-(\d+)$/)?.[1] || 0);
      orderSequence = Math.max(orderSequence, sequence);
    });
  }
} catch (error) {
  console.warn('No se pudo recuperar el correlativo de los pedidos.', error);
}

function isPreparationEditable(order) {
  return order.status === 'preparation' || (order.status === 'inTransit' && order.needsResend);
}

function publishGeneratedOrders(deletedIds = []) {
  const generated = demoOrders.filter((order) => order.fromGenerator || order.amendments?.length).map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    patient: order.patient,
    institution: order.institution,
    doctor: order.doctor,
    personaConsiguio: order.personaConsiguio || '',
    surgeryDate: order.surgeryDate,
    surgeryTime: order.surgeryTime,
    sets: order.sets.map((set) => ({ name: set.name, ready: Boolean(set.ready) })),
    orderNotes: order.orderNotes,
    assemblyOwner: order.assemblyOwner,
    logisticsOwner: order.logisticsOwner,
    guideCreated: order.guideCreated,
    quality: order.quality,
    qualityOwner: order.qualityOwner,
    qualityNotes: order.qualityNotes,
    needsResend: Boolean(order.needsResend),
    photos: [...(order.photos || [])],
    photoFiles: (order.photoFiles || []).map((file, index) => ({
      name: file.name,
      type: file.type || '',
      url: order.photoUrls?.[index] || ''
    })),
    guideName: order.guideName || '',
    guideUrl: order.guideUrl || '',
    guideDocument: order.guideDocument ? { ...order.guideDocument } : null,
    documents: Object.fromEntries(['quotation', 'prescription', 'other'].map((category) => [
      category,
      (order.documents?.[category] || []).map((file) => ({ ...file }))
    ])),
    amendments: (order.amendments || []).map((amendment) => {
      const { photoFiles, ...sharedAmendment } = amendment;
      return {
        ...sharedAmendment,
        photoNames: [...(amendment.photoNames || [])],
        photoUrls: [...(amendment.photoUrls || [])],
        guideUrl: amendment.guideUrl || '',
        materials: (amendment.materials || []).map((item) => ({ ...item })),
        history: (amendment.history || []).map((entry) => ({ ...entry }))
      };
    })
  }));
  try {
    const previous = JSON.parse(localStorage.getItem(sharedOrdersKey) || '[]');
    const byId = new Map((Array.isArray(previous) ? previous : []).map((order) => [order.id, order]));
    generated.forEach((order) => byId.set(order.id, order));
    deletedIds.forEach((id) => byId.delete(id));
    const serializedOrders = JSON.stringify([...byId.values()]);
    if (serializedOrders.length > 4_000_000) {
      showFeedback('Los adjuntos superan la capacidad de esta demostración. Usa archivos más pequeños para compartirlos entre módulos.');
      return false;
    }
    localStorage.setItem(sharedOrdersKey, serializedOrders);
    return true;
  } catch (error) {
    console.warn('No se pudieron compartir los pedidos con el Cuadro de Salidas.', error);
    showFeedback('El navegador no pudo guardar los archivos adjuntos para compartirlos entre módulos. Prueba con archivos más pequeños.');
    return false;
  }
}

function syncSharedOrders(selectNewest = false) {
  let shared = [];
  try {
    shared = JSON.parse(localStorage.getItem(sharedOrdersKey) || '[]');
  } catch (error) {
    console.warn('No se pudieron recuperar los pedidos compartidos.', error);
    return;
  }
  if (!Array.isArray(shared)) return;

  const addedIds = [];
  const sharedIds = new Set(shared.map((order) => order.id));
  for (let index = demoOrders.length - 1; index >= 0; index -= 1) {
    if (demoOrders[index].fromGenerator && !sharedIds.has(demoOrders[index].id)) demoOrders.splice(index, 1);
  }

  shared.forEach((saved) => {
    if (!saved?.id) return;
    let order = demoOrders.find((item) => item.id === saved.id);
    if (!order) {
      order = {
        id: saved.id,
        fromGenerator: true,
        photos: [], photoFiles: [], photoUrls: [],
        guideName: '', guideUrl: '', guideDocument: null,
        documents: { quotation: [], prescription: [], other: [] }
      };
      demoOrders.push(order);
      addedIds.push(order.id);
    }

    order.fromGenerator = true;
    order.createdAt = saved.createdAt || order.createdAt || new Date().toISOString();
    order.status = saved.status || order.status || 'approved';
    order.patient = saved.patient || '';
    order.institution = saved.institution || '';
    order.doctor = saved.doctor || '—';
    order.personaConsiguio = saved.personaConsiguio || '';
    order.surgeryDate = saved.surgeryDate || '';
    order.surgeryTime = saved.surgeryTime || '';
    order.sets = Array.isArray(saved.sets) ? saved.sets.map((set) => {
      if (typeof set === 'string') return { name: set, ready: false };
      return { name: set?.name || '', ready: Boolean(set?.ready) };
    }).filter((set) => set.name) : [];
    order.orderNotes = saved.orderNotes || '';
    order.assemblyOwner = saved.assemblyOwner || '';
    order.logisticsOwner = saved.logisticsOwner || '';
    order.guideCreated = saved.guideCreated || 'Pendiente';
    order.quality = saved.quality || 'Pendiente';
    order.qualityOwner = saved.qualityOwner || '';
    order.qualityNotes = saved.qualityNotes || '';
    order.needsResend = Boolean(saved.needsResend);
    const savedPhotoFiles = Array.isArray(saved.photoFiles) ? saved.photoFiles : [];
    order.photoFiles = savedPhotoFiles.length
      ? savedPhotoFiles.map((file) => ({ name: file.name || 'Foto', type: file.type || '' }))
      : (Array.isArray(saved.photos) ? saved.photos.map((name) => ({ name })) : (order.photoFiles || []));
    order.photoUrls = savedPhotoFiles.length
      ? savedPhotoFiles.map((file) => file.url || '')
      : (Array.isArray(saved.photoUrls) ? [...saved.photoUrls] : (order.photoUrls || []));
    order.photos = order.photoFiles.map((file) => file.name);
    order.guideName = saved.guideName || order.guideName || '';
    order.guideUrl = saved.guideUrl || order.guideUrl || '';
    order.guideDocument = saved.guideDocument ? { ...saved.guideDocument } : (order.guideDocument || null);
    order.documents = Object.fromEntries(['quotation', 'prescription', 'other'].map((category) => [
      category,
      Array.isArray(saved.documents?.[category]) ? saved.documents[category].map((file) => ({ ...file })) : (order.documents?.[category] || [])
    ]));
    const currentAmendments = new Map((order.amendments || []).map((amendment) => [amendment.id, amendment]));
    order.amendments = Array.isArray(saved.amendments) ? saved.amendments.map((amendment) => {
      const migratedMaterials = Array.isArray(amendment.materials)
        ? amendment.materials.map((item) => ({ ...item }))
        : (amendment.items || []).map((item) => ({
          name: `${item.quantity ? `${item.quantity} ` : ''}${item.name || 'Material'}`,
          added: ['prepared', 'delivered'].includes(amendment.status),
          addedBy: amendment.preparedBy || '',
          addedAt: amendment.preparedAt || ''
        }));
      return {
        ...amendment,
        status: amendment.status === 'available' ? 'preparing' : amendment.status === 'registered' ? 'delivered' : amendment.status,
        photoNames: Array.isArray(amendment.photoNames) ? [...amendment.photoNames] : [],
        photoUrls: Array.isArray(amendment.photoUrls) ? [...amendment.photoUrls] : (currentAmendments.get(amendment.id)?.photoUrls || []),
        guideUrl: amendment.guideUrl || currentAmendments.get(amendment.id)?.guideUrl || '',
        materials: migratedMaterials,
        history: Array.isArray(amendment.history) ? amendment.history.map((entry) => ({ ...entry })) : []
      };
    }) : (order.amendments || []);
    orderSequence = Math.max(orderSequence, Number(String(saved.id).match(/-(\d+)$/)?.[1] || 0));
  });

  const newest = shared.reduce((latest, order) => !latest || String(order.createdAt) > String(latest.createdAt) ? order : latest, null);
  if (selectNewest && newest) selectedOrderId = newest.id;
  else if (!selectedOrder()) selectedOrderId = demoOrders[0]?.id || null;
  return addedIds;
}

function selectedOrder() {
  return demoOrders.find((order) => order.id === selectedOrderId);
}

function catalogAction(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function renderOrderCatalogSelects(selectedInstitution = document.querySelector('[name="institution"]').value, selectedDriver = document.querySelector('#logistics-owner').value) {
  const institutionSelect = document.querySelector('[name="institution"]');
  institutionSelect.replaceChildren(new Option('Seleccionar institución', ''));
  institutionsCatalog.forEach((institution) => institutionSelect.add(new Option(`${institution.name} · ${institution.type}`, institution.name)));
  if (selectedInstitution && !institutionsCatalog.some((item) => item.name === selectedInstitution)) institutionSelect.add(new Option(`${selectedInstitution} (histórico)`, selectedInstitution));
  institutionSelect.value = selectedInstitution;

  const driverSelect = document.querySelector('#logistics-owner');
  driverSelect.replaceChildren(new Option('Seleccionar responsable', ''));
  driversCatalog.forEach((name) => driverSelect.add(new Option(name, name)));
  if (selectedDriver && !driversCatalog.includes(selectedDriver)) driverSelect.add(new Option(`${selectedDriver} (histórico)`, selectedDriver));
  driverSelect.value = selectedDriver;
}

function renderInstitutionCatalog() {
  const list = document.querySelector('#institutions-list');
  list.replaceChildren();
  institutionsCatalog.forEach((institution) => {
    const item = document.createElement('li');
    const label = document.createElement('div');
    label.className = 'catalog-item-main';
    const name = document.createElement('span');
    const type = document.createElement('span');
    name.textContent = institution.name;
    type.textContent = institution.type;
    type.className = 'institution-type';
    label.append(name, type);
    const actions = document.createElement('div');
    actions.className = 'catalog-row-actions';
    if (canManageCatalogs) actions.append(
      catalogAction('Editar', 'catalog-edit', () => {
        const form = document.querySelector('#institution-form');
        form.dataset.editingName = institution.name;
        form.elements.namedItem('institutionName').value = institution.name;
        form.elements.namedItem('institutionType').value = institution.type;
        document.querySelector('#institution-submit-button').textContent = 'Guardar cambios';
        document.querySelector('#cancel-institution-edit').hidden = false;
      }),
      catalogAction('Borrar', 'catalog-delete', () => {
        if (!window.confirm(`¿Borrar “${institution.name}” del catálogo?`)) return;
        institutionsCatalog.splice(institutionsCatalog.indexOf(institution), 1);
        const form = document.querySelector('#institution-form');
        if (form.dataset.editingName === institution.name) {
          form.reset();
          delete form.dataset.editingName;
          document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
          document.querySelector('#cancel-institution-edit').hidden = true;
        }
        saveSharedCatalogs();
        renderAllCatalogs();
      })
    );
    item.append(label, actions);
    list.append(item);
  });
  document.querySelector('#institution-count').textContent = String(institutionsCatalog.length);
}

function renderPeopleCatalogList(kind, values) {
  const config = kind === 'instrumentist'
    ? { list: '#instrumentists-list', form: '#instrumentist-form', feedback: '#instrumentist-feedback', roster: instrumentistsCatalog, singular: 'instrumentista' }
    : { list: '#drivers-list', form: '#driver-form', feedback: '#driver-feedback', roster: driversCatalog, singular: 'conductor' };
  const list = document.querySelector(config.list);
  list.replaceChildren();
  values.forEach((name) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const actions = document.createElement('div');
    actions.className = 'catalog-row-actions';
    if (canManageCatalogs) actions.append(
      catalogAction('Editar', 'catalog-edit', () => {
        const form = document.querySelector(config.form);
        form.dataset.editingName = name;
        form.elements.namedItem('personName').value = name;
        form.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
        form.querySelector('button[type="button"]').hidden = false;
      }),
      catalogAction('Borrar', 'catalog-delete', () => {
        if (!window.confirm(`¿Borrar “${name}” del catálogo?`)) return;
        config.roster.splice(config.roster.indexOf(name), 1);
        const form = document.querySelector(config.form);
        if (form.dataset.editingName === name) {
          form.reset();
          delete form.dataset.editingName;
          form.querySelector('button[type="submit"]').textContent = 'Añadir';
          form.querySelector('button[type="button"]').hidden = true;
        }
        saveSharedCatalogs();
        renderAllCatalogs();
      })
    );
    item.append(label, actions);
    list.append(item);
  });
}

function renderAllCatalogs() {
  renderInstitutionCatalog();
  renderPeopleCatalogList('instrumentist', instrumentistsCatalog);
  renderPeopleCatalogList('driver', driversCatalog);
  renderOrderCatalogSelects();
}

function saveInstitutionFromOrder(event) {
  event.preventDefault();
  if (!canManageCatalogs) return;
  const form = event.currentTarget;
  const name = String(new FormData(form).get('institutionName') || '').trim();
  const type = String(new FormData(form).get('institutionType') || 'Clínica');
  const editing = form.dataset.editingName || '';
  const conflict = institutionsCatalog.some((entry) => entry.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && entry.name !== editing);
  const feedback = document.querySelector('#institution-feedback');
  feedback.hidden = false;
  if (conflict) { feedback.textContent = 'Esa institución ya está en la lista.'; return; }
  if (editing) {
    const entry = institutionsCatalog.find((item) => item.name === editing);
    if (entry) Object.assign(entry, { name, type });
  } else institutionsCatalog.push({ name, type });
  saveSharedCatalogs();
  form.reset();
  delete form.dataset.editingName;
  document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
  document.querySelector('#cancel-institution-edit').hidden = true;
  feedback.textContent = editing ? 'Cambios guardados.' : 'Institución añadida al catálogo.';
  renderAllCatalogs();
}

function savePersonFromOrder(event, kind) {
  event.preventDefault();
  if (!canManageCatalogs) return;
  const form = event.currentTarget;
  const name = String(new FormData(form).get('personName') || '').trim();
  const editing = form.dataset.editingName || '';
  const roster = kind === 'instrumentist' ? instrumentistsCatalog : driversCatalog;
  const label = kind === 'instrumentist' ? 'instrumentista' : 'conductor';
  const feedback = document.querySelector(kind === 'instrumentist' ? '#instrumentist-feedback' : '#driver-feedback');
  feedback.hidden = false;
  if (roster.some((person) => person.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && person !== editing)) { feedback.textContent = `Ese ${label} ya está en la lista.`; return; }
  if (editing) roster[roster.indexOf(editing)] = name;
  else roster.push(name);
  saveSharedCatalogs();
  form.reset();
  delete form.dataset.editingName;
  form.querySelector('button[type="submit"]').textContent = 'Añadir';
  form.querySelector('button[type="button"]').hidden = true;
  feedback.textContent = editing ? 'Cambios guardados.' : `${label[0].toLocaleUpperCase('es')}${label.slice(1)} añadido al catálogo.`;
  renderAllCatalogs();
}

function resetQualityReview(order) {
  if (order.quality !== 'Aprobado') return;
  order.quality = 'Pendiente';
  order.qualityOwner = '';
  qualityStatus.value = 'Pendiente';
  qualityOwner.value = '';
}

function displaySurgery(order) {
  const date = order.surgeryDate ? new Date(`${order.surgeryDate}T12:00:00`).toLocaleDateString('es-PE') : '';
  return [date, order.surgeryTime].filter(Boolean).join(' · ') || '—';
}

function displaySetSummary(order) {
  const originalSets = order.sets.map((set) => set.name || 'Set sin nombre');
  const completedAdditions = (order.amendments || [])
    .filter((amendment) => amendment.status === 'delivered')
    .flatMap((amendment) => (amendment.materials || []).filter((material) => material.added).map((material) => material.name));
  const entries = [...originalSets, ...completedAdditions];
  return entries.length ? entries.join(', ') : 'Sin set registrado';
}

function renderOrderList() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const status = statusFilter.value;
  const filtered = demoOrders.filter((order) => {
    const matchesQuery = `${order.id} ${order.patient} ${order.institution} ${displaySetSummary(order)}`.toLocaleLowerCase('es').includes(query);
    return matchesQuery && (status === 'todos' || order.status === status);
  });
  document.querySelector('#queue-count').textContent = String(filtered.length);
  renderSummary();
  orderList.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'queue-empty';
    empty.textContent = 'No hay pedidos que coincidan con la búsqueda.';
    orderList.append(empty);
    return;
  }

  filtered.forEach((order) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `order-card${order.id === selectedOrderId ? ' active' : ''}`;
    card.setAttribute('aria-pressed', String(order.id === selectedOrderId));
    const top = document.createElement('div');
    top.className = 'order-card-top';
    const id = document.createElement('strong');
    id.textContent = order.id;
    const badge = document.createElement('span');
    badge.className = `status-pill ${statusClasses[order.status]}`;
    badge.textContent = order.needsResend ? 'Pendiente de reenviar' : statusLabels[order.status];
    top.append(id, badge);
    const patient = document.createElement('strong');
    patient.textContent = order.patient || 'Paciente: sin registrar';
    const institution = document.createElement('span');
    institution.textContent = order.institution || 'Institución: sin registrar';
    const openAmendments = (order.amendments || []).filter((amendment) => amendment.status !== 'delivered');
    const amendmentAlert = document.createElement('span');
    amendmentAlert.className = 'order-amendment-alert';
    amendmentAlert.textContent = openAmendments.length ? `${openAmendments.length} ampliación${openAmendments.length === 1 ? '' : 'es'} pendiente${openAmendments.length === 1 ? '' : 's'}` : '';
    amendmentAlert.hidden = openAmendments.length === 0;
    const set = document.createElement('span');
    set.textContent = displaySetSummary(order);
    const date = document.createElement('span');
    date.textContent = displaySurgery(order);
    card.append(top, patient, institution, amendmentAlert, set, date);
    card.addEventListener('click', () => {
      selectedOrderId = order.id;
      guideInput.value = '';
      guidePdfInput.value = '';
      photoInput.value = '';
      feedback.hidden = true;
      renderOrderList();
      renderDetail();
    });
    orderList.append(card);
  });
}

function renderSummary() {
  document.querySelector('#count-orders').textContent = String(demoOrders.length);
  document.querySelector('#count-in-process').textContent = String(demoOrders.filter((order) => ['preparation', 'inTransit'].includes(order.status)).length);
  document.querySelector('#count-interned').textContent = String(demoOrders.filter((order) => order.status === 'interned').length);
}

function renderSets(order) {
  materialList.replaceChildren();
  if (!order.sets.length) {
    const empty = document.createElement('div');
    empty.className = 'queue-empty';
    empty.textContent = 'Este pedido todavía no tiene sets registrados.';
    materialList.append(empty);
  }
  order.sets.forEach((set) => {
    const row = document.createElement('label');
    row.className = 'material-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = set.ready;
    checkbox.disabled = !canOperate || !isPreparationEditable(order);
    checkbox.setAttribute('aria-label', `Marcar ${set.name || 'set sin nombre'} como preparado`);
    checkbox.addEventListener('change', () => {
      set.ready = checkbox.checked;
      syncQualityControls(order);
      renderProgress(order);
      updateActionButtons(order);
    });
    const info = document.createElement('div');
    info.className = 'material-info';
    const name = document.createElement('strong');
    name.textContent = set.name || 'Set sin nombre';
    const description = document.createElement('small');
    description.textContent = 'Preparación del set completo';
    info.append(name, description);
    const category = document.createElement('span');
    category.className = 'material-category';
    category.textContent = 'Set';
    const quantity = document.createElement('strong');
    quantity.className = 'set-preparation-status';
    quantity.textContent = set.ready ? 'Preparado' : 'Pendiente';
    row.append(checkbox, info, category, quantity);
    materialList.append(row);
  });
  renderProgress(order);
}

function renderOrderSets(order) {
  const container = document.querySelector('#detail-sets');
  container.replaceChildren();
  const completedAdditions = (order.amendments || [])
    .filter((amendment) => amendment.status === 'delivered')
    .flatMap((amendment) => (amendment.materials || []).filter((material) => material.added).map((material) => material.name));
  if (!order.sets.length && !completedAdditions.length) {
    const empty = document.createElement('strong');
    empty.textContent = '—';
    container.append(empty);
    return;
  }
  order.sets.forEach((set) => {
    const item = document.createElement('strong');
    item.textContent = set.name || 'Set sin nombre';
    container.append(item);
  });
  completedAdditions.forEach((name) => {
    const item = document.createElement('strong');
    item.textContent = `Agregado después del internamiento · ${name}`;
    container.append(item);
  });
}

function renderProgress(order) {
  const readyCount = order.sets.filter((set) => set.ready).length;
  document.querySelector('#line-count').textContent = `${readyCount} de ${order.sets.length} sets preparados`;
  const stages = document.querySelectorAll('.workflow-step');
  let stageByStatus = 0;
  if (order.status === 'preparation') {
    const allReady = order.sets.every((set) => set.ready);
    stageByStatus = !allReady ? 1 : order.photos.length === 0 ? 2 : order.guideCreated !== 'Sí' ? 3 : order.quality !== 'Aprobado' ? 4 : 5;
  } else if (order.status === 'inTransit') stageByStatus = 5;
  else if (order.status === 'interned') stageByStatus = 6;
  stages.forEach((stage, index) => {
    stage.classList.toggle('done', index < stageByStatus || order.status === 'interned');
    stage.classList.toggle('current', index === stageByStatus && order.status !== 'interned');
  });
}

function formatAmendmentDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha pendiente' : date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}

function addAmendmentHistory(amendment, action, by, note = '') {
  if (!Array.isArray(amendment.history)) amendment.history = [];
  amendment.history.push({ action, by, note, at: new Date().toISOString() });
}

function renderAmendments(order) {
  const panel = document.querySelector('#amendments-panel');
  const list = document.querySelector('#amendment-list');
  const amendments = Array.isArray(order.amendments) ? order.amendments : [];
  panel.hidden = order.status !== 'interned' && amendments.length === 0;
  list.replaceChildren();
  if (!amendments.length) {
    const empty = document.createElement('p');
    empty.className = 'amendment-empty';
    empty.textContent = 'No hay notas posteriores para este pedido.';
    list.append(empty);
    return;
  }

  amendments.forEach((amendment) => {
    const card = document.createElement('article');
    card.className = 'amendment-card';
    const heading = document.createElement('div');
    heading.className = 'amendment-card-heading';
    const title = document.createElement('strong');
    title.textContent = 'Nota para Almacén';
    const status = document.createElement('span');
    const statusLabels = { requested: 'Pendiente de Almacén', preparing: 'En atención', prepared: 'Preparada', delivered: amendment.materials?.length ? 'Entregada' : 'Atendida' };
    const statusClasses = { requested: 'blue', preparing: 'amber', prepared: 'amber', delivered: 'green' };
    status.className = `status-pill ${statusClasses[amendment.status] || 'blue'}`;
    status.textContent = statusLabels[amendment.status] || 'Registrada';
    heading.append(title, status);
    card.append(heading);

    const description = document.createElement('p');
    description.className = 'amendment-description';
    description.textContent = amendment.description || 'Sin detalle adicional.';
    card.append(description);

    const materials = Array.isArray(amendment.materials) ? amendment.materials : [];
    const materialsSection = document.createElement('div');
    materialsSection.className = 'amendment-materials';
    const materialsTitle = document.createElement('strong');
    materialsTitle.textContent = 'Material registrado por Almacén';
    materialsSection.append(materialsTitle);
    if (!materials.length) {
      const noMaterials = document.createElement('p');
      noMaterials.textContent = amendment.status === 'preparing' ? 'Escribe cada material que se agregue para marcarlo cuando esté listo.' : 'Almacén registrará aquí los materiales agregados si aplica.';
      materialsSection.append(noMaterials);
    } else {
      const materialList = document.createElement('ul');
      materialList.className = 'amendment-material-list';
      materials.forEach((material, index) => {
        const row = document.createElement('li');
        row.className = 'amendment-material-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(material.added);
        checkbox.disabled = !canOperate || amendment.status !== 'preparing';
        checkbox.setAttribute('aria-label', `Marcar ${material.name} como agregado`);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked && !amendment.preparedBy?.trim()) {
            checkbox.checked = false;
            showFeedback('Escribe primero el responsable de Almacén antes de marcar materiales.');
            return;
          }
          material.added = checkbox.checked;
          material.addedBy = checkbox.checked ? amendment.preparedBy.trim() : '';
          material.addedAt = checkbox.checked ? new Date().toISOString() : '';
          addAmendmentHistory(amendment, checkbox.checked ? `Material marcado como agregado: ${material.name}` : `Material devuelto a pendiente: ${material.name}`, amendment.preparedBy || 'Almacén');
          publishGeneratedOrders();
          renderOrderList();
          renderDetail();
        });
        const name = document.createElement('span');
        name.textContent = material.name;
        const state = document.createElement('strong');
        state.textContent = material.added ? 'Agregado' : 'Pendiente';
        const line = document.createElement('div');
        line.append(name, state);
        if (canOperate && amendment.status === 'preparing') {
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Quitar';
          remove.addEventListener('click', () => {
            amendment.materials.splice(index, 1);
            addAmendmentHistory(amendment, `Material retirado de la lista: ${material.name}`, amendment.preparedBy || 'Almacén');
            publishGeneratedOrders();
            renderDetail();
          });
          row.append(checkbox, line, remove);
        } else row.append(checkbox, line);
        materialList.append(row);
      });
      materialsSection.append(materialList);
    }
    card.append(materialsSection);

    if (amendment.photoNames?.length) {
      const evidence = document.createElement('div');
      evidence.className = 'amendment-evidence';
      const evidenceTitle = document.createElement('strong');
      evidenceTitle.textContent = 'Fotos del material agregado';
      const evidenceList = document.createElement('ul');
      amendment.photoNames.forEach((name, index) => {
        const row = document.createElement('li');
        const url = amendment.photoUrls?.[index];
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = name;
          row.append(link);
        } else {
          row.textContent = name;
        }
        if (canOperate && amendment.status === 'preparing') {
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Quitar';
          remove.addEventListener('click', () => {
            revokeBlobUrl(amendment.photoUrls?.[index]);
            amendment.photoNames.splice(index, 1);
            amendment.photoUrls?.splice(index, 1);
            publishGeneratedOrders();
            renderDetail();
          });
          row.append(remove);
        }
        evidenceList.append(row);
      });
      evidence.append(evidenceTitle, evidenceList);
      card.append(evidence);
    }

    if (amendment.guideFileName) {
      const guideEvidence = document.createElement('div');
      guideEvidence.className = 'amendment-evidence';
      const guideTitle = document.createElement('strong');
      guideTitle.textContent = 'Guía complementaria';
      const guideName = document.createElement('span');
      guideName.textContent = amendment.guideFileName;
      if (amendment.guideUrl) {
        const guideLink = document.createElement('a');
        guideLink.href = amendment.guideUrl;
        guideLink.target = '_blank';
        guideLink.rel = 'noopener';
        guideLink.textContent = amendment.guideFileName;
        guideEvidence.append(guideTitle, guideLink);
      } else guideEvidence.append(guideTitle, guideName);
      card.append(guideEvidence);
    }

    const metadata = document.createElement('p');
    metadata.className = 'amendment-metadata';
    metadata.textContent = `Solicitado por ${amendment.requestedBy || 'Administración'} · ${formatAmendmentDate(amendment.requestedAt)}`;
    card.append(metadata);

    if (amendment.preparedBy) {
      const prepared = document.createElement('p');
      prepared.className = 'amendment-metadata';
      prepared.textContent = `Preparado por ${amendment.preparedBy}${amendment.preparedAt ? ` · ${formatAmendmentDate(amendment.preparedAt)}` : ''}`;
      card.append(prepared);
    }
    if (amendment.qualityBy) {
      const quality = document.createElement('p');
      quality.className = 'amendment-metadata';
      quality.textContent = `Control de calidad aprobado por ${amendment.qualityBy}${amendment.qualityAt ? ` · ${formatAmendmentDate(amendment.qualityAt)}` : ''}${amendment.qualityNotes ? ` · ${amendment.qualityNotes}` : ''}`;
      card.append(quality);
    }
    if (amendment.deliveredBy) {
      const delivered = document.createElement('p');
      delivered.className = 'amendment-metadata';
      delivered.textContent = `Entregado por ${amendment.deliveredBy}${amendment.deliveredAt ? ` · ${formatAmendmentDate(amendment.deliveredAt)}` : ''}${amendment.deliveryReference ? ` · ${amendment.deliveryReference}` : ''}`;
      card.append(delivered);
    }

    if (amendment.history?.length) {
      const history = document.createElement('ol');
      history.className = 'amendment-history';
      amendment.history.forEach((entry) => {
        const event = document.createElement('li');
        event.textContent = `${entry.action} · ${entry.by || 'Sistema'} · ${formatAmendmentDate(entry.at)}${entry.note ? ` · ${entry.note}` : ''}`;
        history.append(event);
      });
      card.append(history);
    }

    if (canOperate && amendment.status !== 'delivered') {
      const controls = document.createElement('div');
      controls.className = 'amendment-controls';
      if (amendment.status === 'requested') {
        const attendButton = document.createElement('button');
        attendButton.type = 'button';
        attendButton.className = 'secondary-button';
        attendButton.textContent = 'Atender en Almacén';
        attendButton.addEventListener('click', () => {
          amendment.status = 'preparing';
          addAmendmentHistory(amendment, 'Almacén inició la atención de la nota', 'Almacén');
          publishGeneratedOrders();
          renderOrderList();
          renderDetail();
          showFeedback('La nota ya está en atención por Almacén.');
        });
        controls.append(attendButton);
      } else if (amendment.status === 'preparing') {
        const responsibleLabel = document.createElement('label');
        responsibleLabel.className = 'amendment-control-label';
        responsibleLabel.textContent = 'Responsable de Almacén';
        const responsible = document.createElement('input');
        responsible.className = 'amendment-control-input';
        responsible.type = 'text';
        responsible.placeholder = 'Nombre del responsable';
        responsible.value = amendment.preparedBy || '';
        responsible.addEventListener('input', () => { amendment.preparedBy = responsible.value; });
        const addMaterialLabel = document.createElement('label');
        addMaterialLabel.className = 'amendment-control-label';
        addMaterialLabel.textContent = 'Escribe cada material que se agregue';
        const addMaterialRow = document.createElement('div');
        addMaterialRow.className = 'amendment-add-material';
        const addMaterialInput = document.createElement('input');
        addMaterialInput.className = 'amendment-control-input';
        addMaterialInput.type = 'text';
        addMaterialInput.placeholder = 'Ej.: 2 tornillos corticales 3.5 × 18 mm';
        const addMaterialButton = document.createElement('button');
        addMaterialButton.type = 'button';
        addMaterialButton.className = 'secondary-button';
        addMaterialButton.textContent = 'Añadir material';
        addMaterialButton.addEventListener('click', () => {
          const name = addMaterialInput.value.trim();
          if (!name) { addMaterialInput.focus(); return; }
          if (!Array.isArray(amendment.materials)) amendment.materials = [];
          amendment.materials.push({ name, added: false, addedBy: '', addedAt: '' });
          addAmendmentHistory(amendment, `Material anotado por Almacén: ${name}`, amendment.preparedBy || 'Almacén');
          publishGeneratedOrders();
          renderDetail();
        });
        addMaterialRow.append(addMaterialInput, addMaterialButton);
        const photosLabel = document.createElement('label');
        photosLabel.className = 'amendment-control-label';
        photosLabel.textContent = 'Fotos del material agregado';
        const photosInput = document.createElement('input');
        photosInput.className = 'amendment-photo-input';
        photosInput.type = 'file';
        photosInput.accept = 'image/png,image/jpeg';
        photosInput.multiple = true;
        photosInput.addEventListener('change', async () => {
          const files = Array.from(photosInput.files || []);
          if (!Array.isArray(amendment.photoNames)) amendment.photoNames = [];
          if (!Array.isArray(amendment.photoUrls)) amendment.photoUrls = [];
          try {
            const attachments = await filesAsAttachments(files);
            attachments.forEach((file) => {
            amendment.photoNames.push(file.name);
              amendment.photoUrls.push(file.url);
            });
            publishGeneratedOrders();
            renderDetail();
          } catch (error) {
            showFeedback(error.message || 'No se pudieron cargar las fotos.');
          }
        });
        const qualityLabel = document.createElement('label');
        qualityLabel.className = 'amendment-control-label';
        qualityLabel.textContent = 'Control de calidad';
        const quality = document.createElement('select');
        quality.className = 'amendment-control-input';
        quality.add(new Option('Pendiente de revisión', 'Pendiente'));
        quality.add(new Option('Aprobado', 'Aprobado'));
        quality.value = amendment.qualityStatus || 'Pendiente';
        quality.addEventListener('change', () => { amendment.qualityStatus = quality.value; });
        const qualityNotes = document.createElement('textarea');
        qualityNotes.className = 'amendment-control-input';
        qualityNotes.placeholder = 'Observación de calidad (opcional)';
        qualityNotes.value = amendment.qualityNotes || '';
        qualityNotes.addEventListener('input', () => { amendment.qualityNotes = qualityNotes.value; });
        const preparationError = document.createElement('p');
        preparationError.className = 'amendment-form-error';
        preparationError.hidden = true;
        const resolveButton = document.createElement('button');
        resolveButton.type = 'button';
        resolveButton.className = 'primary-button';
        resolveButton.textContent = materials.length ? 'Confirmar preparación y calidad' : 'Marcar nota como atendida';
        resolveButton.addEventListener('click', () => {
          if (!responsible.value.trim()) {
            preparationError.textContent = 'Indica el responsable de Almacén.';
            preparationError.hidden = false;
            responsible.focus();
            return;
          }
          amendment.preparedBy = responsible.value.trim();
          amendment.preparedAt = new Date().toISOString();
          if (!materials.length) {
            amendment.deliveredBy = amendment.preparedBy;
            amendment.deliveredAt = amendment.preparedAt;
            amendment.status = 'delivered';
            addAmendmentHistory(amendment, 'Nota atendida por Almacén', amendment.preparedBy);
            publishGeneratedOrders();
            renderOrderList();
            renderDetail();
            showFeedback('La nota quedó marcada como atendida.');
            return;
          }
          if (materials.some((material) => !material.added)) {
            preparationError.textContent = 'Marca cada material cuando haya sido agregado.';
            preparationError.hidden = false;
            return;
          }
          if (!amendment.photoNames?.length) {
            preparationError.textContent = 'Adjunta al menos una foto del material agregado.';
            preparationError.hidden = false;
            photosInput.focus();
            return;
          }
          if ((amendment.qualityStatus || 'Pendiente') !== 'Aprobado') {
            preparationError.textContent = 'Aprueba el control de calidad antes de confirmar la preparación.';
            preparationError.hidden = false;
            quality.focus();
            return;
          }
          amendment.qualityBy = amendment.preparedBy;
          amendment.qualityAt = amendment.preparedAt;
          amendment.status = 'prepared';
          addAmendmentHistory(amendment, 'Materiales marcados, fotografiados y aprobados en control de calidad', amendment.preparedBy, amendment.qualityNotes || '');
          publishGeneratedOrders();
          renderOrderList();
          renderDetail();
          showFeedback('Los materiales quedaron preparados para la entrega y su guía complementaria.');
        });
        controls.append(responsibleLabel, responsible, addMaterialLabel, addMaterialRow);
        if (materials.length) controls.append(photosLabel, photosInput, qualityLabel, quality, qualityNotes, preparationError);
        controls.append(resolveButton);
      } else if (amendment.status === 'prepared') {
        const responsible = document.createElement('input');
        responsible.className = 'amendment-control-input';
        responsible.type = 'text';
        responsible.placeholder = 'Responsable de entrega';
        responsible.value = amendment.deliveredBy || '';
        responsible.addEventListener('input', () => { amendment.deliveredBy = responsible.value; });
        const guideLabel = document.createElement('label');
        guideLabel.className = 'amendment-control-label';
        guideLabel.textContent = 'Guía complementaria de esta entrega';
        const guideInput = document.createElement('input');
        guideInput.className = 'amendment-photo-input';
        guideInput.type = 'file';
        guideInput.accept = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';
        guideInput.addEventListener('change', async () => {
          const file = guideInput.files?.[0];
          if (!file) return;
          try {
            amendment.guideFileName = file.name;
            amendment.guideUrl = await readFileAsDataUrl(file);
            publishGeneratedOrders();
            renderDetail();
          } catch (error) {
            showFeedback(error.message || 'No se pudo cargar la guía complementaria.');
          }
        });
        const reference = document.createElement('input');
        reference.className = 'amendment-control-input';
        reference.type = 'text';
        reference.placeholder = 'Referencia de entrega (opcional)';
        reference.value = amendment.deliveryReference || '';
        reference.addEventListener('input', () => { amendment.deliveryReference = reference.value; });
        const deliveredButton = document.createElement('button');
        deliveredButton.type = 'button';
        deliveredButton.className = 'primary-button';
        deliveredButton.textContent = 'Registrar entrega';
        deliveredButton.addEventListener('click', () => {
          if (!responsible.value.trim()) { responsible.focus(); return; }
          if (!amendment.guideFileName) {
            showFeedback('Adjunta la guía complementaria antes de registrar la entrega.');
            guideInput.focus();
            return;
          }
          amendment.deliveredBy = responsible.value.trim();
          amendment.deliveryReference = reference.value.trim();
          amendment.deliveredAt = new Date().toISOString();
          amendment.status = 'delivered';
          addAmendmentHistory(amendment, 'Entrega adicional registrada con guía complementaria', amendment.deliveredBy, amendment.deliveryReference);
          publishGeneratedOrders();
          renderOrderList();
          renderDetail();
          showFeedback('La entrega de la ampliación quedó registrada.');
        });
        controls.append(guideLabel, guideInput, responsible, reference, deliveredButton);
      }
      card.append(controls);
    }
    list.append(card);
  });
}

function renderDetail() {
  const order = selectedOrder();
  const detailCard = document.querySelector('.detail-card');
  if (!order) {
    detailCard.hidden = true;
    return;
  }
  detailCard.hidden = false;
  document.querySelector('#detail-order-id').textContent = order.id;
  document.querySelector('#detail-subtitle').textContent = `${order.institution || 'Institución sin registrar'} · ${order.patient || 'Paciente sin registrar'}`;
  document.querySelector('#detail-patient').textContent = order.patient || '—';
  document.querySelector('#detail-institution').textContent = order.institution || '—';
  document.querySelector('#detail-doctor').textContent = order.doctor || '—';
  document.querySelector('#detail-surgery').textContent = displaySurgery(order);
  renderOrderSets(order);
  document.querySelector('#detail-order-notes').textContent = order.orderNotes || 'Sin observaciones para este pedido.';
  document.querySelector('#detail-order-notes-wrap').hidden = !order.orderNotes;
  const statusBadge = document.querySelector('#detail-status');
  statusBadge.className = `status-pill ${statusClasses[order.status]}`;
  statusBadge.textContent = order.needsResend ? 'Pendiente de reenviar' : statusLabels[order.status];
  qualityStatus.value = order.quality;
  qualityOwner.value = order.qualityOwner;
  qualityNotes.value = order.qualityNotes;
  guideCreated.value = order.guideCreated;
  syncQualityControls(order);
  const assemblyOwner = document.querySelector('#assembly-owner');
  const logisticsOwner = document.querySelector('#logistics-owner');
  assemblyOwner.disabled = !canOperate || !isPreparationEditable(order);
  assemblyOwner.value = order.assemblyOwner || '';
  logisticsOwner.disabled = !canOperate || !isPreparationEditable(order);
  logisticsOwner.value = order.logisticsOwner || '';
  photoInput.disabled = !canOperate || !isPreparationEditable(order);
  guidePdfInput.disabled = !canOperate || !isPreparationEditable(order);
  guideInput.disabled = !canOperate || order.status !== 'inTransit' || Boolean(order.needsResend);
  const cancelled = order.status === 'cancelled';
  document.querySelector('#guide-section').classList.toggle('guide-locked', !canOperate || order.status === 'approved' || order.status === 'interned' || cancelled);
  document.querySelector('#signed-guide-upload').hidden = order.status !== 'inTransit' || Boolean(order.needsResend);
  document.querySelector('#save-progress').disabled = order.status === 'approved' || order.status === 'interned' || cancelled;
  document.querySelector('#edit-order-button').hidden = !canManageOrders;
  document.querySelector('#edit-order-button').disabled = order.status === 'interned' || cancelled;
  document.querySelector('#cancel-selected-order').hidden = !canManageOrders || order.status === 'interned' || cancelled;
  document.querySelector('#delete-selected-order').hidden = !canManageOrders || order.status === 'interned';
  document.querySelector('#request-amendment-button').hidden = !canRequestAmendments || order.status !== 'interned';
  document.querySelector('#save-progress').hidden = !canOperate;
  renderAmendments(order);
  renderSets(order);
  renderPhotoFiles();
  renderCreatedGuidePreview(order);
  renderGuideFile(order);
  renderOrderDocuments(order);
  renderActionState(order);
}

function syncQualityControls(order) {
  const qualityReady = canOperate && isPreparationEditable(order) && order.sets.every((set) => set.ready) && order.photos.length > 0 && order.guideCreated === 'Sí';
  qualityStatus.disabled = !qualityReady;
  qualityOwner.disabled = !qualityReady;
  qualityNotes.disabled = !qualityReady;
  guideCreated.disabled = !canOperate || !isPreparationEditable(order);
  if (order.status === 'cancelled') {
    qualityStatus.disabled = true;
    qualityOwner.disabled = true;
    qualityNotes.disabled = true;
    guideCreated.disabled = true;
  }
}

function updateActionButtons(order) {
  const allReady = order.sets.every((set) => set.ready);
  const enoughPhotos = order.photos.length > 0;
  const qualityPassed = order.quality === 'Aprobado' && order.qualityOwner.trim().length > 0;
  const logisticsAssigned = Boolean(document.querySelector('#logistics-owner').value);
  const guideIsDone = order.guideCreated === 'Sí';
  document.querySelector('#dispatch-order').disabled = !canOperate || !isPreparationEditable(order) || !allReady || !enoughPhotos || !guideIsDone || !qualityPassed || !logisticsAssigned;
  document.querySelector('#confirm-internment').disabled = !canOperate || order.status !== 'inTransit' || Boolean(order.needsResend) || !order.guideName;
}

function renderActionState(order) {
  const start = document.querySelector('#start-preparation');
  const dispatch = document.querySelector('#dispatch-order');
  const confirm = document.querySelector('#confirm-internment');
  start.hidden = !canOperate || order.status !== 'approved';
  start.disabled = !canOperate || order.status !== 'approved';
  dispatch.hidden = !canOperate || !isPreparationEditable(order);
  dispatch.textContent = order.needsResend ? 'Volver a registrar salida a institución' : 'Registrar salida a institución';
  confirm.hidden = !canOperate || order.status !== 'inTransit' || Boolean(order.needsResend);
  if (order.status === 'cancelled') {
    start.hidden = true;
    dispatch.hidden = true;
    confirm.hidden = true;
  }
  if (order.status === 'interned') {
    feedback.hidden = false;
    feedback.textContent = `Internamiento confirmado. Evidencia registrada: ${order.guideName || 'guía firmada'}.`;
  }
  const actionHelp = document.querySelector('#action-help');
  actionHelp.hidden = order.status === 'interned' || order.status === 'cancelled';
  if (currentRole === 'chief') {
    actionHelp.textContent = 'Modo de consulta: puedes revisar el pedido, sus evidencias y documentos.';
  } else if (currentRole === 'administrator') {
    actionHelp.textContent = 'Administración puede gestionar el pedido. Almacén registra la preparación, las fotos, el control y el internamiento.';
  } else if (order.status === 'approved') {
    actionHelp.textContent = 'Este pedido ya fue generado. Inicia la preparación para revisar los sets registrados.';
  } else if (order.needsResend) {
    actionHelp.textContent = 'Pedido editado después de registrar la salida. Completa o corrige lo necesario y vuelve a registrar el envío a la institución.';
  } else if (order.status === 'inTransit') {
    actionHelp.textContent = 'Adjunta la guía firmada que devuelve la institución para confirmar el internamiento.';
  } else {
    actionHelp.textContent = 'Flujo: prepara los sets, sube fotos, confirma que la guía externa esté hecha, pasa control de calidad y registra quién lo internará.';
  }
  updateActionButtons(order);
}

function renderPhotoFiles() {
  const order = selectedOrder();
  const list = document.querySelector('#photo-list');
  list.replaceChildren();
  order.photoFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'uploaded-file';
    const link = document.createElement('a');
    link.href = order.photoUrls[index];
    link.target = '_blank';
    link.rel = 'noopener';
    const image = document.createElement('img');
    image.src = order.photoUrls[index];
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = file.name;
    link.append(image, name);
    item.append(link);
    if (canOperate && isPreparationEditable(selectedOrder())) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Eliminar';
      remove.setAttribute('aria-label', `Eliminar foto ${file.name}`);
      remove.addEventListener('click', () => removePhoto(index));
      item.append(remove);
    }
    list.append(item);
  });
}

function removePhoto(index) {
  const order = selectedOrder();
  revokeBlobUrl(order.photoUrls[index]);
  order.photoFiles.splice(index, 1);
  order.photoUrls.splice(index, 1);
  order.photos = order.photoFiles.map((file) => file.name);
  resetQualityReview(order);
  renderPhotoFiles();
  syncQualityControls(order);
  renderProgress(order);
  updateActionButtons(order);
  publishGeneratedOrders();
}

function renderCreatedGuidePreview(order) {
  const preview = document.querySelector('#created-guide-preview');
  preview.replaceChildren();
  if (!order.guideDocument) return;
  const item = document.createElement('div');
  item.className = 'uploaded-file';
  const link = document.createElement('a');
  link.href = order.guideDocument.url;
  link.target = '_blank';
  link.rel = 'noopener';
  const name = document.createElement('span');
  name.textContent = order.guideDocument.name;
  link.append(name);
  item.append(link);
  if (canOperate && isPreparationEditable(order)) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      revokeBlobUrl(order.guideDocument.url);
      order.guideDocument = null;
      guidePdfInput.value = '';
      renderCreatedGuidePreview(order);
      renderOrderDocuments(order);
      publishGeneratedOrders();
    });
    item.append(remove);
  }
  preview.append(item);
}

function renderGuideFile(order) {
  const list = document.querySelector('#signed-guide-file-list');
  list.replaceChildren();
  const fileName = order.guideName;
  if (!fileName) return;
  const item = document.createElement('div');
  item.className = 'uploaded-file';
  const link = document.createElement('a');
  if (order.guideUrl) {
    link.href = order.guideUrl;
    link.target = '_blank';
    link.rel = 'noopener';
  }
  const name = document.createElement('span');
  name.textContent = `Documento adjunto: ${fileName}`;
  link.append(name);
  item.append(link);
  list.append(item);
}

function renderOrderDocuments(order) {
  const fields = [
    ['quotation', '#detail-quotation-docs'],
    ['prescription', '#detail-prescription-docs'],
    ['other', '#detail-other-docs']
  ];
  fields.forEach(([category, selector]) => {
    const list = document.querySelector(selector);
    list.replaceChildren();
    const documents = order.documents?.[category] || [];
    if (!documents.length) {
      const empty = document.createElement('li');
      empty.className = 'no-document';
      empty.textContent = '—';
      list.append(empty);
      return;
    }
    documents.forEach((documentFile) => {
      const item = document.createElement('li');
      if (documentFile.url) {
        const link = document.createElement('a');
        link.href = documentFile.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = documentFile.name;
        item.append(link);
      } else {
        item.textContent = documentFile.name;
      }
      list.append(item);
    });
  });

  const guideList = document.querySelector('#detail-guide-docs');
  guideList.replaceChildren();
  const guideEntries = [
    order.guideDocument && { label: `Guía elaborada · ${order.guideDocument.name}`, url: order.guideDocument.url },
    order.guideName && { label: `Guía firmada · ${order.guideName}`, url: order.guideUrl }
  ].filter(Boolean);
  if (!guideEntries.length) {
    const empty = document.createElement('li');
    empty.className = 'no-document';
    empty.textContent = '—';
    guideList.append(empty);
  } else {
    guideEntries.forEach((guide) => {
      const item = document.createElement('li');
      if (guide.url) {
        const link = document.createElement('a');
        link.href = guide.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = guide.label;
        item.append(link);
      } else {
        item.textContent = guide.label;
      }
      guideList.append(item);
    });
  }
}

function renderSelectedDocumentPreviews() {
  const previewTargets = [
    ['#quotation-upload', '#quotation-preview'],
    ['#prescription-upload', '#prescription-preview'],
    ['#other-docs-upload', '#other-docs-preview']
  ];
  previewTargets.forEach(([inputSelector, previewSelector]) => {
    const input = document.querySelector(inputSelector);
    const preview = document.querySelector(previewSelector);
    preview.replaceChildren();
    Array.from(input.files).forEach((file) => {
      const item = document.createElement('span');
      item.className = 'doc-file-chip';
      item.textContent = file.name;
      preview.append(item);
    });
  });
}

function renderExistingDocuments(order) {
  const wrapper = document.querySelector('#existing-documents');
  const list = document.querySelector('#existing-documents-list');
  list.replaceChildren();
  const labels = { quotation: 'Cotización', prescription: 'Receta', other: 'Otros' };
  const source = draftExistingDocuments || order.documents || {};
  const hasDocs = Object.values(source).some((files) => files.length > 0);
  wrapper.hidden = !hasDocs;
  if (!hasDocs) return;
  Object.entries(labels).forEach(([category, label]) => {
    (source[category] || []).forEach((file, fileIndex) => {
      const item = document.createElement('div');
      item.className = 'existing-doc-row';
      const name = document.createElement(file.url ? 'a' : 'span');
      name.className = 'doc-file-chip';
      name.textContent = `${label}: ${file.name}`;
      if (file.url) {
        name.href = file.url;
        name.target = '_blank';
        name.rel = 'noopener';
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Quitar';
      remove.addEventListener('click', () => {
        draftExistingDocuments[category].splice(fileIndex, 1);
        renderExistingDocuments(order);
      });
      item.append(name, remove);
      list.append(item);
    });
  });
}

function showFeedback(message) {
  feedback.hidden = false;
  feedback.textContent = message;
}

searchInput.addEventListener('input', renderOrderList);
statusFilter.addEventListener('change', renderOrderList);

photoInput.addEventListener('change', async () => {
  if (!canOperate) return;
  const order = selectedOrder();
  try {
    const attachments = await filesAsAttachments(photoInput.files);
    attachments.forEach((file) => {
      order.photoFiles.push({ name: file.name, type: file.type });
      order.photoUrls.push(file.url);
    });
    order.photos = order.photoFiles.map((file) => file.name);
  } catch (error) {
    showFeedback(error.message || 'No se pudieron cargar las fotos.');
    photoInput.value = '';
    return;
  }
  resetQualityReview(order);
  photoInput.value = '';
  renderPhotoFiles();
  syncQualityControls(order);
  renderProgress(order);
  updateActionButtons(order);
  feedback.hidden = true;
  publishGeneratedOrders();
});

guideInput.addEventListener('change', async () => {
  if (!canOperate) return;
  const order = selectedOrder();
  const file = guideInput.files[0];
  if (!file) return;
  try {
    order.guideName = file.name;
    order.guideUrl = await readFileAsDataUrl(file);
  } catch (error) {
    showFeedback(error.message || 'No se pudo cargar la guía firmada.');
    return;
  }
  renderGuideFile(order);
  renderOrderDocuments(order);
  updateActionButtons(order);
  publishGeneratedOrders();
});

guidePdfInput.addEventListener('change', async () => {
  if (!canOperate) return;
  const order = selectedOrder();
  const file = guidePdfInput.files[0];
  if (!file) return;
  try {
    order.guideDocument = { name: file.name, type: file.type || '', url: await readFileAsDataUrl(file) };
  } catch (error) {
    showFeedback(error.message || 'No se pudo cargar la guía elaborada.');
    return;
  }
  order.guideCreated = 'Sí';
  guideCreated.value = 'Sí';
  renderCreatedGuidePreview(order);
  renderOrderDocuments(order);
  syncQualityControls(order);
  renderProgress(order);
  updateActionButtons(order);
  publishGeneratedOrders();
  guidePdfInput.value = '';
});

qualityStatus.addEventListener('change', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  order.quality = qualityStatus.value;
  renderProgress(order);
  updateActionButtons(order);
});
qualityOwner.addEventListener('input', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  order.qualityOwner = qualityOwner.value;
  updateActionButtons(order);
});
qualityNotes.addEventListener('input', () => {
  if (!canOperate) return;
  selectedOrder().qualityNotes = qualityNotes.value;
});
guideCreated.addEventListener('change', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  order.guideCreated = guideCreated.value;
  if (order.guideCreated !== 'Sí' && order.quality === 'Aprobado') {
    order.quality = 'Pendiente';
    order.qualityOwner = '';
    qualityStatus.value = 'Pendiente';
    qualityOwner.value = '';
  }
  syncQualityControls(order);
  renderProgress(order);
  updateActionButtons(order);
});
document.querySelector('#logistics-owner').addEventListener('change', (event) => {
  if (!canOperate) return;
  const order = selectedOrder();
  order.logisticsOwner = event.currentTarget.value;
  updateActionButtons(order);
  publishGeneratedOrders();
});

document.querySelector('#cancel-selected-order').addEventListener('click', () => {
  if (!canManageOrders) return;
  const order = selectedOrder();
  if (!order || order.status === 'interned' || order.status === 'cancelled') return;
  if (!window.confirm(`¿Cancelar el pedido ${order.id}? Quedará disponible en el filtro de cancelados.`)) return;
  order.status = 'cancelled';
  order.needsResend = false;
  statusFilter.value = 'todos';
  renderOrderList();
  renderDetail();
  publishGeneratedOrders();
  showFeedback(`El pedido ${order.id} quedó cancelado.`);
});

document.querySelector('#delete-selected-order').addEventListener('click', () => {
  if (!canManageOrders) return;
  const order = selectedOrder();
  if (!order || order.status === 'interned') return;
  if (!window.confirm(`¿Eliminar por completo el pedido ${order.id}? Esta acción no se puede deshacer.`)) return;
  const deletedId = order.fromGenerator ? order.id : '';
  const index = demoOrders.indexOf(order);
  if (index >= 0) demoOrders.splice(index, 1);
  selectedOrderId = demoOrders[0]?.id || null;
  statusFilter.value = 'todos';
  renderOrderList();
  renderDetail();
  publishGeneratedOrders(deletedId ? [deletedId] : []);
  if (selectedOrder()) showFeedback(`El pedido ${order.id} fue eliminado.`);
});

document.querySelector('#open-institutions-catalog').addEventListener('click', () => document.querySelector('#institutions-dialog').showModal());
document.querySelector('#open-people-catalog').addEventListener('click', () => document.querySelector('#people-dialog').showModal());
document.querySelector('#close-institutions-button').addEventListener('click', () => document.querySelector('#institutions-dialog').close());
document.querySelector('#close-people-button').addEventListener('click', () => document.querySelector('#people-dialog').close());
document.querySelector('#institution-form').addEventListener('submit', saveInstitutionFromOrder);
document.querySelector('#cancel-institution-edit').addEventListener('click', () => {
  const form = document.querySelector('#institution-form');
  form.reset();
  delete form.dataset.editingName;
  document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
  document.querySelector('#cancel-institution-edit').hidden = true;
});
document.querySelector('#instrumentist-form').addEventListener('submit', (event) => savePersonFromOrder(event, 'instrumentist'));
document.querySelector('#driver-form').addEventListener('submit', (event) => savePersonFromOrder(event, 'driver'));
['#instrumentist-form', '#driver-form'].forEach((selector) => {
  const form = document.querySelector(selector);
  form.querySelector('button[type="button"]').addEventListener('click', () => {
    form.reset();
    delete form.dataset.editingName;
    form.querySelector('button[type="submit"]').textContent = 'Añadir';
    form.querySelector('button[type="button"]').hidden = true;
  });
});

document.querySelector('#start-preparation').addEventListener('click', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  if (order.status !== 'approved') return;
  order.status = 'preparation';
  statusFilter.value = 'todos';
  feedback.hidden = true;
  renderOrderList();
  renderDetail();
  publishGeneratedOrders();
  showFeedback('Preparación iniciada. Verifica el material y registra el control de calidad.');
});

document.querySelector('#save-progress').addEventListener('click', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  order.quality = qualityStatus.value;
  order.qualityOwner = qualityOwner.value.trim();
  order.qualityNotes = qualityNotes.value.trim();
  order.assemblyOwner = document.querySelector('#assembly-owner').value.trim();
  order.logisticsOwner = document.querySelector('#logistics-owner').value;
  publishGeneratedOrders();
  showFeedback('Avance registrado en la demostración. Los datos básicos del pedido también aparecen en el Cuadro de Salidas.');
  updateActionButtons(order);
});

document.querySelector('#dispatch-order').addEventListener('click', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  if (document.querySelector('#dispatch-order').disabled) return;
  const wasResend = Boolean(order.needsResend);
  order.assemblyOwner = document.querySelector('#assembly-owner').value.trim();
  order.logisticsOwner = document.querySelector('#logistics-owner').value;
  order.status = 'inTransit';
  order.needsResend = false;
  statusFilter.value = 'todos';
  feedback.hidden = true;
  renderOrderList();
  renderDetail();
  publishGeneratedOrders();
  showFeedback(wasResend
    ? 'Salida actualizada. Cuando la institución devuelva la guía firmada, adjúntala para confirmar el internamiento.'
    : 'Salida registrada. Cuando la institución devuelva la guía firmada, adjúntala para confirmar el internamiento.');
});

document.querySelector('#confirm-internment').addEventListener('click', () => {
  if (!canOperate) return;
  const order = selectedOrder();
  if (document.querySelector('#confirm-internment').disabled) return;
  order.status = 'interned';
  order.needsResend = false;
  statusFilter.value = 'todos';
  renderOrderList();
  renderDetail();
  publishGeneratedOrders();
  showFeedback('Internamiento confirmado con la guía firmada adjunta.');
});

function createOrderSetEditor(set = {}) {
  const row = document.createElement('div');
  row.className = 'order-set-editor';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Nombre del set';
  const nameInput = document.createElement('input');
  nameInput.name = 'orderSet';
  nameInput.type = 'text';
  nameInput.placeholder = 'Ej.: Set placa radio distal';
  nameInput.value = set.name || '';
  nameLabel.append(nameInput);
  const remove = document.createElement('button');
  remove.className = 'remove-order-line';
  remove.type = 'button';
  remove.textContent = '×';
  remove.setAttribute('aria-label', 'Quitar set');
  remove.addEventListener('click', () => {
    row.remove();
    updateOrderSetRemoveButtons();
  });
  row.append(nameLabel, remove);
  return row;
}

function updateOrderSetRemoveButtons() {
  const rows = Array.from(orderSetsList.querySelectorAll('.order-set-editor'));
  rows.forEach((row) => {
    row.querySelector('.remove-order-line').disabled = rows.length === 1;
  });
}

function resetOrderSetEditors(sets = []) {
  const rows = sets.length ? sets : [{}];
  orderSetsList.replaceChildren(...rows.map(createOrderSetEditor));
  updateOrderSetRemoveButtons();
}

function clearNewDocumentSelections() {
  ['#quotation-upload', '#prescription-upload', '#other-docs-upload'].forEach((selector) => {
    document.querySelector(selector).value = '';
  });
  renderSelectedDocumentPreviews();
}

function setOrderFormMode(order = null) {
  editingOrderId = order?.id || null;
  draftExistingDocuments = order
    ? Object.fromEntries(Object.entries(order.documents || {}).map(([category, files]) => [category, [...files]]))
    : null;
  createOrderForm.reset();
  resetOrderSetEditors(order?.sets || []);
  clearNewDocumentSelections();
  document.querySelector('#order-form-eyebrow').textContent = order ? `EDITAR · ${order.id}` : 'NUEVO PEDIDO';
  document.querySelector('#order-form-title').textContent = order ? 'Editar pedido' : 'Generar pedido de material';
  document.querySelector('#save-order-button').textContent = order ? 'Guardar cambios' : 'Generar pedido';
  document.querySelector('#order-form-feedback').hidden = true;
  if (order) {
    createOrderForm.elements.namedItem('patient').value = order.patient || '';
    createOrderForm.elements.namedItem('institution').value = order.institution || '';
    createOrderForm.elements.namedItem('doctor').value = order.doctor === '—' ? '' : (order.doctor || '');
    createOrderForm.elements.namedItem('personaConsiguio').value = order.personaConsiguio || '';
    createOrderForm.elements.namedItem('surgeryDate').value = order.surgeryDate || '';
    createOrderForm.elements.namedItem('surgeryTime').value = order.surgeryTime || '';
    createOrderForm.elements.namedItem('orderNotes').value = order.orderNotes || '';
    renderExistingDocuments(order);
  } else {
    document.querySelector('#existing-documents').hidden = true;
  }
  orderDialog.showModal();
}

function openAmendmentDialog(order) {
  if (!canRequestAmendments || !order || order.status !== 'interned') return;
  activeAmendmentOrderId = order.id;
  amendmentForm.reset();
  document.querySelector('#amendment-feedback').hidden = true;
  amendmentDialog.showModal();
}

document.querySelector('#create-order-button').hidden = !canManageOrders;
document.querySelector('#open-institutions-catalog').hidden = false;
document.querySelector('#open-people-catalog').hidden = false;
document.querySelector('#institution-form').hidden = !canManageCatalogs;
document.querySelector('#instrumentist-form').hidden = !canManageCatalogs;
document.querySelector('#driver-form').hidden = !canManageCatalogs;
document.querySelector('.internamiento-main .page-description').textContent = currentRole === 'administrator'
  ? 'Genera y administra pedidos; agrega notas breves a pedidos internados para que Almacén las atienda.'
  : currentRole === 'chief'
    ? 'Consulta los pedidos, las notas para Almacén y las evidencias de internamiento en modo de solo lectura.'
    : 'Genera y prepara pedidos; registra notas para Almacén y atiende las solicitudes con materiales, fotos y guías complementarias.';
document.querySelector('#create-order-button').addEventListener('click', () => { if (canManageOrders) setOrderFormMode(); });
document.querySelector('#edit-order-button').addEventListener('click', () => { if (canManageOrders) setOrderFormMode(selectedOrder()); });
document.querySelector('#request-amendment-button').addEventListener('click', () => openAmendmentDialog(selectedOrder()));
document.querySelector('#close-amendment-dialog').addEventListener('click', () => amendmentDialog.close());
document.querySelector('#cancel-amendment-button').addEventListener('click', () => amendmentDialog.close());
amendmentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const order = demoOrders.find((item) => item.id === activeAmendmentOrderId);
  if (!canRequestAmendments || !order || order.status !== 'interned') return;
  const formData = new FormData(amendmentForm);
  const description = String(formData.get('description') || '').trim();
  const requestedBy = String(formData.get('requestedBy') || '').trim();
  const timestamp = new Date().toISOString();
  const amendment = {
    id: `AMP-${Date.now()}`,
    status: 'requested',
    description,
    requestedBy,
    requestedAt: timestamp,
    materials: [],
    photoNames: [],
    photoUrls: [],
    guideFileName: '',
    guideUrl: '',
    history: [{ action: 'Nota enviada a Almacén', by: requestedBy, note: '', at: timestamp }]
  };
  if (!Array.isArray(order.amendments)) order.amendments = [];
  order.amendments.push(amendment);
  publishGeneratedOrders();
  amendmentDialog.close();
  activeAmendmentOrderId = null;
  renderOrderList();
  renderDetail();
  showFeedback('La nota quedó disponible para Almacén.');
});
document.querySelector('#add-order-set').addEventListener('click', () => {
  orderSetsList.append(createOrderSetEditor());
  updateOrderSetRemoveButtons();
});

document.querySelector('#other-docs-button').addEventListener('click', () => document.querySelector('#other-docs-upload').click());
['#quotation-upload', '#prescription-upload', '#other-docs-upload'].forEach((selector) => {
  document.querySelector(selector).addEventListener('change', renderSelectedDocumentPreviews);
});

document.querySelector('#close-order-dialog').addEventListener('click', () => orderDialog.close());
document.querySelector('#cancel-order-button').addEventListener('click', () => orderDialog.close());

createOrderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canManageOrders) return;
  const formData = new FormData(createOrderForm);
  const formSets = Array.from(orderSetsList.querySelectorAll('.order-set-editor'));
  const sets = formSets.map((row) => ({
    name: row.querySelector('[name="orderSet"]').value.trim(),
    ready: false
  })).filter((set) => set.name);
  let newDocuments;
  try {
    newDocuments = {
      quotation: await filesAsAttachments(document.querySelector('#quotation-upload').files),
      prescription: await filesAsAttachments(document.querySelector('#prescription-upload').files),
      other: await filesAsAttachments(document.querySelector('#other-docs-upload').files)
    };
  } catch (error) {
    const formFeedback = document.querySelector('#order-form-feedback');
    formFeedback.hidden = false;
    formFeedback.textContent = error.message || 'No se pudieron leer los documentos adjuntos.';
    return;
  }
  const surgeryDate = String(formData.get('surgeryDate') || '');
  const surgeryYear = surgeryDate.slice(0, 4) || String(new Date().getFullYear());
  const surgeryTime = String(formData.get('surgeryTime') || '');
  const patient = String(formData.get('patient') || '').trim();
  const institution = String(formData.get('institution') || '').trim();
  const doctor = String(formData.get('doctor') || '').trim();
  const personaConsiguio = String(formData.get('personaConsiguio') || '').trim();
  const orderNotes = String(formData.get('orderNotes') || '').trim();

  if (editingOrderId) {
    const order = demoOrders.find((item) => item.id === editingOrderId);
    if (!order) return;
    const wasInTransit = order.status === 'inTransit';
    const oldSetNames = order.sets.map((set) => set.name).join('\u001f');
    const oldReadySets = new Map(order.sets.map((set) => [set.name, set.ready]));
    order.patient = patient;
    order.institution = institution;
    order.doctor = doctor || '—';
    order.personaConsiguio = personaConsiguio;
    order.surgeryDate = surgeryDate;
    order.surgeryTime = surgeryTime;
    order.sets = sets.map((set) => ({ ...set, ready: oldReadySets.get(set.name) || false }));
    if (wasInTransit) order.needsResend = true;
    if (wasInTransit) {
      revokeBlobUrl(order.guideUrl);
      order.guideName = '';
      order.guideUrl = '';
    }
    if (oldSetNames !== order.sets.map((set) => set.name).join('\u001f')) {
      order.quality = 'Pendiente';
      order.qualityOwner = '';
    }
    order.orderNotes = orderNotes;
    Object.entries(order.documents || {}).forEach(([category, files]) => {
      const keptUrls = new Set((draftExistingDocuments?.[category] || []).map((file) => file.url));
      files.forEach((file) => {
        if (file.url && !keptUrls.has(file.url)) revokeBlobUrl(file.url);
      });
    });
    order.documents = Object.fromEntries(Object.entries(draftExistingDocuments || {}).map(([category, files]) => [category, [...files]]));
    Object.keys(newDocuments).forEach((category) => {
      order.documents[category] = [...(order.documents[category] || []), ...newDocuments[category]];
    });
    const shared = publishGeneratedOrders();
    const orderCode = order.id;
    editingOrderId = null;
    draftExistingDocuments = null;
    orderDialog.close();
    renderOrderList();
    renderDetail();
    showFeedback(shared === false
      ? `El pedido ${orderCode} se editó en esta pestaña, pero no se pudieron compartir los adjuntos. Usa archivos más pequeños.`
      : wasInTransit
        ? `El pedido ${orderCode} fue editado. Revisa los cambios y vuelve a registrar la salida a institución.`
        : `El pedido ${orderCode} fue editado. Conserva su mismo correlativo.`);
    return;
  }

  orderSequence += 1;
  const orderCode = `PED-${surgeryYear}-${String(orderSequence).padStart(4, '0')}`;
  const order = {
    id: orderCode, createdAt: new Date().toISOString(), fromGenerator: true, needsResend: false,
    patient, institution, doctor: doctor || '—', personaConsiguio, surgeryDate, surgeryTime,
    status: 'approved', assemblyOwner: '', logisticsOwner: '', orderNotes, guideCreated: 'Pendiente',
    sets, quality: 'Pendiente', qualityOwner: '', qualityNotes: '', photos: [], photoFiles: [], photoUrls: [], guideName: '', guideUrl: '', guideDocument: null,
    documents: newDocuments
  };
  demoOrders.unshift(order);
  const shared = publishGeneratedOrders();
  selectedOrderId = order.id;
  searchInput.value = '';
  statusFilter.value = 'todos';
  orderDialog.close();
  renderOrderList();
  renderDetail();
  showFeedback(shared === false
    ? `Pedido ${orderCode} generado en esta pestaña, pero no se pudieron compartir los adjuntos. Usa archivos más pequeños.`
    : `Pedido ${orderCode} generado. Ya aparece en la lista para que Almacén lo prepare.`);
});

syncSharedOrders(true);
renderOrderList();
renderDetail();
renderAllCatalogs();
const activeRole = document.querySelector('#active-role');
try {
  activeRole.textContent = `${demoRoleLabels[currentRole]} · demo`;
} catch (error) { activeRole.textContent = 'Operador · Almacén · demo'; }
document.querySelector('.logout-link').addEventListener('click', () => {
  try { sessionStorage.removeItem('meditech-demo-role'); } catch (error) { /* Estado temporal de la maqueta. */ }
});

window.addEventListener('storage', (event) => {
  if (event.key === sharedOrdersKey) {
    const addedIds = syncSharedOrders();
    if (addedIds?.length) {
      searchInput.value = '';
      statusFilter.value = 'todos';
      selectedOrderId = addedIds[addedIds.length - 1];
    }
    renderOrderList();
    renderSummary();
    renderDetail();
    return;
  }
  if (event.key !== catalogsStorageKey) return;
  try {
    const next = JSON.parse(event.newValue || '{}');
    institutionsCatalog.splice(0, institutionsCatalog.length, ...(Array.isArray(next.institutions) ? next.institutions : []));
    instrumentistsCatalog.splice(0, instrumentistsCatalog.length, ...(Array.isArray(next.instrumentists) ? next.instrumentists : []));
    driversCatalog.splice(0, driversCatalog.length, ...(Array.isArray(next.drivers) ? next.drivers : []));
    renderAllCatalogs();
  } catch (error) {
    console.warn('No se pudieron actualizar los catálogos.', error);
  }
});
