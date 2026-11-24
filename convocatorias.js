const storageKey = 'meditech-demo-convocations-v1';
const catalogsStorageKey = 'meditech-demo-catalogs-v1';
const ordersStorageKey = 'meditech-demo-orders-v1';
const roleLabels = {
  administrator: 'Administrador · Adm. / Finanzas',
  operator: 'Operador · Almacén',
  chief: 'Jefatura'
};

let role = 'operator';
try { role = sessionStorage.getItem('meditech-demo-role') || 'operator'; } catch (error) { role = 'operator'; }
if (!Object.prototype.hasOwnProperty.call(roleLabels, role)) role = 'operator';
const canOperate = role === 'operator';
const canManageCatalogs = role !== 'chief';

let records = readRecords();
let institutions = [
  { name: 'Clínica Demo Norte', type: 'Clínica' },
  { name: 'Hospital Demo Sur', type: 'Hospital' },
  { name: 'Clínica Demo Este', type: 'Clínica' }
];
let instrumentists = ['Instrumentista A', 'Instrumentista B', 'Instrumentista C'];
let drivers = ['Conductor A', 'Conductor B', 'Conductor C'];
loadSharedCatalogs();

let linkedOrders = readOrders();
let editingId = null;
let currentDocument = null;
let removeCurrentDocument = false;

const form = document.querySelector('#convocation-form');
const dialog = document.querySelector('#convocation-dialog');
const documentInput = document.querySelector('#consumption-upload');
const filePreview = document.querySelector('#consumption-file-preview');
const moduleFeedback = document.querySelector('#module-feedback');
const dialogFeedback = document.querySelector('#dialog-feedback');
const instrumentistSelect = document.querySelector('#instrumentist-select');
const linkedOrderSelect = document.querySelector('#linked-order');

const institutionsDialog = document.querySelector('#institutions-dialog');
const institutionForm = document.querySelector('#institution-form');
const institutionsList = document.querySelector('#institutions-list');
const institutionFeedback = document.querySelector('#institution-feedback');
const peopleDialog = document.querySelector('#people-dialog');

function loadSharedCatalogs() {
  try {
    const saved = JSON.parse(localStorage.getItem(catalogsStorageKey) || 'null');
    if (Array.isArray(saved?.institutions)) institutions = saved.institutions;
    if (Array.isArray(saved?.instrumentists) && saved.instrumentists.length) instrumentists = saved.instrumentists;
    if (Array.isArray(saved?.drivers) && saved.drivers.length) drivers = saved.drivers;
  } catch (error) { /* Usar valores base */ }
}

function saveSharedCatalogs() {
  try {
    localStorage.setItem(catalogsStorageKey, JSON.stringify({ institutions, instrumentists, drivers }));
  } catch (error) { /* Ignorar error */ }
}

function renderSharedCatalogsUI() {
  loadSharedCatalogs();
  if (institutionForm) institutionForm.hidden = !canManageCatalogs;
  const instFormPeople = document.querySelector('#instrumentist-form');
  const drvFormPeople = document.querySelector('#driver-form');
  if (instFormPeople) instFormPeople.hidden = !canManageCatalogs;
  if (drvFormPeople) drvFormPeople.hidden = !canManageCatalogs;

  if (institutionsList) {
    institutionsList.replaceChildren();
    institutions.forEach((inst) => {
      const li = document.createElement('li');
      const main = document.createElement('div');
      main.className = 'catalog-item-main';
      const name = document.createElement('span');
      name.textContent = inst.name;
      const type = document.createElement('span');
      type.className = 'institution-type';
      type.textContent = inst.type;
      main.append(name, type);

      const actions = document.createElement('div');
      actions.className = 'catalog-row-actions';
      if (canManageCatalogs) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'catalog-edit';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => {
          institutionForm.dataset.editingName = inst.name;
          institutionForm.elements.namedItem('institutionName').value = inst.name;
          institutionForm.elements.namedItem('institutionType').value = inst.type;
          document.querySelector('#institution-submit-button').textContent = 'Guardar cambios';
          document.querySelector('#cancel-institution-edit').hidden = false;
          institutionFeedback.hidden = true;
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'catalog-delete';
        delBtn.textContent = 'Borrar';
        delBtn.addEventListener('click', () => {
          if (!window.confirm(`¿Borrar “${inst.name}” del catálogo?`)) return;
          institutions = institutions.filter((item) => item.name !== inst.name);
          saveSharedCatalogs();
          renderSharedCatalogsUI();
        });
        actions.append(editBtn, delBtn);
      }
      li.append(main, actions);
      institutionsList.append(li);
    });
    const countEl = document.querySelector('#institution-count');
    if (countEl) countEl.textContent = String(institutions.length);
  }

  renderPeopleCatalogList(instrumentists, '#instrumentists-list', 'instrumentist');
  renderPeopleCatalogList(drivers, '#drivers-list', 'driver');
}

