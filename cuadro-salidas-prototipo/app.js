const columns = [
  'N.º', 'Fecha', 'N.º de guía', 'N.º de pedido', 'Tipo de atención', 'Paciente',
  'Hospital / clínica', 'Cirujano', 'Material', 'Persona que consiguió la venta',
  'Persona que subió la venta', 'Instrumentista solicitado', 'Estado del material',
  'Conductor', 'Consumo', 'Fecha de CX', 'Hora de CX', 'Guía de remisión',
  'Observaciones de Almacén', 'Fecha de recojo', 'Orden de compra', 'Monto',
  'N.º de factura', 'Persona que comunica la venta', 'Monto cobrado', 'Estado de cobranza',
  'Fecha de depósito', 'N.º de operación', 'Banco', 'Responsable de cobro',
  'Bono al doctor', 'Estado del comprobante de cobranza', 'Voucher', 'Observación'
];

const demoRoleLabels = {
  administrator: 'Administrador · Adm. / Finanzas',
  operator: 'Operador · Almacén',
  chief: 'Jefatura'
};
let currentRole = 'operator';
try { currentRole = sessionStorage.getItem('meditech-demo-role') || 'operator'; } catch (error) { currentRole = 'operator'; }
if (!['administrator', 'operator', 'chief'].includes(currentRole)) currentRole = 'operator';
const canEditWarehouse = currentRole === 'operator';
const canEditOffice = currentRole === 'administrator';
const canEditRecords = canEditWarehouse || canEditOffice;
const canManageCatalogs = currentRole !== 'chief';
const visibleColumns = currentRole === 'operator' ? columns.slice(0, 20) : columns;
const showActionColumn = currentRole !== 'chief';

const catalogsStorageKey = 'meditech-demo-catalogs-v1';
const cuadroRecordsKey = 'meditech-demo-records-v1';
const pickupsStorageKey = 'meditech-demo-pickups-v1';

let storedCatalogs = null;
try { storedCatalogs = JSON.parse(localStorage.getItem(catalogsStorageKey) || 'null'); } catch (error) { storedCatalogs = null; }

const institutions = Array.isArray(storedCatalogs?.institutions) ? storedCatalogs.institutions : [
  { name: 'Clínica Demo Norte', type: 'Clínica' },
  { name: 'Hospital Demo Sur', type: 'Hospital' },
  { name: 'Clínica Demo Este', type: 'Clínica' }
];

const instrumentists = Array.isArray(storedCatalogs?.instrumentists) ? storedCatalogs.instrumentists : ['Instrumentista A', 'Instrumentista B', 'Instrumentista C'];
const drivers = Array.isArray(storedCatalogs?.drivers) ? storedCatalogs.drivers : ['Conductor A', 'Conductor B', 'Conductor C'];

function saveSharedCatalogs() {
  try {
    localStorage.setItem(catalogsStorageKey, JSON.stringify({ institutions, instrumentists, drivers }));
  } catch (error) {
    console.warn('No se pudieron guardar los catálogos compartidos.', error);
  }
}

const consumables = [
  { code: 'CON-DEMO-001', name: 'Tornillo cortical demo 3.5 x 16', available: 18 },
  { code: 'CON-DEMO-002', name: 'Tornillo de bloqueo demo 5.0 x 44', available: 12 },
  { code: 'CON-DEMO-003', name: 'Clavo guía demo 1.6', available: 9 }
];

const defaultRecords = [
  {
    id: 'row-1', code: 'CS-1101', fecha: '03/11/2026', guia: '001-2026-0261', pedido: 'PED-0261', tipo: 'Cirugía',
    paciente: 'Paciente demo 01', institucion: 'Clínica Demo Norte', cirujano: 'Dr. Ejemplo',
    material: 'Set placa radio distal · 3 cajas', personaConsiguio: 'Personal demo A',
    personaSubio: 'Personal demo B', instrumentista: 'Instrumentista A', estadoMaterial: 'En internamiento',
    conductor: 'Conductor A', consumoItems: [], fechaCx: '05/11/2026', horaCx: '08:00',
    guiaRemision: 'T001-2601', obsOperativa: 'Registro ficticio', fechaRecojo: '05/11/2026',
    ordenCompra: 'OC-0261', monto: 'S/ 4,500.00', factura: 'F001-0000261', comunicaVenta: 'Personal demo A',
    montoCobrado: 'S/ 0.00', estadoCobranza: 'Pendiente', fechaDeposito: '—', operacion: '—',
    banco: '—', responsableCobro: 'Finanzas A', bonoDoctor: 'Pendiente', estadoVoucher: 'Pendiente',
    voucher: '—', obsFinanciera: '—'
  },
  {
    id: 'row-2', code: 'CS-1002', fecha: '31/10/2026', guia: '001-2026-0260', pedido: 'PED-0260', tipo: 'Cirugía',
    paciente: 'Paciente demo 02', institucion: 'Hospital Demo Sur', cirujano: 'Dra. Ejemplo',
    material: 'Set clavo intramedular · 2 cajas', personaConsiguio: 'Personal demo B',
    personaSubio: 'Personal demo A', instrumentista: 'Instrumentista B', estadoMaterial: 'Recogido',
    conductor: 'Conductor B', consumoItems: [
      { code: 'CON-DEMO-001', quantity: 1 },
      { code: 'CON-DEMO-002', quantity: 1 },
      { code: 'CON-DEMO-003', quantity: 1 }
    ],
    fechaCx: '01/11/2026', horaCx: '15:00', guiaRemision: 'T001-2600',
    obsOperativa: 'Registro ficticio', fechaRecojo: '01/11/2026', ordenCompra: 'OC-0260',
    monto: 'S/ 3,200.00', factura: 'F001-0000260', comunicaVenta: 'Personal demo B', montoCobrado: 'S/ 3,200.00',
    estadoCobranza: 'Cobrado', fechaDeposito: '04/11/2026', operacion: 'OP-26004', banco: 'Banco demo',
    responsableCobro: 'Finanzas B', bonoDoctor: 'Registrado', estadoVoucher: 'Adjunto',
    voucher: 'Archivo demo', obsFinanciera: 'Registro ficticio'
  },
  {
    id: 'row-3', code: 'CS-1001', fecha: '29/10/2026', guia: '001-2026-0259', pedido: 'PED-0259', tipo: 'Cirugía',
    paciente: 'Paciente demo 03', institucion: 'Clínica Demo Este', cirujano: 'Dr. Ejemplo 2',
    material: 'Set placa clavícula · 2 cajas', personaConsiguio: 'Personal demo C',
    personaSubio: 'Personal demo A', instrumentista: 'Instrumentista C', estadoMaterial: 'Pendiente de recojo',
    conductor: 'Conductor A', consumoItems: [], fechaCx: '02/11/2026', horaCx: '10:30',
    guiaRemision: 'T001-2599', obsOperativa: 'Registro ficticio', fechaRecojo: 'Pendiente',
    ordenCompra: 'Pendiente', monto: 'S/ 2,850.00', factura: 'Pendiente', comunicaVenta: 'Pendiente',
    montoCobrado: 'S/ 0.00', estadoCobranza: 'Pendiente', fechaDeposito: '—', operacion: '—',
    banco: '—', responsableCobro: '—', bonoDoctor: 'Pendiente', estadoVoucher: 'Pendiente',
    voucher: '—', obsFinanciera: '—'
  }
];