function renderPeopleCatalogList(listArray, selector, kind) {
  const ul = document.querySelector(selector);
  if (!ul) return;
  ul.replaceChildren();
  listArray.forEach((person) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = person;
    const actions = document.createElement('div');
    actions.className = 'catalog-row-actions';

    if (canManageCatalogs) {
      const formId = kind === 'instrumentist' ? '#instrumentist-form' : '#driver-form';
      const submitId = kind === 'instrumentist' ? '#instrumentist-submit-button' : '#driver-submit-button';
      const cancelId = kind === 'instrumentist' ? '#cancel-instrumentist-edit' : '#cancel-driver-edit';
      const feedbackId = kind === 'instrumentist' ? '#instrumentist-feedback' : '#driver-feedback';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'catalog-edit';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => {
        const f = document.querySelector(formId);
        f.dataset.editingName = person;
        f.elements.namedItem('personName').value = person;
        document.querySelector(submitId).textContent = 'Guardar cambios';
        document.querySelector(cancelId).hidden = false;
        document.querySelector(feedbackId).hidden = true;
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'catalog-delete';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', () => {
        if (!window.confirm(`¿Borrar “${person}” del catálogo?`)) return;
        if (kind === 'instrumentist') instrumentists = instrumentists.filter((p) => p !== person);
        else drivers = drivers.filter((p) => p !== person);
        saveSharedCatalogs();
        renderSharedCatalogsUI();
      });
      actions.append(editBtn, delBtn);
    }
    li.append(span, actions);
    ul.append(li);
  });
}

document.querySelector('#manage-institutions-link')?.addEventListener('click', () => {
  renderSharedCatalogsUI();
  institutionsDialog.showModal();
});
document.querySelector('#close-institutions-button')?.addEventListener('click', () => institutionsDialog.close());

document.querySelector('#manage-people-link')?.addEventListener('click', () => {
  renderSharedCatalogsUI();
  peopleDialog.showModal();
});
document.querySelector('#close-people-button')?.addEventListener('click', () => peopleDialog.close());

institutionForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!canManageCatalogs) return;
  const fd = new FormData(institutionForm);
  const name = String(fd.get('institutionName') || '').trim();
  const type = String(fd.get('institutionType') || 'Clínica');
  const editingName = institutionForm.dataset.editingName || null;

  if (institutions.some((i) => i.name.toLowerCase() === name.toLowerCase() && i.name !== editingName)) {
    institutionFeedback.textContent = 'Esa institución ya está en la lista.';
    institutionFeedback.hidden = false;
    return;
  }
  if (editingName) {
    const item = institutions.find((i) => i.name === editingName);
    if (item) { item.name = name; item.type = type; }
  } else {
    institutions.push({ name, type });
  }
  saveSharedCatalogs();
  institutionForm.reset();
  delete institutionForm.dataset.editingName;
  document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
  document.querySelector('#cancel-institution-edit').hidden = true;
  institutionFeedback.textContent = editingName ? 'Cambios guardados.' : 'Institución añadida.';
  institutionFeedback.hidden = false;
  renderSharedCatalogsUI();
});