let records = [];
try {
  const savedRecords = JSON.parse(localStorage.getItem(cuadroRecordsKey) || 'null');
  records = Array.isArray(savedRecords) && savedRecords.length ? savedRecords : defaultRecords;
} catch (error) {
  records = defaultRecords;
}

function saveCuadroRecords() {
  try {
    localStorage.setItem(cuadroRecordsKey, JSON.stringify(records));
  } catch (error) {
    console.warn('No se pudieron guardar los registros del Cuadro de Salidas.', error);
  }
}

const headings = document.querySelector('#column-headings');
const body = document.querySelector('#records-body');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const searchColumnSelect = document.querySelector('#search-column');
const invoiceFilter = document.querySelector('#invoice-filter');
const newRecordDialog = document.querySelector('#new-record-dialog');
const newRecordForm = document.querySelector('#new-record-form');
const institutionSelect = document.querySelector('#institution-select');
const instrumentistSelect = document.querySelector('#instrumentist-select');
const driverSelect = document.querySelector('#driver-select');
const institutionsDialog = document.querySelector('#institutions-dialog');
const institutionForm = document.querySelector('#institution-form');
const institutionsList = document.querySelector('#institutions-list');
const institutionFeedback = document.querySelector('#institution-feedback');
const peopleDialog = document.querySelector('#people-dialog');
const consumptionDialog = document.querySelector('#consumption-dialog');
const consumptionLineForm = document.querySelector('#consumption-line-form');
const consumableSearch = document.querySelector('#consumable-search');
const consumableOptions = document.querySelector('#consumable-options');
const consumptionLinesList = document.querySelector('#consumption-lines');
const consumptionFeedback = document.querySelector('#consumption-feedback');
const voucherCaptureInput = document.querySelector('#voucher-capture');
const voucherCapturePreview = document.querySelector('#voucher-capture-preview');

let editingRecordId = null;
let activeConsumptionRecordId = null;
let consumptionDraft = [];
let selectedConsumableCode = null;
let voucherDraftFile = null;
let voucherDraftUrl = '';
let voucherRemoveExisting = false;
let activeMonth = monthKeyFromDisplay(records[0].fecha);

visibleColumns.forEach((label) => {
  const th = document.createElement('th');
  th.scope = 'col';
  th.textContent = label;
  headings.append(th);
  searchColumnSelect.add(new Option(label, label));
});
const actionHeading = document.createElement('th');
actionHeading.scope = 'col';
actionHeading.textContent = canEditOffice ? 'Acciones de oficina' : 'Acciones de Almacén';
actionHeading.hidden = !showActionColumn;
if (showActionColumn) headings.append(actionHeading);

const warehouseGroupHeading = document.querySelector('.group-warehouse');
const adminGroupHeading = document.querySelector('.group-admin');
const financeGroupHeading = document.querySelector('.group-finance');
const actionGroupHeading = document.querySelector('.group-actions');
warehouseGroupHeading.colSpan = 20;
adminGroupHeading.hidden = currentRole === 'operator';
financeGroupHeading.hidden = currentRole === 'operator';
actionGroupHeading.hidden = !showActionColumn;
if (currentRole === 'operator') actionGroupHeading.colSpan = 1;
document.querySelector('#new-record-button').hidden = !canEditWarehouse;
document.querySelector('#manage-institutions-link').hidden = false;
document.querySelector('#manage-people-link').hidden = false;
document.querySelector('#invoice-filter').hidden = currentRole === 'operator';
document.querySelector('label[for="invoice-filter"]').hidden = currentRole === 'operator';
document.querySelector('.summary-card:nth-child(3)').hidden = currentRole === 'operator';
document.querySelector('.summary-grid').classList.toggle('warehouse-summary', currentRole === 'operator');
document.querySelector('#manage-institutions-button').hidden = !canEditWarehouse;
document.querySelector('#manage-instrumentists-button').hidden = !canEditWarehouse;
document.querySelector('#manage-drivers-button').hidden = !canEditWarehouse;
document.querySelector('#institution-form').hidden = !canManageCatalogs;
document.querySelector('#instrumentist-form').hidden = !canManageCatalogs;
document.querySelector('#driver-form').hidden = !canManageCatalogs;
document.querySelector('#records-table').classList.toggle('warehouse-only', currentRole === 'operator');
document.querySelector('.page-description').textContent = currentRole === 'operator'
  ? 'Registra y consulta la información operativa del área de Almacén.'
  : currentRole === 'administrator'
    ? 'Consulta los datos de Almacén y completa la información de Administración y Finanzas.'
    : 'Consulta la trazabilidad completa de las salidas en modo de solo lectura.';

function valueForColumn(record, label) {
  const fieldByLabel = {
    'N.º': 'code', 'Fecha': 'fecha', 'N.º de guía': 'guia', 'N.º de pedido': 'pedido',
    'Tipo de atención': 'tipo', 'Paciente': 'paciente', 'Hospital / clínica': 'institucion',
    'Cirujano': 'cirujano', 'Material': 'material',
    'Persona que consiguió la venta': 'personaConsiguio', 'Persona que subió la venta': 'personaSubio',
    'Instrumentista solicitado': 'instrumentista', 'Estado del material': 'estadoMaterial',
    'Conductor': 'conductor', 'Fecha de CX': 'fechaCx', 'Hora de CX': 'horaCx',
    'Guía de remisión': 'guiaRemision', 'Observaciones de Almacén': 'obsOperativa',
    'Fecha de recojo': 'fechaRecojo', 'Orden de compra': 'ordenCompra', 'Monto': 'monto',
    'N.º de factura': 'factura', 'Persona que comunica la venta': 'comunicaVenta', 'Monto cobrado': 'montoCobrado',
    'Estado de cobranza': 'estadoCobranza', 'Fecha de depósito': 'fechaDeposito',
    'N.º de operación': 'operacion', 'Banco': 'banco', 'Responsable de cobro': 'responsableCobro',
    'Bono al doctor': 'bonoDoctor', 'Estado del comprobante de cobranza': 'estadoVoucher', 'Voucher': 'voucher',
    'Observación': 'obsFinanciera'
  };
  const value = record[fieldByLabel[label]];
  const statusColumns = ['Estado del material', 'Estado de cobranza', 'Estado del comprobante de cobranza'];
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  if (value === 'Pendiente' && !statusColumns.includes(label)) return '—';
  return value;
}

function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function searchableValue(record, label) {
  if (label === 'Consumo') {
    return (record.consumoItems || []).map((line) => {
      const product = productByCode(line.code);
      return `${line.code} ${product?.name ?? ''} ${line.quantity}`;
    }).join(' ');
  }
  return valueForColumn(record, label);
}

function statusColor(value) {
  const text = String(value).toLowerCase();
  if (text.includes('cancelado')) return 'red';
  if (text.includes('cobrado') || text.includes('adjunto') || text.includes('recogido') || text.includes('internado')) return 'green';
  if (text.includes('pendiente')) return 'amber';
  return 'blue';
}

function makeConsumptionCell(record) {
  const td = document.createElement('td');
  td.className = 'consumption-column';
  const lines = record.consumoItems || [];
  if (!lines.length) {
    const empty = document.createElement('span');
    empty.className = 'muted-consumption';
    empty.textContent = '—';
    td.append(empty);
    return td;
  }

  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const summary = document.createElement('strong');
  summary.className = 'consumption-summary';
  summary.textContent = `${total} pz · ${lines.length} ${lines.length === 1 ? 'código' : 'códigos'}`;
  const detailList = document.createElement('ul');
  detailList.className = 'consumption-cell-lines';
  lines.forEach((line) => {
    const product = productByCode(line.code);
    const detail = document.createElement('li');
    detail.textContent = `${line.quantity} × ${line.code} · ${product?.name ?? 'Consumible'}`;
    detailList.append(detail);
  });
  td.append(summary, detailList);
  return td;
}

function makeCell(label, record) {
  const td = document.createElement('td');
  if (label === 'Consumo') return makeConsumptionCell(record);
  if (label === 'Acciones') {
    if (!canEditRecords) return td;
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'table-action';
    editButton.textContent = canEditWarehouse ? 'Editar Almacén' : 'Editar Administración / Finanzas';
    editButton.addEventListener('click', () => openRecordDialog(record));
    actions.append(editButton);
    if (canEditWarehouse) {
      const consumptionButton = document.createElement('button');
      consumptionButton.type = 'button';
      consumptionButton.className = 'table-action subtle';
      consumptionButton.textContent = record.consumoItems?.length ? 'Editar consumo' : 'Registrar consumo';
      consumptionButton.addEventListener('click', () => openConsumptionDialog(record));
      actions.append(consumptionButton);
    }
    td.append(actions);
    return td;
  }

  const value = valueForColumn(record, label);
  if (['N.º', 'Paciente', 'Hospital / clínica'].includes(label)) td.classList.add('cell-primary');
  if (label === 'Voucher' && record.voucherUrl) {
    const attachmentLink = document.createElement('a');
    attachmentLink.href = record.voucherUrl;
    attachmentLink.target = '_blank';
    attachmentLink.rel = 'noopener';
    attachmentLink.textContent = record.voucherFileName || 'Ver captura';
    td.append(attachmentLink);
  } else if (['Estado del material', 'Estado de cobranza', 'Estado del comprobante de cobranza'].includes(label)) {
    const pill = document.createElement('span');
    pill.className = `status-pill ${statusColor(value)}`;
    pill.textContent = value;
    td.append(pill);
  } else {
    td.textContent = value;
  }
  return td;
}

function monthKeyFromDisplay(value) {
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, '0')}`;
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

function renderMonthTabs() {
  const tabs = document.querySelector('#month-tabs');
  tabs.replaceChildren();
  const monthKeys = [...new Set(records.map((record) => monthKeyFromDisplay(record.fecha)).filter(Boolean))].sort().reverse();
  const options = [{ key: 'all', label: 'Todos los meses' }, ...monthKeys.map((key) => ({ key, label: monthLabel(key) }))];
  if (activeMonth !== 'all' && !monthKeys.includes(activeMonth)) activeMonth = monthKeys[0] || 'all';
  options.forEach(({ key, label }) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `month-tab${activeMonth === key ? ' active' : ''}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(activeMonth === key));
    tab.textContent = label;
    tab.addEventListener('click', () => {
      activeMonth = key;
      render();
    });
    tabs.append(tab);
  });
}

function visibleRecords() {
  const term = normalizeSearchText(searchInput.value.trim());
  const selectedColumn = searchColumnSelect.value;
  const invoice = invoiceFilter.value;
  return records.filter((record) => {
    const searchColumns = selectedColumn === 'all' ? visibleColumns : [selectedColumn];
    const matchesSearch = !term || searchColumns.some((label) => normalizeSearchText(searchableValue(record, label)).includes(term));
    const matchesInvoice = invoice === 'all'
      || (invoice === 'invoiced' && record.factura !== 'Pendiente')
      || (invoice === 'pending' && record.factura === 'Pendiente');
    const matchesMonth = activeMonth === 'all' || monthKeyFromDisplay(record.fecha) === activeMonth;
    return matchesSearch && matchesInvoice && matchesMonth;
  });
}

function render() {
  renderMonthTabs();
  const rows = visibleRecords();
  body.replaceChildren();
  rows.forEach((record) => {
    const tr = document.createElement('tr');
    visibleColumns.forEach((label) => tr.append(makeCell(label, record)));
    if (showActionColumn) tr.append(makeCell('Acciones', record));
    body.append(tr);
  });
  emptyState.hidden = rows.length > 0;
  document.querySelector('#record-count').textContent = String(rows.length);
  document.querySelector('#pickup-count').textContent = String(rows.filter((item) => item.estadoMaterial.toLowerCase().includes('pendiente de recojo')).length);
  document.querySelector('#invoiced-count').textContent = String(rows.filter((item) => item.factura !== 'Pendiente').length);
  document.querySelector('#table-result-count').textContent = `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`;
  saveCuadroRecords();
}

function populateSelect(select, items, placeholder, getValue = (item) => item) {
  const currentValue = select.value;
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach((item) => {
    const value = getValue(item);
    select.add(new Option(value, value));
  });
  if (items.some((item) => getValue(item) === currentValue)) select.value = currentValue;
}

function preserveHistoricalOption(select, value, activeValues) {
  if (!value || value === 'Pendiente' || value === '—' || activeValues.includes(value)) return;
  select.add(new Option(`${value} (histórico)`, value));
}

function renderInstitutions() {
  populateSelect(institutionSelect, institutions, 'Seleccionar institución', (item) => item.name);
  institutionsList.replaceChildren();
  institutions.forEach((institution) => {
    const item = document.createElement('li');
    const main = document.createElement('div');
    const name = document.createElement('span');
    const type = document.createElement('span');
    const actions = document.createElement('div');
    name.textContent = institution.name;
    type.textContent = institution.type;
    type.className = 'institution-type';
    main.className = 'catalog-item-main';
    main.append(name, type);
    actions.className = 'catalog-row-actions';
    if (canManageCatalogs) actions.append(
      makeCatalogAction('Editar', 'catalog-edit', () => startInstitutionEdit(institution.name)),
      makeCatalogAction('Borrar', 'catalog-delete', () => deleteInstitution(institution.name))
    );
    item.append(main, actions);
    institutionsList.append(item);
  });
  document.querySelector('#institution-count').textContent = String(institutions.length);
}

function renderPeople() {
  populateSelect(instrumentistSelect, instrumentists, 'Seleccionar instrumentista');
  populateSelect(driverSelect, drivers, 'Seleccionar conductor');
  renderSimpleList(instrumentists, '#instrumentists-list', {
    form: document.querySelector('#instrumentist-form'), roster: instrumentists, select: instrumentistSelect,
    feedback: document.querySelector('#instrumentist-feedback'), submit: document.querySelector('#instrumentist-submit-button'),
    cancel: document.querySelector('#cancel-instrumentist-edit'), kind: 'instrumentista'
  });
  renderSimpleList(drivers, '#drivers-list', {
    form: document.querySelector('#driver-form'), roster: drivers, select: driverSelect,
    feedback: document.querySelector('#driver-feedback'), submit: document.querySelector('#driver-submit-button'),
    cancel: document.querySelector('#cancel-driver-edit'), kind: 'conductor'
  });
}

function makeCatalogAction(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderSimpleList(values, selector, config) {
  const list = document.querySelector(selector);
  list.replaceChildren();
  values.forEach((value) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    const actions = document.createElement('div');
    name.textContent = value;
    actions.className = 'catalog-row-actions';
    if (canManageCatalogs) actions.append(
      makeCatalogAction('Editar', 'catalog-edit', () => startPersonEdit(value, config)),
      makeCatalogAction('Borrar', 'catalog-delete', () => deletePerson(value, config))
    );
    item.append(name, actions);
    list.append(item);
  });
}