document.querySelector('#cancel-institution-edit')?.addEventListener('click', () => {
  institutionForm.reset();
  delete institutionForm.dataset.editingName;
  document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
  document.querySelector('#cancel-institution-edit').hidden = true;
  institutionFeedback.hidden = true;
});

function handlePersonSubmit(e, kind) {
  e.preventDefault();
  if (!canManageCatalogs) return;
  const formEl = e.currentTarget;
  const name = String(new FormData(formEl).get('personName') || '').trim();
  const editingName = formEl.dataset.editingName || null;
  const list = kind === 'instrumentist' ? instrumentists : drivers;
  const feedback = document.querySelector(kind === 'instrumentist' ? '#instrumentist-feedback' : '#driver-feedback');

  if (list.some((p) => p.toLowerCase() === name.toLowerCase() && p !== editingName)) {
    feedback.textContent = 'Ese nombre ya está en la lista.';
    feedback.hidden = false;
    return;
  }
  if (editingName) {
    const idx = list.indexOf(editingName);
    if (idx >= 0) list[idx] = name;
  } else {
    list.push(name);
  }
  saveSharedCatalogs();
  formEl.reset();
  delete formEl.dataset.editingName;
  formEl.querySelector('button[type="submit"]').textContent = 'Añadir';
  formEl.querySelector('button[type="button"]').hidden = true;
  feedback.textContent = editingName ? 'Cambios guardados.' : 'Añadido al catálogo.';
  feedback.hidden = false;
  renderSharedCatalogsUI();
}

document.querySelector('#instrumentist-form')?.addEventListener('submit', (e) => handlePersonSubmit(e, 'instrumentist'));
document.querySelector('#driver-form')?.addEventListener('submit', (e) => handlePersonSubmit(e, 'driver'));

document.querySelector('#cancel-instrumentist-edit')?.addEventListener('click', () => {
  const f = document.querySelector('#instrumentist-form');
  f.reset();
  delete f.dataset.editingName;
  document.querySelector('#instrumentist-submit-button').textContent = 'Añadir';
  document.querySelector('#cancel-instrumentist-edit').hidden = true;
  document.querySelector('#instrumentist-feedback').hidden = true;
});

document.querySelector('#cancel-driver-edit')?.addEventListener('click', () => {
  const f = document.querySelector('#driver-form');
  f.reset();
  delete f.dataset.editingName;
  document.querySelector('#driver-submit-button').textContent = 'Añadir';
  document.querySelector('#cancel-driver-edit').hidden = true;
  document.querySelector('#driver-feedback').hidden = true;
});

function demoRecords() {
  return [
    {
      id: 'CI-DEMO-0002', createdAt: new Date().toISOString(), orderId: 'PED-0261', patient: 'Paciente demo 01',
      requiresInstrumentist: true, institution: 'Clínica Demo Norte', doctor: 'Dr. Ejemplo', instrumentist: 'Instrumentista A',
      surgeryDate: '2026-11-05', surgeryTime: '08:00', status: 'Confirmado', calledBy: 'Operador demo',
      notes: 'Convocatoria confirmada para la cirugía.', consumptionDocument: null
    },
    {
      id: 'CI-DEMO-0001', createdAt: new Date().toISOString(), orderId: 'PED-0260', patient: 'Paciente demo 02',
      requiresInstrumentist: false, institution: 'Hospital Demo Sur', doctor: 'Dra. Ejemplo', instrumentist: '',
      surgeryDate: '2026-11-01', surgeryTime: '15:00', status: '', calledBy: 'Operador demo',
      notes: '', consumptionDocument: null
    }
  ];
}

function readRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(saved)) return saved.map((record) => ({ requiresInstrumentist: record.requiresInstrumentist !== false, ...record }));
    const initial = demoRecords();
    try { localStorage.setItem(storageKey, JSON.stringify(initial)); } catch (error) { /* La maqueta también puede abrirse en modo sin almacenamiento. */ }
    return initial;
  } catch (error) {
    return demoRecords();
  }
}

function readOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(ordersStorageKey) || '[]');
    const examples = [
      { id: 'PED-0261', patient: 'Paciente demo 01', institution: 'Clínica Demo Norte', doctor: 'Dr. Ejemplo', surgeryDate: '2026-11-05', surgeryTime: '08:00' },
      { id: 'PED-0260', patient: 'Paciente demo 02', institution: 'Hospital Demo Sur', doctor: 'Dra. Ejemplo', surgeryDate: '2026-11-01', surgeryTime: '15:00' },
      { id: 'PED-0259', patient: 'Paciente demo 03', institution: 'Clínica Demo Este', doctor: 'Dr. Ejemplo 2', surgeryDate: '2026-11-02', surgeryTime: '10:30' }
    ];
    const byId = new Map(examples.map((order) => [order.id, order]));
    if (Array.isArray(saved)) saved.forEach((order) => {
      if (order.status === 'cancelled') byId.delete(order.id);
      else byId.set(order.id, order);
    });
    return [...byId.values()];
  } catch (error) {
    return [];
  }
}

function saveRecords() {
  try {
    const serialized = JSON.stringify(records);
    if (serialized.length > 4_000_000) {
      showDialogFeedback('Los archivos adjuntos superan la capacidad de esta demostración. Usa una imagen o PDF más pequeño.');
      return false;
    }
    localStorage.setItem(storageKey, serialized);
    return true;
  } catch (error) {
    showDialogFeedback('No se pudieron guardar los cambios en este navegador. Prueba con un archivo más pequeño.');
    return false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer el archivo.')), { once: true });
    reader.addEventListener('error', () => reject(new Error(`No se pudo leer ${file.name}.`)), { once: true });
    reader.readAsDataURL(file);
  });
}

function showDialogFeedback(message) {
  dialogFeedback.hidden = false;
  dialogFeedback.textContent = message;
}

function showModuleFeedback(message) {
  moduleFeedback.hidden = false;
  moduleFeedback.textContent = message;
}

function formatDate(value) {
  if (!value) return 'Fecha pendiente';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Fecha pendiente' : date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusClass(status) {
  if (status === 'Confirmado') return 'green';
  if (status === 'Pendiente') return 'amber';
  if (status === 'Cancelado') return 'red';
  return 'blue';
}

function renderCatalogs(selected = '') {
  loadSharedCatalogs();
  instrumentistSelect.replaceChildren(new Option('Seleccionar instrumentista', ''));
  instrumentists.forEach((name) => instrumentistSelect.add(new Option(name, name)));
  if (selected && !instrumentists.includes(selected)) instrumentistSelect.add(new Option(`${selected} (histórico)`, selected));
  instrumentistSelect.value = selected;
}

function renderOrderOptions(selected = '') {
  linkedOrderSelect.replaceChildren(new Option('Sin vincular a un pedido', ''));
  linkedOrders.forEach((order) => {
    const patient = order.patient || 'Paciente sin registrar';
    const institution = order.institution || 'Institución sin registrar';
    linkedOrderSelect.add(new Option(`${order.id} · ${patient} · ${institution}`, order.id));
  });
  if (selected && !linkedOrders.some((order) => order.id === selected)) linkedOrderSelect.add(new Option(`${selected} (histórico)`, selected));
  linkedOrderSelect.value = selected;
}

function showDocumentPreview(documentData) {
  filePreview.replaceChildren();
  if (!documentData) {
    filePreview.textContent = 'Aún no hay documento de consumo adjunto.';
    return;
  }
  const label = document.createElement('span');
  label.textContent = 'Documento actual: ';
  const link = document.createElement('a');
  link.href = documentData.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = documentData.name;
  filePreview.append(label, link);
}