function startInstitutionEdit(name) {
  if (!canManageCatalogs) return;
  const institution = institutions.find((item) => item.name === name);
  if (!institution) return;
  institutionForm.dataset.editingName = name;
  institutionForm.elements.namedItem('institutionName').value = institution.name;
  institutionForm.elements.namedItem('institutionType').value = institution.type;
  document.querySelector('#institution-submit-button').textContent = 'Guardar cambios';
  document.querySelector('#cancel-institution-edit').hidden = false;
  institutionFeedback.hidden = true;
}

function resetInstitutionForm() {
  institutionForm.reset();
  delete institutionForm.dataset.editingName;
  document.querySelector('#institution-submit-button').textContent = 'Añadir institución';
  document.querySelector('#cancel-institution-edit').hidden = true;
}

function deleteInstitution(name) {
  if (!canManageCatalogs) return;
  if (!window.confirm(`¿Borrar “${name}” del catálogo? Los registros existentes conservarán el nombre guardado.`)) return;
  const index = institutions.findIndex((item) => item.name === name);
  if (index >= 0) institutions.splice(index, 1);
  if (institutionForm.dataset.editingName === name) resetInstitutionForm();
  saveSharedCatalogs();
  renderInstitutions();
  institutionFeedback.hidden = false;
  institutionFeedback.textContent = 'Institución borrada del catálogo. Los registros existentes se conservaron.';
}

function startPersonEdit(name, config) {
  if (!canManageCatalogs) return;
  config.form.dataset.editingName = name;
  config.form.elements.namedItem('personName').value = name;
  config.submit.textContent = 'Guardar cambios';
  config.cancel.hidden = false;
  config.feedback.hidden = true;
}

function resetPersonForm(config) {
  config.form.reset();
  delete config.form.dataset.editingName;
  config.submit.textContent = 'Añadir';
  config.cancel.hidden = true;
}

function savePerson(event, config) {
  event.preventDefault();
  if (!canManageCatalogs) return;
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get('personName')).trim();
  const editingName = form.dataset.editingName || null;
  const exists = config.roster.some((person) => person.toLowerCase() === name.toLowerCase() && person !== editingName);
  config.feedback.hidden = false;
  if (exists) {
    config.feedback.textContent = `Ese ${config.kind} ya está en la lista.`;
    return;
  }
  const index = editingName ? config.roster.indexOf(editingName) : -1;
  if (index >= 0) config.roster[index] = name;
  else config.roster.push(name);
  saveSharedCatalogs();
  renderPeople();
  config.select.value = name;
  resetPersonForm(config);
  config.feedback.hidden = false;
  config.feedback.textContent = editingName ? 'Cambios guardados.' : 'Añadido al prototipo y seleccionado.';
}

function deletePerson(name, config) {
  if (!canManageCatalogs) return;
  if (!window.confirm(`¿Borrar “${name}” del catálogo? Los registros existentes conservarán el nombre guardado.`)) return;
  const index = config.roster.indexOf(name);
  if (index >= 0) config.roster.splice(index, 1);
  if (config.form.dataset.editingName === name) resetPersonForm(config);
  saveSharedCatalogs();
  renderPeople();
  config.feedback.hidden = false;
  config.feedback.textContent = `${config.kind} borrado del catálogo. Los registros existentes se conservaron.`;
}

function displayDateToInput(value) {
  if (!value || value === 'Pendiente' || value === '—') return '';
  const parts = value.split('/');
  return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : '';
}

function inputDateToDisplay(value) {
  if (!value) return 'Pendiente';
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-PE');
}

function todayISODate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function makeVisibleCode(isoDate) {
  const [, month] = isoDate.split('-');
  const yearMonth = isoDate.slice(0, 7);
  const nextNumber = records.filter((record) => monthKeyFromDisplay(record.fecha) === yearMonth).length + 1;
  return `CS-${month}${String(nextNumber).padStart(2, '0')}`;
}

const sharedOrdersKey = 'meditech-demo-orders-v1';

function syncGeneratedOrders() {
  let sharedOrders = [];
  try {
    sharedOrders = JSON.parse(localStorage.getItem(sharedOrdersKey) || '[]');
  } catch (error) {
    console.warn('No se pudieron leer los pedidos compartidos.', error);
    return;
  }
  if (!Array.isArray(sharedOrders)) return;

  const sharedIds = new Set(sharedOrders.map((order) => order.id));
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].generatedFromOrder && !sharedIds.has(records[index].generatedFromOrder)) records.splice(index, 1);
  }

  sharedOrders.forEach((order) => {
    const createdDate = new Date(order.createdAt || Date.now());
    const dateParts = createdDate.toLocaleDateString('es-PE').split('/');
    const displayDate = createdDate.toLocaleDateString('es-PE');
    const isoDate = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
      : todayISODate();
    const existing = records.find((record) => record.generatedFromOrder === order.id || record.pedido === order.id);
    const data = {
      fecha: displayDate,
      pedido: order.id,
      tipo: 'Cirugía',
      paciente: order.patient || '—',
      institucion: order.institution || '—',
      cirujano: order.doctor || '—',
      material: [
        ...(order.sets || []).map((set) => typeof set === 'string' ? set : set?.name).filter(Boolean),
        ...(order.amendments || []).filter((amendment) => amendment.status === 'delivered')
          .flatMap((amendment) => (amendment.materials || []).filter((item) => item.added).map((item) => item.name))
      ].join(', ') || '—',
      personaConsiguio: order.personaConsiguio || existing?.personaConsiguio || '—',
      conductor: existing?.estadoMaterial === 'Recogido' ? existing.conductor : (order.logisticsOwner || existing?.conductor || 'Pendiente'),
      estadoMaterial: existing?.estadoMaterial === 'Recogido'
        ? 'Recogido'
        : (order.status === 'interned' ? 'Internado' : order.status === 'cancelled' ? 'Cancelado' : 'En internamiento'),
      fechaCx: order.surgeryDate ? inputDateToDisplay(order.surgeryDate) : 'Pendiente',
      horaCx: order.surgeryTime || 'Pendiente',
      obsOperativa: order.orderNotes || '—'
    };

    if (existing) {
      existing.generatedFromOrder = order.id;
      Object.assign(existing, data);
      return;
    }

    const newRecord = {
      id: `order-${order.id}`,
      generatedFromOrder: order.id,
      code: makeVisibleCode(isoDate),
      guia: 'Pendiente',
      ...data,
      personaSubio: '—', instrumentista: 'Sin convocatoria',
      consumoItems: [], guiaRemision: 'Pendiente', fechaRecojo: 'Pendiente',
      ordenCompra: 'Pendiente', monto: 'Pendiente', factura: 'Pendiente', comunicaVenta: 'Pendiente',
      montoCobrado: 'S/ 0.00', estadoCobranza: 'Pendiente', fechaDeposito: '—', operacion: '—',
      banco: '—', responsableCobro: '—', bonoDoctor: 'Pendiente', estadoVoucher: 'Pendiente',
      voucher: '—', obsFinanciera: '—'
    };
    records.unshift(newRecord);
  });

  const newest = sharedOrders.reduce((latest, order) => {
    return !latest || String(order.createdAt) > String(latest.createdAt) ? order : latest;
  }, null);
  if (newest) {
    const newestDate = new Date(newest.createdAt || Date.now());
    const [day, month, year] = newestDate.toLocaleDateString('es-PE').split('/');
    activeMonth = `${year}-${month.padStart(2, '0')}`;
  }
}

// Pasar automáticamente a "Pendiente de recojo" en Cuadro de Salidas cuando ya pasó la hora de cirugía
function updatePastSurgeriesStatusInCuadro() {
  records.forEach((record) => {
    if (!record || ['Recogido', 'Cancelado'].includes(record.estadoMaterial)) return;
    if (!record.fechaCx || record.fechaCx === 'Pendiente' || record.fechaCx === '—') return;
    const parts = String(record.fechaCx).trim().split('/');
    if (parts.length !== 3) return;
    const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const cleanTime = String(record.horaCx || '00:00').trim();
    const timePart = /^\d{1,2}:\d{2}$/.test(cleanTime) ? cleanTime.padStart(5, '0') : '00:00';
    const surgeryDt = new Date(`${isoDate}T${timePart}:00`);
    if (!Number.isNaN(surgeryDt.getTime()) && surgeryDt.getTime() <= Date.now()) {
      record.estadoMaterial = 'Pendiente de recojo';
    }
  });
}

// Recibir automáticamente los datos editados en Recojo de material
function syncPickupsToRecords() {
  let pickups = [];
  try {
    pickups = JSON.parse(localStorage.getItem(pickupsStorageKey) || '[]');
  } catch (error) {
    console.warn('No se pudieron leer los recojos compartidos.', error);
    return;
  }
  if (!Array.isArray(pickups)) return;

  pickups.forEach((pickup) => {
    if (!pickup) return;
    const target = records.find(
      (record) => (pickup.salidaRowId && record.id === pickup.salidaRowId)
        || (pickup.salidaCode && record.code === pickup.salidaCode)
        || (pickup.orderId && (record.generatedFromOrder === pickup.orderId || record.pedido === pickup.orderId))
    );
    if (!target) return;

    if (pickup.driver) {
      target.conductor = pickup.driver;
    }
    if (pickup.status && pickup.status !== 'Cancelado') {
      target.estadoMaterial = pickup.status;
    }
    if (pickup.pickupDate) {
      target.fechaRecojo = inputDateToDisplay(pickup.pickupDate);
    }
  });
}

const sharedConvocationsKey = 'meditech-demo-convocations-v1';

function syncInstrumentistRequests() {
  let convocations = [];
  try {
    convocations = JSON.parse(localStorage.getItem(sharedConvocationsKey) || '[]');
  } catch (error) {
    console.warn('No se pudieron leer las convocatorias compartidas.', error);
    return;
  }
  if (!Array.isArray(convocations)) return;

  const latestByOrder = new Map();
  convocations.filter((entry) => entry.orderId).forEach((entry) => {
    const current = latestByOrder.get(entry.orderId);
    const entryDate = String(entry.updatedAt || entry.createdAt || '');
    const currentDate = String(current?.updatedAt || current?.createdAt || '');
    if (!current || entryDate >= currentDate) latestByOrder.set(entry.orderId, entry);
  });

  records.forEach((record) => {
    const orderId = record.generatedFromOrder || record.pedido;
    if (!orderId) return;
    const request = latestByOrder.get(orderId);
    if (!request) {
      if (record.generatedFromOrder && (!record.instrumentista || record.instrumentista === 'Pendiente')) {
        record.instrumentista = 'Sin convocatoria';
      }
      return;
    }
    record.instrumentista = request.requiresInstrumentist === false
      ? 'No requiere'
      : (request.instrumentist || 'Pendiente');
  });
}

function openRecordDialog(record = null) {
  if (!canEditRecords || (canEditOffice && !record)) return;
  editingRecordId = record?.id ?? null;
  discardVoucherDraft();
  newRecordForm.reset();
  const warehouseSection = document.querySelector('[data-role-section="warehouse"]');
  const officeSection = document.querySelector('[data-role-section="office"]');
  warehouseSection.hidden = canEditOffice;
  officeSection.hidden = !canEditOffice;
  warehouseSection.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = !canEditWarehouse; });
  officeSection.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = !canEditOffice; });
  renderInstitutions();
  renderPeople();
  if (!record) {
    newRecordForm.elements.namedItem('fecha').value = todayISODate();
    newRecordForm.elements.namedItem('estadoMaterial').value = 'En internamiento';
  } else {
    preserveHistoricalOption(institutionSelect, record.institucion, institutions.map((item) => item.name));
    preserveHistoricalOption(instrumentistSelect, record.instrumentista, instrumentists);
    preserveHistoricalOption(driverSelect, record.conductor, drivers);
    newRecordForm.elements.namedItem('fecha').value = displayDateToInput(record.fecha);
    newRecordForm.elements.namedItem('pedido').value = record.pedido;
    newRecordForm.elements.namedItem('tipo').value = record.tipo;
    newRecordForm.elements.namedItem('paciente').value = record.paciente;
    newRecordForm.elements.namedItem('institucion').value = record.institucion;
    newRecordForm.elements.namedItem('cirujano').value = record.cirujano === '—' ? '' : record.cirujano;
    newRecordForm.elements.namedItem('personaConsiguio').value = record.personaConsiguio === '—' ? '' : record.personaConsiguio;
    newRecordForm.elements.namedItem('personaSubio').value = record.personaSubio === '—' ? '' : record.personaSubio;
    newRecordForm.elements.namedItem('instrumentista').value = record.instrumentista;
    newRecordForm.elements.namedItem('conductor').value = record.conductor === 'Pendiente' ? '' : record.conductor;
    newRecordForm.elements.namedItem('material').value = record.material;
    newRecordForm.elements.namedItem('fechaCx').value = displayDateToInput(record.fechaCx);
    newRecordForm.elements.namedItem('horaCx').value = record.horaCx === 'Pendiente' ? '' : record.horaCx;
    newRecordForm.elements.namedItem('guia').value = record.guia === 'Pendiente' ? '' : record.guia;
    newRecordForm.elements.namedItem('guiaRemision').value = record.guiaRemision === 'Pendiente' ? '' : record.guiaRemision;
    newRecordForm.elements.namedItem('fechaRecojo').value = displayDateToInput(record.fechaRecojo);
    newRecordForm.elements.namedItem('estadoMaterial').value = record.estadoMaterial;
    newRecordForm.elements.namedItem('obsOperativa').value = record.obsOperativa === '—' ? '' : record.obsOperativa;
    newRecordForm.elements.namedItem('ordenCompra').value = record.ordenCompra === 'Pendiente' ? '' : (record.ordenCompra || '');
    newRecordForm.elements.namedItem('monto').value = record.monto === 'Pendiente' ? '' : (record.monto || '');
    newRecordForm.elements.namedItem('factura').value = record.factura === 'Pendiente' ? '' : (record.factura || '');
    newRecordForm.elements.namedItem('comunicaVenta').value = record.comunicaVenta === 'Pendiente' || record.comunicaVenta === '—' ? '' : (record.comunicaVenta || '');
    newRecordForm.elements.namedItem('montoCobrado').value = record.montoCobrado || '';
    newRecordForm.elements.namedItem('estadoCobranza').value = record.estadoCobranza || 'Pendiente';
    newRecordForm.elements.namedItem('fechaDeposito').value = displayDateToInput(record.fechaDeposito);
    newRecordForm.elements.namedItem('operacion').value = record.operacion === '—' ? '' : (record.operacion || '');
    newRecordForm.elements.namedItem('banco').value = record.banco === '—' ? '' : (record.banco || '');
    newRecordForm.elements.namedItem('responsableCobro').value = record.responsableCobro === '—' ? '' : (record.responsableCobro || '');
    newRecordForm.elements.namedItem('bonoDoctor').value = record.bonoDoctor === 'Pendiente' ? '' : (record.bonoDoctor || '');
    newRecordForm.elements.namedItem('estadoVoucher').value = record.estadoVoucher || 'Pendiente';
    newRecordForm.elements.namedItem('voucher').value = record.voucher === '—' ? '' : (record.voucher || '');
    newRecordForm.elements.namedItem('obsFinanciera').value = record.obsFinanciera === '—' ? '' : (record.obsFinanciera || '');
    renderVoucherCapturePreview(record);
  }
  document.querySelector('#save-record-button').textContent = canEditOffice ? 'Guardar Administración / Finanzas' : (record ? 'Guardar cambios' : 'Agregar al prototipo');
  document.querySelector('#record-dialog-title').textContent = canEditOffice ? 'Completar Administración y Finanzas' : (record ? 'Editar salida de Almacén' : 'Registrar salida');
  document.querySelector('#new-record-form .dialog-note').textContent = canEditOffice
    ? 'Edita únicamente los campos de Administración y Finanzas. La información de Almacén ya se consulta en el cuadro de salidas.'
    : 'Registra o corrige los campos de Almacén. Los datos de Administración y Finanzas no están disponibles para este rol.';
  newRecordDialog.showModal();
}