function setReadOnly(readOnly) {
  form.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = readOnly; });
  const doesNotRequire = form.elements.namedItem('requiresInstrumentist').value === 'No';
  instrumentistSelect.disabled = readOnly || doesNotRequire;
  form.elements.namedItem('status').disabled = readOnly || doesNotRequire;
  document.querySelector('#no-instrumentist-hint').hidden = !doesNotRequire;
  document.querySelector('#save-convocation').hidden = readOnly;
  document.querySelector('#remove-consumption-file').hidden = readOnly || !currentDocument;
  document.querySelector('#cancel-dialog').textContent = readOnly ? 'Cerrar' : 'Cancelar';
}

function openDialog(record = null, readOnly = false) {
  editingId = record?.id || null;
  currentDocument = record?.consumptionDocument ? { ...record.consumptionDocument } : null;
  removeCurrentDocument = false;
  form.reset();
  dialogFeedback.hidden = true;
  documentInput.value = '';
  renderCatalogs(record?.instrumentist || '');
  renderOrderOptions(record?.orderId || '');
  document.querySelector('#dialog-eyebrow').textContent = readOnly ? 'CONSULTA' : record ? `EDITAR · ${record.id}` : 'NUEVO REGISTRO';
  document.querySelector('#dialog-title').textContent = readOnly ? `Convocatoria ${record.id}` : record ? 'Editar convocatoria' : 'Registrar convocatoria';
  document.querySelector('#save-convocation').textContent = record ? 'Guardar cambios' : 'Guardar convocatoria';
  form.elements.namedItem('patient').value = record?.patient || '';
  form.elements.namedItem('institution').value = record?.institution || '';
  form.elements.namedItem('doctor').value = record?.doctor || '';
  form.elements.namedItem('requiresInstrumentist').value = record?.requiresInstrumentist === false ? 'No' : 'Sí';
  form.elements.namedItem('surgeryDate').value = record?.surgeryDate || '';
  form.elements.namedItem('surgeryTime').value = record?.surgeryTime || '';
  form.elements.namedItem('status').value = record?.requiresInstrumentist === false ? '' : (record?.status || 'Pendiente');
  form.elements.namedItem('calledBy').value = record?.calledBy || '';
  form.elements.namedItem('notes').value = record?.notes || '';
  showDocumentPreview(currentDocument);
  setReadOnly(readOnly || !canOperate);
  dialog.showModal();
}

function renderSummary() {
  document.querySelector('#summary-total').textContent = String(records.length);
  document.querySelector('#summary-pending').textContent = String(records.filter((record) => record.requiresInstrumentist !== false && record.status === 'Pendiente').length);
  document.querySelector('#summary-consumption').textContent = String(records.filter((record) => record.consumptionDocument?.url).length);
}