function discardVoucherDraft() {
  if (voucherDraftUrl) URL.revokeObjectURL(voucherDraftUrl);
  voucherDraftFile = null;
  voucherDraftUrl = '';
  voucherRemoveExisting = false;
  if (voucherCaptureInput) voucherCaptureInput.value = '';
  if (voucherCapturePreview) {
    voucherCapturePreview.replaceChildren();
    voucherCapturePreview.hidden = true;
  }
}

function renderVoucherCapturePreview(record = records.find((entry) => entry.id === editingRecordId)) {
  if (!voucherCapturePreview) return;
  voucherCapturePreview.replaceChildren();
  const hasDraft = Boolean(voucherDraftFile && voucherDraftUrl);
  const hasExisting = Boolean(record?.voucherUrl && !voucherRemoveExisting);
  if (!hasDraft && !hasExisting) {
    voucherCapturePreview.hidden = true;
    return;
  }

  const image = document.createElement('img');
  image.className = 'voucher-capture-thumbnail';
  image.src = hasDraft ? voucherDraftUrl : record.voucherUrl;
  image.alt = `Captura de transferencia: ${hasDraft ? voucherDraftFile.name : (record.voucherFileName || 'archivo adjunto')}`;
  const details = document.createElement('div');
  details.className = 'voucher-capture-details';
  const link = document.createElement('a');
  link.href = image.src;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = hasDraft ? voucherDraftFile.name : (record.voucherFileName || 'Ver captura adjunta');
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'inline-action';
  removeButton.textContent = 'Quitar captura';
  removeButton.addEventListener('click', () => {
    if (voucherDraftFile) {
      if (voucherDraftUrl) URL.revokeObjectURL(voucherDraftUrl);
      voucherDraftFile = null;
      voucherDraftUrl = '';
      if (voucherCaptureInput) voucherCaptureInput.value = '';
    } else if (record?.voucherUrl) {
      voucherRemoveExisting = true;
      newRecordForm.elements.namedItem('estadoVoucher').value = 'Pendiente';
    }
    renderVoucherCapturePreview(record);
  });
  details.append(link, removeButton);
  voucherCapturePreview.append(image, details);
  voucherCapturePreview.hidden = false;
}

function updateOfficeRecordFromForm(record, formData) {
  Object.assign(record, {
    ordenCompra: String(formData.get('ordenCompra') || '').trim() || 'Pendiente',
    monto: String(formData.get('monto') || '').trim() || 'Pendiente',
    factura: String(formData.get('factura') || '').trim() || 'Pendiente',
    comunicaVenta: String(formData.get('comunicaVenta') || '').trim() || '—',
    montoCobrado: String(formData.get('montoCobrado') || '').trim() || 'S/ 0.00',
    estadoCobranza: formData.get('estadoCobranza') || 'Pendiente',
    fechaDeposito: inputDateToDisplay(formData.get('fechaDeposito')),
    operacion: String(formData.get('operacion') || '').trim() || '—',
    banco: String(formData.get('banco') || '').trim() || '—',
    responsableCobro: String(formData.get('responsableCobro') || '').trim() || '—',
    bonoDoctor: String(formData.get('bonoDoctor') || '').trim() || 'Pendiente',
    estadoVoucher: formData.get('estadoVoucher') || 'Pendiente',
    voucher: String(formData.get('voucher') || '').trim() || '—',
    obsFinanciera: String(formData.get('obsFinanciera') || '').trim() || '—'
  });
  if (voucherDraftFile && voucherDraftUrl) {
    if (record.voucherUrl?.startsWith('blob:')) URL.revokeObjectURL(record.voucherUrl);
    record.voucherUrl = voucherDraftUrl;
    record.voucherFileName = voucherDraftFile.name;
    voucherDraftFile = null;
    voucherDraftUrl = '';
    voucherRemoveExisting = false;
  } else if (voucherRemoveExisting) {
    if (record.voucherUrl?.startsWith('blob:')) URL.revokeObjectURL(record.voucherUrl);
    record.voucherUrl = '';
    record.voucherFileName = '';
    voucherRemoveExisting = false;
  }
}

function updateRecordFromForm(record, formData) {
  const dateInputValue = formData.get('fecha') || todayISODate();
  const updatedDate = inputDateToDisplay(dateInputValue);
  const updatedMonth = monthKeyFromDisplay(updatedDate);
  if (updatedMonth && updatedMonth !== monthKeyFromDisplay(record.fecha)) {
    record.code = makeVisibleCode(dateInputValue);
  }
  Object.assign(record, {
    fecha: updatedDate,
    pedido: String(formData.get('pedido')).trim(),
    tipo: formData.get('tipo'),
    paciente: String(formData.get('paciente')).trim(),
    institucion: formData.get('institucion'),
    cirujano: formData.get('cirujano') || '—',
    personaConsiguio: formData.get('personaConsiguio') || '—',
    personaSubio: formData.get('personaSubio') || '—',
    instrumentista: formData.get('instrumentista') || 'Pendiente',
    conductor: formData.get('conductor') || 'Pendiente',
    material: String(formData.get('material')).trim(),
    fechaCx: inputDateToDisplay(formData.get('fechaCx')),
    horaCx: formData.get('horaCx') || 'Pendiente',
    guia: formData.get('guia') || 'Pendiente',
    guiaRemision: formData.get('guiaRemision') || 'Pendiente',
    fechaRecojo: inputDateToDisplay(formData.get('fechaRecojo')),
    estadoMaterial: formData.get('estadoMaterial'),
    obsOperativa: formData.get('obsOperativa') || '—'
  });
}

function productByCode(code) {
  return consumables.find((item) => item.code === code);
}