function renderTable() {
  const body = document.querySelector('#convocations-body');
  const query = document.querySelector('#search-input').value.trim().toLocaleLowerCase('es');
  const filter = document.querySelector('#status-filter').value;
  const filtered = [...records].sort((a, b) => `${a.surgeryDate || ''} ${a.surgeryTime || ''}`.localeCompare(`${b.surgeryDate || ''} ${b.surgeryTime || ''}`));
  const matches = filtered.filter((record) => {
    const text = [record.id, record.orderId, record.patient, record.institution, record.doctor, record.instrumentist, record.calledBy].join(' ').toLocaleLowerCase('es');
    const displayStatus = record.requiresInstrumentist === false ? 'No requiere' : record.status;
    return (!query || text.includes(query)) && (filter === 'todos' || displayStatus === filter);
  });
  body.replaceChildren();
  document.querySelector('#empty-state').hidden = matches.length > 0;
  document.querySelector('#record-count').textContent = `${matches.length} ${matches.length === 1 ? 'registro' : 'registros'}`;
  renderSummary();

  matches.forEach((record) => {
    const row = document.createElement('tr');
    const idCell = document.createElement('td');
    const id = document.createElement('span');
    id.className = 'cell-primary';
    id.textContent = record.id;
    idCell.append(id);
    if (record.orderId) {
      const subline = document.createElement('small');
      subline.className = 'convocation-subline';
      subline.textContent = record.orderId;
      idCell.append(subline);
    }

    const dateCell = document.createElement('td');
    const date = document.createElement('span');
    date.className = 'cell-primary';
    date.textContent = formatDate(record.surgeryDate);
    const time = document.createElement('small');
    time.className = 'convocation-subline';
    time.textContent = record.surgeryTime || 'Hora pendiente';
    dateCell.append(date, time);

    const patientCell = document.createElement('td');
    const patient = document.createElement('span');
    patient.className = 'cell-primary';
    patient.textContent = record.patient || 'Paciente sin registrar';
    const institution = document.createElement('small');
    institution.className = 'convocation-subline';
    institution.textContent = record.institution || 'Institución sin registrar';
    patientCell.append(patient, institution);

    const doctorCell = document.createElement('td');
    const doctor = document.createElement('span');
    doctor.className = 'cell-primary';
    doctor.textContent = record.doctor || '—';
    doctorCell.append(doctor);

    const instrumentistCell = document.createElement('td');
    const instrumentist = document.createElement('span');
    instrumentist.className = 'cell-primary';
    instrumentist.textContent = record.requiresInstrumentist === false ? 'No requiere' : (record.instrumentist || 'Sin asignar');
    instrumentistCell.append(instrumentist);

    const statusCell = document.createElement('td');
    if (record.requiresInstrumentist === false) {
      const noStatus = document.createElement('span');
      noStatus.className = 'convocation-no-state';
      noStatus.textContent = '—';
      statusCell.append(noStatus);
    } else {
      const status = document.createElement('span');
      status.className = `status-pill ${statusClass(record.status)}`;
      status.textContent = record.status || 'Pendiente';
      statusCell.append(status);
    }

    const documentCell = document.createElement('td');
    if (record.consumptionDocument?.url) {
      const link = document.createElement('a');
      link.className = 'consumption-link';
      link.href = record.consumptionDocument.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `Ver ${record.consumptionDocument.name}`;
      documentCell.append(link);
    } else {
      const pending = document.createElement('span');
      pending.className = 'consumption-pending';
      pending.textContent = 'Pendiente de adjuntar';
      documentCell.append(pending);
    }

    const actionCell = document.createElement('td');
    const action = document.createElement('button');
    action.type = 'button';
    action.className = `convocation-action${canOperate ? '' : ' view'}`;
    action.textContent = canOperate ? 'Editar' : 'Ver';
    action.addEventListener('click', () => openDialog(record, !canOperate));
    actionCell.append(action);

    row.append(idCell, dateCell, patientCell, doctorCell, instrumentistCell, statusCell, documentCell, actionCell);
    body.append(row);
  });
}