function previousQuantityForRecord(code, record) {
  return (record.consumoItems || []).filter((line) => line.code === code).reduce((sum, line) => sum + line.quantity, 0);
}

function quantityInDraft(code) {
  return consumptionDraft.filter((line) => line.code === code).reduce((sum, line) => sum + line.quantity, 0);
}

function renderStockPreview() {
  const preview = document.querySelector('#stock-preview');
  preview.replaceChildren();
  consumables.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'stock-mini-card';
    const code = document.createElement('span');
    const amount = document.createElement('strong');
    code.textContent = item.code;
    amount.textContent = `${item.available} disp.`;
    card.append(code, amount);
    preview.append(card);
  });
}

function renderConsumableOptions(searchTerm) {
  consumableOptions.replaceChildren();
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    consumableOptions.hidden = true;
    return;
  }
  const matches = consumables.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(term));
  if (!matches.length) {
    const empty = document.createElement('li');
    empty.className = 'autocomplete-empty';
    empty.textContent = 'No se encontraron consumibles.';
    consumableOptions.append(empty);
  } else {
    matches.forEach((item) => {
      const li = document.createElement('li');
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'autocomplete-option';
      option.setAttribute('role', 'option');
      const description = document.createElement('span');
      const code = document.createElement('strong');
      const name = document.createElement('span');
      const stock = document.createElement('small');
      code.textContent = item.code;
      name.textContent = item.name;
      stock.textContent = `${item.available} disponibles`;
      description.append(code, name);
      option.append(description, stock);
      option.addEventListener('click', () => {
        selectedConsumableCode = item.code;
        consumableSearch.value = `${item.code} · ${item.name}`;
        consumableOptions.hidden = true;
        document.querySelector('#consumption-feedback').hidden = true;
      });
      li.append(option);
      consumableOptions.append(li);
    });
  }
  consumableOptions.hidden = false;
}

function renderConsumptionDraft() {
  consumptionLinesList.replaceChildren();
  consumptionDraft.forEach((line, index) => {
    const item = productByCode(line.code);
    const li = document.createElement('li');
    const description = document.createElement('span');
    const amount = document.createElement('strong');
    const remove = document.createElement('button');
    description.textContent = `${line.code} · ${item?.name ?? 'Consumible'}`;
    amount.textContent = `× ${line.quantity}`;
    remove.type = 'button';
    remove.className = 'remove-line-button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      consumptionDraft.splice(index, 1);
      renderConsumptionDraft();
    });
    li.append(description, amount, remove);
    consumptionLinesList.append(li);
  });
  document.querySelector('#consumption-line-count').textContent = String(consumptionDraft.length);
}

function openConsumptionDialog(record) {
  activeConsumptionRecordId = record.id;
  consumptionDraft = (record.consumoItems || []).map((line) => ({ ...line }));
  const editingConsumption = consumptionDraft.length > 0;
  document.querySelector('#consumption-title').textContent = `${editingConsumption ? 'Editar' : 'Registrar'} consumo · ${record.code}`;
  document.querySelector('#confirm-consumption-button').textContent = editingConsumption ? 'Guardar cambios' : 'Confirmar consumo';
  consumptionFeedback.hidden = true;
  consumptionFeedback.textContent = '';
  selectedConsumableCode = null;
  consumableSearch.value = '';
  consumableOptions.hidden = true;
  document.querySelector('#consumable-quantity').value = '1';
  renderStockPreview();
  renderConsumptionDraft();
  consumptionDialog.showModal();
}

function addConsumptionLine(event) {
  event.preventDefault();
  const code = selectedConsumableCode;
  const item = productByCode(code);
  const quantity = Number(document.querySelector('#consumable-quantity').value);
  const record = records.find((entry) => entry.id === activeConsumptionRecordId);
  if (!item || !record) {
    consumptionFeedback.hidden = false;
    consumptionFeedback.textContent = 'Escribe el nombre o código y selecciona una opción de la lista.';
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) return;
  const availableForThisRecord = item.available + previousQuantityForRecord(code, record) - quantityInDraft(code);
  consumptionFeedback.hidden = false;
  if (quantity > availableForThisRecord) {
    consumptionFeedback.textContent = `Stock insuficiente en este ejemplo. Disponible para esta atención: ${availableForThisRecord}.`;
    return;
  }
  const existingLine = consumptionDraft.find((line) => line.code === code);
  if (existingLine) existingLine.quantity += quantity;
  else consumptionDraft.push({ code, quantity });
  consumptionFeedback.textContent = '';
  consumptionFeedback.hidden = true;
  document.querySelector('#consumable-quantity').value = '1';
  consumableSearch.value = '';
  selectedConsumableCode = null;
  consumableOptions.hidden = true;
  renderConsumptionDraft();
}

function confirmConsumption() {
  const record = records.find((entry) => entry.id === activeConsumptionRecordId);
  if (!record) return;
  const codes = new Set([...(record.consumoItems || []).map((line) => line.code), ...consumptionDraft.map((line) => line.code)]);
  for (const code of codes) {
    const item = productByCode(code);
    const oldQty = previousQuantityForRecord(code, record);
    const newQty = quantityInDraft(code);
    if (!item || item.available - (newQty - oldQty) < 0) {
      consumptionFeedback.hidden = false;
      consumptionFeedback.textContent = 'No hay stock suficiente para confirmar este detalle.';
      return;
    }
  }
  for (const code of codes) {
    const item = productByCode(code);
    const oldQty = previousQuantityForRecord(code, record);
    const newQty = quantityInDraft(code);
    item.available -= newQty - oldQty;
  }
  record.consumoItems = consumptionDraft.map((line) => ({ ...line }));
  consumptionDialog.close();
  render();
}

document.querySelector('#new-record-button').addEventListener('click', () => openRecordDialog());
document.querySelector('#close-dialog-button').addEventListener('click', () => newRecordDialog.close());
document.querySelector('#cancel-dialog-button').addEventListener('click', () => newRecordDialog.close());
newRecordDialog.addEventListener('close', discardVoucherDraft);
voucherCaptureInput.addEventListener('change', () => {
  const file = voucherCaptureInput.files?.[0];
  if (!file) return;
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    voucherCaptureInput.value = '';
    return;
  }
  if (voucherDraftUrl) URL.revokeObjectURL(voucherDraftUrl);
  voucherDraftFile = file;
  voucherDraftUrl = URL.createObjectURL(file);
  voucherRemoveExisting = false;
  newRecordForm.elements.namedItem('estadoVoucher').value = 'Adjunto';
  renderVoucherCapturePreview();
});
document.querySelector('#manage-institutions-link').addEventListener('click', () => institutionsDialog.showModal());
document.querySelector('#manage-institutions-button').addEventListener('click', () => institutionsDialog.showModal());
document.querySelector('#close-institutions-button').addEventListener('click', () => institutionsDialog.close());
document.querySelector('#manage-people-link').addEventListener('click', () => peopleDialog.showModal());
document.querySelector('#manage-instrumentists-button').addEventListener('click', () => peopleDialog.showModal());
document.querySelector('#manage-drivers-button').addEventListener('click', () => peopleDialog.showModal());
document.querySelector('#close-people-button').addEventListener('click', () => peopleDialog.close());
document.querySelector('#close-consumption-button').addEventListener('click', () => consumptionDialog.close());
document.querySelector('#cancel-consumption-button').addEventListener('click', () => consumptionDialog.close());
document.querySelector('#confirm-consumption-button').addEventListener('click', confirmConsumption);
consumptionLineForm.addEventListener('submit', addConsumptionLine);
consumableSearch.addEventListener('input', () => {
  selectedConsumableCode = null;
  renderConsumableOptions(consumableSearch.value);
});
searchInput.addEventListener('input', render);
searchColumnSelect.addEventListener('change', () => {
  searchInput.placeholder = searchColumnSelect.value === 'all'
    ? 'Buscar en todas las columnas'
    : `Buscar en ${searchColumnSelect.value}`;
  render();
});
invoiceFilter.addEventListener('change', render);

institutionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!canManageCatalogs) return;
  const formData = new FormData(institutionForm);
  const name = String(formData.get('institutionName')).trim();
  const type = String(formData.get('institutionType'));
  const editingName = institutionForm.dataset.editingName || null;
  const exists = institutions.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.name !== editingName);
  institutionFeedback.hidden = false;
  if (exists) {
    institutionFeedback.textContent = 'Esa institución ya está en la lista.';
    return;
  }
  if (editingName) {
    const institution = institutions.find((item) => item.name === editingName);
    if (institution) {
      institution.name = name;
      institution.type = type;
    }
  } else {
    institutions.push({ name, type });
  }
  saveSharedCatalogs();
  renderInstitutions();
  institutionSelect.value = name;
  resetInstitutionForm();
  institutionFeedback.hidden = false;
  institutionFeedback.textContent = editingName ? 'Cambios guardados.' : 'Institución añadida al prototipo y seleccionada para la salida.';
});

document.querySelector('#cancel-institution-edit').addEventListener('click', () => {
  resetInstitutionForm();
  institutionFeedback.hidden = true;
});

const instrumentistFeedback = document.querySelector('#instrumentist-feedback');
const driverFeedback = document.querySelector('#driver-feedback');
document.querySelector('#instrumentist-form').addEventListener('submit', (event) => {
  savePerson(event, {
    form: event.currentTarget, roster: instrumentists, select: instrumentistSelect,
    feedback: instrumentistFeedback, submit: document.querySelector('#instrumentist-submit-button'),
    cancel: document.querySelector('#cancel-instrumentist-edit'), kind: 'instrumentista'
  });
});
document.querySelector('#driver-form').addEventListener('submit', (event) => {
  savePerson(event, {
    form: event.currentTarget, roster: drivers, select: driverSelect,
    feedback: driverFeedback, submit: document.querySelector('#driver-submit-button'),
    cancel: document.querySelector('#cancel-driver-edit'), kind: 'conductor'
  });
});

document.querySelector('#cancel-instrumentist-edit').addEventListener('click', () => {
  resetPersonForm({ form: document.querySelector('#instrumentist-form'), submit: document.querySelector('#instrumentist-submit-button'), cancel: document.querySelector('#cancel-instrumentist-edit') });
  instrumentistFeedback.hidden = true;
});
document.querySelector('#cancel-driver-edit').addEventListener('click', () => {
  resetPersonForm({ form: document.querySelector('#driver-form'), submit: document.querySelector('#driver-submit-button'), cancel: document.querySelector('#cancel-driver-edit') });
  driverFeedback.hidden = true;
});

newRecordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!canEditRecords) return;
  const formData = new FormData(newRecordForm);
  if (canEditOffice) {
    if (!editingRecordId) return;
    const officeRecord = records.find((entry) => entry.id === editingRecordId);
    if (officeRecord) updateOfficeRecordFromForm(officeRecord, formData);
    editingRecordId = null;
    newRecordDialog.close();
    render();
    return;
  }
  if (editingRecordId) {
    const record = records.find((entry) => entry.id === editingRecordId);
    if (record) updateRecordFromForm(record, formData);
  } else {
    const newRecord = {
      id: `row-${Date.now()}`,
      code: makeVisibleCode(String(formData.get('fecha') || todayISODate())),
      fecha: inputDateToDisplay(formData.get('fecha') || todayISODate()),
      guia: formData.get('guia') || 'Pendiente',
      pedido: String(formData.get('pedido')).trim(),
      tipo: formData.get('tipo'),
      paciente: String(formData.get('paciente')).trim(),
      institucion: formData.get('institucion'),
      cirujano: formData.get('cirujano') || '—',
      personaConsiguio: formData.get('personaConsiguio') || '—',
      personaSubio: formData.get('personaSubio') || '—',
      material: String(formData.get('material')).trim(),
      instrumentista: formData.get('instrumentista') || 'Pendiente',
      estadoMaterial: formData.get('estadoMaterial') || 'En internamiento',
      conductor: formData.get('conductor') || 'Pendiente',
      consumoItems: [],
      fechaCx: inputDateToDisplay(formData.get('fechaCx')),
      horaCx: formData.get('horaCx') || 'Pendiente',
      guiaRemision: formData.get('guiaRemision') || 'Pendiente',
      obsOperativa: formData.get('obsOperativa') || '—',
      fechaRecojo: inputDateToDisplay(formData.get('fechaRecojo')),
      ordenCompra: 'Pendiente', monto: 'Pendiente', factura: 'Pendiente', comunicaVenta: 'Pendiente',
      montoCobrado: 'S/ 0.00', estadoCobranza: 'Pendiente', fechaDeposito: '—', operacion: '—',
      banco: '—', responsableCobro: '—', bonoDoctor: 'Pendiente', estadoVoucher: 'Pendiente',
      voucher: '—', obsFinanciera: '—'
    };
    records.unshift(newRecord);
    activeMonth = monthKeyFromDisplay(newRecord.fecha);
  }
  editingRecordId = null;
  newRecordDialog.close();
  render();
});

renderInstitutions();
renderPeople();
renderStockPreview();
syncGeneratedOrders();
syncInstrumentistRequests();
updatePastSurgeriesStatusInCuadro();
syncPickupsToRecords();
const activeRole = document.querySelector('#active-role');
try {
  activeRole.textContent = `${demoRoleLabels[currentRole]} · demo`;
} catch (error) { activeRole.textContent = 'Operador · Almacén · demo'; }
document.querySelector('.logout-link').addEventListener('click', () => {
  try { sessionStorage.removeItem('meditech-demo-role'); } catch (error) { /* Estado temporal de la maqueta. */ }
});
render();

window.addEventListener('storage', (event) => {
  if (event.key === sharedOrdersKey) {
    syncGeneratedOrders();
    syncInstrumentistRequests();
    updatePastSurgeriesStatusInCuadro();
    syncPickupsToRecords();
    render();
  }
  if (event.key === sharedConvocationsKey) {
    syncInstrumentistRequests();
    render();
  }
  if (event.key === pickupsStorageKey) {
    syncPickupsToRecords();
    render();
  }
  if (event.key === catalogsStorageKey) {
    try {
      const next = JSON.parse(event.newValue || '{}');
      institutions.splice(0, institutions.length, ...(Array.isArray(next.institutions) ? next.institutions : []));
      instrumentists.splice(0, instrumentists.length, ...(Array.isArray(next.instrumentists) ? next.instrumentists : []));
      drivers.splice(0, drivers.length, ...(Array.isArray(next.drivers) ? next.drivers : []));
      renderInstitutions();
      renderPeople();
    } catch (error) {
      console.warn('No se pudieron actualizar los catálogos compartidos.', error);
    }
  }
});