function nextId() {
  const year = new Date().getFullYear();
  const highest = records.reduce((max, record) => {
    const match = String(record.id).match(new RegExp(`^CI-${year}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `CI-${year}-${String(highest + 1).padStart(4, '0')}`;
}

document.querySelector('#active-role').textContent = `${roleLabels[role]} · demo`;
document.querySelector('#new-convocation-button').hidden = !canOperate;
document.querySelector('#new-convocation-button').addEventListener('click', () => openDialog());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#remove-consumption-file').addEventListener('click', () => {
  removeCurrentDocument = true;
  currentDocument = null;
  documentInput.value = '';
  showDocumentPreview(null);
  document.querySelector('#remove-consumption-file').hidden = true;
});
document.querySelector('#requires-instrumentist').addEventListener('change', (event) => {
  const status = form.elements.namedItem('status');
  if (event.currentTarget.value === 'No') status.value = '';
  else if (!status.value) status.value = 'Pendiente';
  setReadOnly(!canOperate);
});
documentInput.addEventListener('change', () => {
  const file = documentInput.files?.[0];
  if (!file) return;
  filePreview.replaceChildren();
  const label = document.createElement('span');
  label.textContent = 'Se adjuntará al guardar: ';
  const name = document.createElement('strong');
  name.textContent = file.name;
  filePreview.append(label, name);
});

linkedOrderSelect.addEventListener('change', () => {
  const order = linkedOrders.find((item) => item.id === linkedOrderSelect.value);
  if (!order) return;
  form.elements.namedItem('patient').value = order.patient || '';
  form.elements.namedItem('institution').value = order.institution || '';
  form.elements.namedItem('doctor').value = order.doctor === '—' ? '' : (order.doctor || '');
  form.elements.namedItem('surgeryDate').value = order.surgeryDate || '';
  form.elements.namedItem('surgeryTime').value = order.surgeryTime || '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canOperate) return;
  dialogFeedback.hidden = true;
  const formData = new FormData(form);
  const requiresInstrumentist = formData.get('requiresInstrumentist') === 'Sí';
  const instrumentist = String(formData.get('instrumentist') || '').trim();
  if (requiresInstrumentist && !instrumentist) {
    showDialogFeedback('Selecciona el instrumentista solicitado.');
    instrumentistSelect.focus();
    return;
  }
  const file = documentInput.files?.[0];
  let uploadedDocument = null;
  if (file) {
    try {
      uploadedDocument = { name: file.name, type: file.type || '', url: await readFileAsDataUrl(file) };
    } catch (error) {
      showDialogFeedback(error.message || 'No se pudo leer el documento del consumo.');
      return;
    }
  }

  const existing = records.find((record) => record.id === editingId);
  const record = existing || { id: nextId(), createdAt: new Date().toISOString(), consumptionDocument: null };
  Object.assign(record, {
    orderId: String(formData.get('orderId') || ''),
    patient: String(formData.get('patient') || '').trim(),
    institution: String(formData.get('institution') || '').trim(),
    doctor: String(formData.get('doctor') || '').trim(),
    requiresInstrumentist,
    instrumentist: requiresInstrumentist ? instrumentist : '',
    surgeryDate: String(formData.get('surgeryDate') || ''),
    surgeryTime: String(formData.get('surgeryTime') || ''),
    status: requiresInstrumentist ? String(formData.get('status') || 'Pendiente') : '',
    calledBy: String(formData.get('calledBy') || '').trim(),
    notes: String(formData.get('notes') || '').trim(),
    updatedAt: new Date().toISOString()
  });
  if (uploadedDocument) record.consumptionDocument = uploadedDocument;
  else if (removeCurrentDocument) record.consumptionDocument = null;
  if (!existing) records.unshift(record);
  if (!saveRecords()) return;

  dialog.close();
  renderTable();
  showModuleFeedback(existing ? `Se actualizaron los datos de ${record.id}.` : `Se registró la convocatoria ${record.id}.`);
});

document.querySelector('#search-input').addEventListener('input', renderTable);
document.querySelector('#status-filter').addEventListener('change', renderTable);

window.addEventListener('storage', (event) => {
  if (event.key === storageKey) {
    try { records = JSON.parse(event.newValue || '[]').map((record) => ({ requiresInstrumentist: record.requiresInstrumentist !== false, ...record })); } catch (error) { records = []; }
    if (!Array.isArray(records)) records = [];
    renderTable();
  } else if (event.key === catalogsStorageKey) {
    renderSharedCatalogsUI();
    if (dialog.open && !form.elements.namedItem('instrumentist').disabled) renderCatalogs(instrumentistSelect.value);
  } else if (event.key === ordersStorageKey) {
    linkedOrders = readOrders();
    if (dialog.open && !linkedOrderSelect.disabled) renderOrderOptions(linkedOrderSelect.value);
  }
});

renderTable();