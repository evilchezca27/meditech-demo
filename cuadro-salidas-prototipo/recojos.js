document.addEventListener('DOMContentLoaded', () => {
  const cuadroRecordsKey = 'meditech-demo-records-v1';
  const catalogsStorageKey = 'meditech-demo-catalogs-v1';
  const pickupsStorageKey = 'meditech-demo-pickups-v1';
  const deletedPickupsKey = 'meditech-demo-pickups-deleted-v1';

  const demoRoleLabels = {
    administrator: 'Administrador · Adm. / Finanzas',
    operator: 'Operador · Almacén',
    chief: 'Jefatura'
  };

  let currentRole = 'operator';
  try {
    currentRole = sessionStorage.getItem('meditech-demo-role') || 'operator';
  } catch (e) {
    currentRole = 'operator';
  }
  if (!['administrator', 'operator', 'chief'].includes(currentRole)) currentRole = 'operator';
  const canOperate = currentRole === 'operator';
  const canManageCatalogs = currentRole !== 'chief';

  const activeRoleBadge = document.getElementById('active-role');
  const btnNewPickup = document.getElementById('new-pickup-button');
  const dialogPickup = document.getElementById('pickup-dialog');
  const formPickup = document.getElementById('pickup-form');
  const btnClose = document.getElementById('close-dialog');
  const btnCancel = document.getElementById('cancel-dialog');
  const linkedOrderSelect = document.getElementById('linked-order');
  const driverSelect = document.getElementById('driver-select');
  const pickupsBody = document.getElementById('pickups-body');
  const emptyState = document.getElementById('empty-state');
  const recordCount = document.getElementById('record-count');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const washingFilter = document.getElementById('washing-filter');
  const evidenceUpload = document.getElementById('evidence-upload');
  const evidenceList = document.getElementById('evidence-list');
  const btnRemoveEvidence = document.getElementById('remove-evidence-button');
  const dialogFeedback = document.getElementById('dialog-feedback');
  const moduleFeedback = document.getElementById('module-feedback');

  const institutionsDialog = document.getElementById('institutions-dialog');
  const institutionForm = document.getElementById('institution-form');
  const institutionsList = document.getElementById('institutions-list');
  const institutionFeedback = document.getElementById('institution-feedback');
  const peopleDialog = document.getElementById('people-dialog');

  if (activeRoleBadge) {
    activeRoleBadge.textContent = `${demoRoleLabels[currentRole]} · demo`;
  }
  if (btnNewPickup) {
    btnNewPickup.hidden = !canOperate;
  }

  let pickups = [];
  let deletedSalidaIds = new Set();
  let availableSalidas = [];
  let editingPickupId = null;
  let draftEvidence = [];

  let institutions = [
    { name: 'Clínica Demo Norte', type: 'Clínica' },
    { name: 'Hospital Demo Sur', type: 'Hospital' },
    { name: 'Clínica Demo Este', type: 'Clínica' }
  ];
  let instrumentists = ['Instrumentista A', 'Instrumentista B', 'Instrumentista C'];
  let drivers = ['Conductor A', 'Conductor B', 'Conductor C'];

  function loadSharedCatalogs() {
    try {
      const saved = JSON.parse(localStorage.getItem(catalogsStorageKey) || 'null');
      if (Array.isArray(saved?.institutions)) institutions = saved.institutions;
      if (Array.isArray(saved?.instrumentists)) instrumentists = saved.instrumentists;
      if (Array.isArray(saved?.drivers)) drivers = saved.drivers;
    } catch (e) { /* Usar valores base */ }
  }

  function saveSharedCatalogs() {
    try {
      localStorage.setItem(catalogsStorageKey, JSON.stringify({ institutions, instrumentists, drivers }));
    } catch (e) { /* Ignorar error */ }
  }

  function renderCatalogsUI() {
    loadSharedCatalogs();
    const currentDriver = driverSelect.value;
    driverSelect.replaceChildren(new Option('Asignar después / Seleccionar conductor', ''));
    drivers.forEach((d) => driverSelect.add(new Option(d, d)));
    if (currentDriver && drivers.includes(currentDriver)) driverSelect.value = currentDriver;

    if (institutionForm) institutionForm.hidden = !canManageCatalogs;
    const instFormPeople = document.getElementById('instrumentist-form');
    const drvFormPeople = document.getElementById('driver-form');
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
            document.getElementById('institution-submit-button').textContent = 'Guardar cambios';
            document.getElementById('cancel-institution-edit').hidden = false;
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
            renderCatalogsUI();
          });
          actions.append(editBtn, delBtn);
        }
        li.append(main, actions);
        institutionsList.append(li);
      });
      const countEl = document.getElementById('institution-count');
      if (countEl) countEl.textContent = String(institutions.length);
    }

    renderPeopleCatalogList(instrumentists, 'instrumentists-list', 'instrumentist');
    renderPeopleCatalogList(drivers, 'drivers-list', 'driver');
  }

  function renderPeopleCatalogList(listArray, elementId, kind) {
    const ul = document.getElementById(elementId);
    if (!ul) return;
    ul.replaceChildren();
    listArray.forEach((person) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = person;
      const actions = document.createElement('div');
      actions.className = 'catalog-row-actions';

      if (canManageCatalogs) {
        const formId = kind === 'instrumentist' ? 'instrumentist-form' : 'driver-form';
        const submitId = kind === 'instrumentist' ? 'instrumentist-submit-button' : 'driver-submit-button';
        const cancelId = kind === 'instrumentist' ? 'cancel-instrumentist-edit' : 'cancel-driver-edit';
        const feedbackId = kind === 'instrumentist' ? 'instrumentist-feedback' : 'driver-feedback';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'catalog-edit';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => {
          const f = document.getElementById(formId);
          f.dataset.editingName = person;
          f.elements.namedItem('personName').value = person;
          document.getElementById(submitId).textContent = 'Guardar cambios';
          document.getElementById(cancelId).hidden = false;
          document.getElementById(feedbackId).hidden = true;
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
          renderCatalogsUI();
        });
        actions.append(editBtn, delBtn);
      }
      li.append(span, actions);
      ul.append(li);
    });
  }

  document.getElementById('manage-institutions-link')?.addEventListener('click', () => {
    renderCatalogsUI();
    institutionsDialog.showModal();
  });
  document.getElementById('close-institutions-button')?.addEventListener('click', () => institutionsDialog.close());

  document.getElementById('manage-people-link')?.addEventListener('click', () => {
    renderCatalogsUI();
    peopleDialog.showModal();
  });
  document.getElementById('close-people-button')?.addEventListener('click', () => peopleDialog.close());

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
    document.getElementById('institution-submit-button').textContent = 'Añadir institución';
    document.getElementById('cancel-institution-edit').hidden = true;
    institutionFeedback.textContent = editingName ? 'Cambios guardados.' : 'Institución añadida.';
    institutionFeedback.hidden = false;
    renderCatalogsUI();
  });

  document.getElementById('cancel-institution-edit')?.addEventListener('click', () => {
    institutionForm.reset();
    delete institutionForm.dataset.editingName;
    document.getElementById('institution-submit-button').textContent = 'Añadir institución';
    document.getElementById('cancel-institution-edit').hidden = true;
    institutionFeedback.hidden = true;
  });

  function handlePersonSubmit(e, kind) {
    e.preventDefault();
    if (!canManageCatalogs) return;
    const form = e.currentTarget;
    const name = String(new FormData(form).get('personName') || '').trim();
    const editingName = form.dataset.editingName || null;
    const list = kind === 'instrumentist' ? instrumentists : drivers;
    const feedback = document.getElementById(kind === 'instrumentist' ? 'instrumentist-feedback' : 'driver-feedback');

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
    form.reset();
    delete form.dataset.editingName;
    form.querySelector('button[type="submit"]').textContent = 'Añadir';
    form.querySelector('button[type="button"]').hidden = true;
    feedback.textContent = editingName ? 'Cambios guardados.' : 'Añadido al catálogo.';
    feedback.hidden = false;
    renderCatalogsUI();
  }

  document.getElementById('instrumentist-form')?.addEventListener('submit', (e) => handlePersonSubmit(e, 'instrumentist'));
  document.getElementById('driver-form')?.addEventListener('submit', (e) => handlePersonSubmit(e, 'driver'));

  document.getElementById('cancel-instrumentist-edit')?.addEventListener('click', () => {
    const f = document.getElementById('instrumentist-form');
    f.reset();
    delete f.dataset.editingName;
    document.getElementById('instrumentist-submit-button').textContent = 'Añadir';
    document.getElementById('cancel-instrumentist-edit').hidden = true;
    document.getElementById('instrumentist-feedback').hidden = true;
  });

  document.getElementById('cancel-driver-edit')?.addEventListener('click', () => {
    const f = document.getElementById('driver-form');
    f.reset();
    delete f.dataset.editingName;
    document.getElementById('driver-submit-button').textContent = 'Añadir';
    document.getElementById('cancel-driver-edit').hidden = true;
    document.getElementById('driver-feedback').hidden = true;
  });

  function loadPickups() {
    try {
      const saved = JSON.parse(localStorage.getItem(pickupsStorageKey) || '[]');
      pickups = Array.isArray(saved) ? saved : [];
    } catch (e) {
      pickups = [];
    }
    try {
      const deleted = JSON.parse(localStorage.getItem(deletedPickupsKey) || '[]');
      deletedSalidaIds = new Set(Array.isArray(deleted) ? deleted : []);
    } catch (e) {
      deletedSalidaIds = new Set();
    }
  }

  function savePickups() {
    try {
      localStorage.setItem(pickupsStorageKey, JSON.stringify(pickups));
      localStorage.setItem(deletedPickupsKey, JSON.stringify([...deletedSalidaIds]));
    } catch (e) {
      showModuleFeedback('No se pudieron guardar los adjuntos por límite de memoria local. Usa archivos más ligeros.');
    }
  }

  function parseCuadroSurgeryDateTime(fechaCx, horaCx) {
    if (!fechaCx || fechaCx === 'Pendiente' || fechaCx === '—') return null;
    const parts = String(fechaCx).trim().split('/');
    if (parts.length !== 3) return null;
    const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const cleanTime = String(horaCx || '00:00').trim();
    const timePart = /^\d{1,2}:\d{2}$/.test(cleanTime) ? cleanTime.padStart(5, '0') : '00:00';
    const dt = new Date(`${isoDate}T${timePart}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function isSurgeryPast(fechaCx, horaCx) {
    const dt = parseCuadroSurgeryDateTime(fechaCx, horaCx);
    if (!dt) return false;
    return dt.getTime() <= Date.now();
  }

  function getCuadroSalidasRecords() {
    const fallbackCuadroRecords = [
      {
        id: 'row-1',
        code: 'CS-1101',
        pedido: 'PED-0261',
        paciente: 'Paciente demo 01',
        institucion: 'Clínica Demo Norte',
        conductor: 'Conductor A',
        estadoMaterial: 'En internamiento',
        fechaCx: '05/11/2026',
        horaCx: '08:00'
      },
      {
        id: 'row-3',
        code: 'CS-1001',
        pedido: 'PED-0259',
        paciente: 'Paciente demo 03',
        institucion: 'Clínica Demo Este',
        conductor: 'Conductor A',
        estadoMaterial: 'Pendiente de recojo',
        fechaCx: '02/11/2026',
        horaCx: '10:30'
      }
    ];

    try {
      const stored = JSON.parse(localStorage.getItem(cuadroRecordsKey) || 'null');
      if (Array.isArray(stored)) return stored;
    } catch (e) { /* Usar fallback */ }
    return fallbackCuadroRecords;
  }

  function syncFromCuadroSalidas() {
    const cuadroRows = getCuadroSalidasRecords();

    const cuadroIds = new Set(cuadroRows.map((r) => r.id));
    const cuadroCodes = new Set(cuadroRows.map((r) => r.code).filter(Boolean));
    const cuadroPedidos = new Set(cuadroRows.map((r) => r.pedido).filter(Boolean));

    pickups = pickups.filter((p) => {
      if (p.manual || p.isSample) return true;
      return cuadroIds.has(p.salidaRowId) || cuadroCodes.has(p.salidaCode) || cuadroPedidos.has(p.orderId);
    });

    let changed = false;

    cuadroRows.forEach((row) => {
      if (!row || row.estadoMaterial === 'Cancelado') return;
      const surgeryPassed = isSurgeryPast(row.fechaCx, row.horaCx);
      const isPendingInCuadro = String(row.estadoMaterial || '').toLowerCase() === 'pendiente de recojo';

      if (!surgeryPassed && !isPendingInCuadro) return;

      const uniqueKey = row.id || row.code || row.pedido;
      if (deletedSalidaIds.has(uniqueKey)) return;

      const existing = pickups.find(
        (p) => (p.salidaRowId && p.salidaRowId === row.id)
          || (p.salidaCode && p.salidaCode === row.code)
          || (p.orderId && p.orderId === row.pedido)
      );

      if (existing) {
        existing.salidaRowId = row.id || existing.salidaRowId;
        existing.salidaCode = row.code || existing.salidaCode;
        existing.orderId = row.pedido || existing.orderId;
        existing.patient = row.paciente || existing.patient;
        existing.institution = row.institucion || existing.institution;
        existing.surgeryDisplay = `${row.fechaCx || ''} ${row.horaCx && row.horaCx !== 'Pendiente' ? row.horaCx : ''}`.trim();
        return;
      }

      if (String(row.estadoMaterial || '').toLowerCase() === 'recogido') return;

      const nextNum = pickups.length + 1;
      const code = `REC-${String(nextNum).padStart(4, '0')}`;
      pickups.unshift({
        id: `pickup-${uniqueKey}`,
        salidaRowId: row.id || '',
        salidaCode: row.code || '',
        orderId: row.pedido || '',
        code,
        patient: row.paciente || '—',
        institution: row.institucion || '—',
        outboundDriver: row.conductor && row.conductor !== 'Pendiente' ? row.conductor : '—',
        surgeryDisplay: `${row.fechaCx || ''} ${row.horaCx && row.horaCx !== 'Pendiente' ? row.horaCx : ''}`.trim(),
        driver: '',
        status: 'Pendiente de recojo',
        washingStatus: 'No aplica',
        sentToWashDate: '',
        returnedFromWashDate: '',
        pickupDate: '',
        pickupTime: '',
        notes: '',
        evidence: []
      });
      changed = true;
    });

    if (changed) savePickups();

    availableSalidas = cuadroRows.filter((row) => {
      if (!row || row.estadoMaterial === 'Cancelado' || row.estadoMaterial === 'Recogido') return false;
      return isSurgeryPast(row.fechaCx, row.horaCx) || String(row.estadoMaterial || '').toLowerCase() === 'pendiente de recojo';
    });

    linkedOrderSelect.replaceChildren(new Option('Seleccionar salida del Cuadro de Salidas', ''));
    availableSalidas.forEach((row) => {
      const key = row.id || row.code || row.pedido;
      const label = `${row.code || row.pedido} · ${row.paciente} (CX: ${row.fechaCx} ${row.horaCx !== 'Pendiente' ? row.horaCx : ''} · Salió con: ${row.conductor || '—'})`;
      linkedOrderSelect.add(new Option(label, key));
    });
  }

  linkedOrderSelect.addEventListener('change', () => {
    const selectedKey = linkedOrderSelect.value;
    const found = availableSalidas.find((r) => (r.id || r.code || r.pedido) === selectedKey);
    if (found) {
      formPickup.elements.namedItem('patient').value = found.paciente || '';
      formPickup.elements.namedItem('institution').value = found.institucion || '';
    } else {
      formPickup.elements.namedItem('patient').value = '';
      formPickup.elements.namedItem('institution').value = '';
    }
    formPickup.elements.namedItem('driver').value = '';
  });

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function renderDraftEvidence() {
    evidenceList.replaceChildren();
    btnRemoveEvidence.hidden = draftEvidence.length === 0;
    draftEvidence.forEach((file) => {
      const link = document.createElement('a');
      link.href = file.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `📎 ${file.name}`;
      evidenceList.append(link);
    });
  }

  evidenceUpload.addEventListener('change', async () => {
    const files = Array.from(evidenceUpload.files || []);
    if (!files.length) return;
    try {
      const loaded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          url: await readFileAsDataUrl(file)
        }))
      );
      draftEvidence = [...draftEvidence, ...loaded];
      renderDraftEvidence();
    } catch (err) {
      showDialogFeedback(err.message);
    }
    evidenceUpload.value = '';
  });

  btnRemoveEvidence.addEventListener('click', () => {
    draftEvidence = [];
    renderDraftEvidence();
  });

  function openPickupDialog(pickup = null) {
    renderCatalogsUI();
    syncFromCuadroSalidas();
    formPickup.reset();
    dialogFeedback.hidden = true;
    editingPickupId = pickup ? pickup.id : null;
    draftEvidence = pickup?.evidence ? pickup.evidence.map((e) => ({ ...e })) : [];

    document.getElementById('dialog-eyebrow').textContent = pickup ? `EDITAR · ${pickup.code}` : 'NUEVO REGISTRO';
    document.getElementById('dialog-title').textContent = pickup ? 'Actualizar recojo y lavado' : 'Registrar recojo y lavado';
    document.getElementById('save-pickup').textContent = pickup ? 'Guardar cambios' : 'Guardar recojo';

    if (pickup) {
      const key = pickup.salidaRowId || pickup.salidaCode || pickup.orderId;
      if (key && !availableSalidas.some((r) => (r.id || r.code || r.pedido) === key)) {
        linkedOrderSelect.add(new Option(`${pickup.salidaCode || pickup.orderId} · ${pickup.patient}`, key));
      }
      formPickup.elements.namedItem('orderId').value = key || '';
      formPickup.elements.namedItem('patient').value = pickup.patient || '';
      formPickup.elements.namedItem('institution').value = pickup.institution || '';
      formPickup.elements.namedItem('driver').value = pickup.driver || '';
      formPickup.elements.namedItem('status').value = pickup.status || 'Pendiente de recojo';
      if (formPickup.elements.namedItem('washingStatus')) {
        formPickup.elements.namedItem('washingStatus').value = pickup.washingStatus || 'No aplica';
      }
      formPickup.elements.namedItem('pickupDate').value = pickup.pickupDate || '';
      formPickup.elements.namedItem('pickupTime').value = pickup.pickupTime || '';
      if (formPickup.elements.namedItem('sentToWashDate')) {
        formPickup.elements.namedItem('sentToWashDate').value = pickup.sentToWashDate || '';
      }
      if (formPickup.elements.namedItem('returnedFromWashDate')) {
        formPickup.elements.namedItem('returnedFromWashDate').value = pickup.returnedFromWashDate || '';
      }
      formPickup.elements.namedItem('notes').value = pickup.notes || '';
    } else {
      formPickup.elements.namedItem('status').value = 'Pendiente de recojo';
      if (formPickup.elements.namedItem('washingStatus')) {
        formPickup.elements.namedItem('washingStatus').value = 'No aplica';
      }
    }

    const fields = formPickup.querySelectorAll('input, select, textarea');
    fields.forEach((f) => { f.disabled = !canOperate; });
    document.getElementById('save-pickup').hidden = !canOperate;
    btnRemoveEvidence.hidden = !canOperate || draftEvidence.length === 0;
    document.querySelector('.pickup-upload-button').hidden = !canOperate;

    renderDraftEvidence();
    dialogPickup.showModal();
  }

  function closePickupDialog() {
    dialogPickup.close();
    formPickup.reset();
    editingPickupId = null;
    draftEvidence = [];
  }

  if (btnNewPickup) {
    btnNewPickup.addEventListener('click', () => {
      if (canOperate) openPickupDialog();
    });
  }
  btnClose.addEventListener('click', closePickupDialog);
  btnCancel.addEventListener('click', closePickupDialog);

  function deletePickup(item) {
    if (!canOperate) return;
    if (!window.confirm(`¿Eliminar el registro de recojo ${item.code} (${item.patient})?`)) return;
    const index = pickups.findIndex((p) => p.id === item.id);
    if (index >= 0) pickups.splice(index, 1);

    const key = item.salidaRowId || item.salidaCode || item.orderId;
    if (key) deletedSalidaIds.add(key);

    savePickups();
    renderTable();
    showModuleFeedback(`Registro ${item.code} eliminado.`);
  }

  formPickup.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canOperate) return;

    const formData = new FormData(formPickup);
    const selectedKey = String(formData.get('orderId') || '').trim();
    const patient = String(formData.get('patient') || '').trim();
    const institution = String(formData.get('institution') || '').trim();

    if (!selectedKey && !patient) {
      showDialogFeedback('Selecciona una salida relacionada o indica el paciente.');
      return;
    }

    const driver = String(formData.get('driver') || '').trim();
    const status = String(formData.get('status') || 'Pendiente de recojo');
    const washingStatus = String(formData.get('washingStatus') || 'No aplica');
    const pickupDate = String(formData.get('pickupDate') || '');
    const pickupTime = String(formData.get('pickupTime') || '');
    const sentToWashDate = String(formData.get('sentToWashDate') || '');
    const returnedFromWashDate = String(formData.get('returnedFromWashDate') || '');
    const notes = String(formData.get('notes') || '').trim();

    const salidaInfo = availableSalidas.find((r) => (r.id || r.code || r.pedido) === selectedKey);

    if (editingPickupId) {
      const target = pickups.find((p) => p.id === editingPickupId);
      if (target) {
        Object.assign(target, {
          salidaRowId: salidaInfo?.id || target.salidaRowId || '',
          salidaCode: salidaInfo?.code || target.salidaCode || '',
          orderId: salidaInfo?.pedido || target.orderId || '',
          patient: patient || '—',
          institution: institution || '—',
          driver,
          status,
          washingStatus,
          pickupDate,
          pickupTime,
          sentToWashDate,
          returnedFromWashDate,
          notes,
          evidence: draftEvidence.map((item) => ({ ...item }))
        });
      }
      if (moduleFeedback) {
        showModuleFeedback(
          status === 'Recogido'
            ? `Material marcado como Recogido. Se envió al Cuadro de Salidas y se conserva en este histórico.`
            : `Recojo ${target?.code || ''} actualizado.`
        );
      }
    } else {
      const existing = selectedKey
        ? pickups.find((p) => (p.salidaRowId || p.salidaCode || p.orderId) === selectedKey)
        : null;

      if (existing) {
        Object.assign(existing, {
          patient: patient || existing.patient,
          institution: institution || existing.institution,
          driver,
          status,
          washingStatus,
          pickupDate,
          pickupTime,
          sentToWashDate,
          returnedFromWashDate,
          notes,
          evidence: draftEvidence.map((item) => ({ ...item }))
        });
      } else {
        const nextNum = pickups.length + 1;
        const code = `REC-${String(nextNum).padStart(4, '0')}`;
        pickups.unshift({
          id: `pickup-${Date.now()}`,
          manual: !salidaInfo,
          salidaRowId: salidaInfo?.id || '',
          salidaCode: salidaInfo?.code || '',
          orderId: salidaInfo?.pedido || selectedKey,
          code,
          patient: patient || '—',
          institution: institution || '—',
          outboundDriver: salidaInfo?.conductor || '—',
          surgeryDisplay: salidaInfo ? `${salidaInfo.fechaCx || ''} ${salidaInfo.horaCx || ''}`.trim() : '',
          driver,
          status,
          washingStatus,
          pickupDate,
          pickupTime,
          sentToWashDate,
          returnedFromWashDate,
          notes,
          evidence: draftEvidence.map((item) => ({ ...item }))
        });
      }
      if (moduleFeedback) {
        showModuleFeedback(
          status === 'Recogido'
            ? `Material marcado como Recogido. Se envió al Cuadro de Salidas y se conserva en este histórico.`
            : `Recojo registrado correctamente.`
        );
      }
    }

    savePickups();
    closePickupDialog();
    renderTable();
  });

  function statusPillClass(status) {
    if (status === 'Recogido') return 'green';
    if (status === 'Cancelado') return 'red';
    return 'amber';
  }

  function washingPillClass(status) {
    if (status === 'Lavado y listo') return 'green';
    if (status === 'En lavado (San Martín)') return 'blue';
    return 'amber';
  }

  function formatDisplayDate(isoDate, time = '') {
    if (!isoDate) return 'Por programar';
    const [y, m, d] = isoDate.split('-');
    const formatted = `${d}/${m}/${y}`;
    return time ? `${formatted} · ${time}` : formatted;
  }

  function calculateWashDays(sentIso, returnedIso) {
    if (!sentIso) return '';
    const start = new Date(`${sentIso}T12:00:00`);
    const end = returnedIso ? new Date(`${returnedIso}T12:00:00`) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
    const diffDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return returnedIso ? `(${diffDays} d en total)` : `(${diffDays} d allá)`;
  }

  function renderTable() {
    const query = searchInput.value.trim().toLowerCase();
    const filterStatus = statusFilter.value;
    const filterWashing = washingFilter ? washingFilter.value : 'todos';

    const filtered = pickups.filter((item) => {
      const itemWash = item.washingStatus || 'No aplica';
      const searchable = `${item.code} ${item.salidaCode || ''} ${item.orderId} ${item.patient} ${item.institution} ${item.driver} ${item.outboundDriver} ${itemWash}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = filterStatus === 'todos' || item.status === filterStatus;
      const matchesWashing = filterWashing === 'todos' || itemWash === filterWashing;
      return matchesSearch && matchesStatus && matchesWashing;
    });

    pickupsBody.replaceChildren();

    filtered.forEach((item) => {
      const tr = document.createElement('tr');

      const tdCode = document.createElement('td');
      tdCode.textContent = item.code;
      tdCode.style.whiteSpace = 'nowrap';

      const tdOrder = document.createElement('td');
      tdOrder.style.minWidth = '210px';
      const patientStrong = document.createElement('strong');
      patientStrong.className = 'cell-primary';
      patientStrong.textContent = item.patient;
      const orderSub = document.createElement('span');
      orderSub.className = 'pickup-subline';
      const refParts = [
        item.salidaCode,
        item.orderId,
        item.surgeryDisplay ? `CX: ${item.surgeryDisplay}` : '',
        item.outboundDriver && item.outboundDriver !== '—' ? `Salió con ${item.outboundDriver}` : ''
      ].filter(Boolean);
      orderSub.textContent = refParts.join(' · ') || 'Registro manual';
      tdOrder.append(patientStrong, orderSub);

      const tdInst = document.createElement('td');
      tdInst.textContent = item.institution;
      tdInst.style.minWidth = '150px';

      const tdDriver = document.createElement('td');
      tdDriver.style.minWidth = '130px';
      if (item.driver) {
        tdDriver.textContent = item.driver;
      } else {
        const pendingSpan = document.createElement('span');
        pendingSpan.className = 'pickup-no-evidence';
        pendingSpan.textContent = 'Pendiente de asignar';
        tdDriver.append(pendingSpan);
      }

      const tdStatus = document.createElement('td');
      tdStatus.style.whiteSpace = 'nowrap';
      const pill = document.createElement('span');
      pill.className = `status-pill ${statusPillClass(item.status)}`;
      pill.textContent = item.status;
      const dateSub = document.createElement('span');
      dateSub.className = 'pickup-subline';
      dateSub.style.marginTop = '4px';
      dateSub.textContent = formatDisplayDate(item.pickupDate, item.pickupTime);
      tdStatus.append(pill, dateSub);

      const tdWashStatus = document.createElement('td');
      tdWashStatus.style.whiteSpace = 'nowrap';
      const washValue = item.washingStatus || 'No aplica';
      if (washValue === 'No aplica') {
        const noWash = document.createElement('span');
        noWash.className = 'pickup-no-evidence';
        noWash.textContent = 'No aplica';
        tdWashStatus.append(noWash);
      } else {
        const washPill = document.createElement('span');
        washPill.className = `status-pill ${washingPillClass(washValue)}`;
        washPill.textContent = washValue;
        tdWashStatus.append(washPill);
      }

      const tdTrace = document.createElement('td');
      tdTrace.style.whiteSpace = 'nowrap';
      tdTrace.style.minWidth = '155px';
      if (item.sentToWashDate || item.returnedFromWashDate) {
        const sentLine = document.createElement('div');
        sentLine.style.fontSize = '0.82rem';
        sentLine.textContent = `Envío SMP: ${item.sentToWashDate ? formatDisplayDate(item.sentToWashDate) : '—'}`;
        const retLine = document.createElement('div');
        retLine.style.fontSize = '0.82rem';
        retLine.style.color = '#64748b';
        const daysLabel = calculateWashDays(item.sentToWashDate, item.returnedFromWashDate);
        retLine.textContent = `Retorno PL: ${item.returnedFromWashDate ? formatDisplayDate(item.returnedFromWashDate) : 'Pendiente'} ${daysLabel}`;
        tdTrace.append(sentLine, retLine);
      } else {
        const noTrace = document.createElement('span');
        noTrace.className = 'pickup-no-evidence';
        noTrace.textContent = 'Sin registro de lavado';
        tdTrace.append(noTrace);
      }

      const tdEvidence = document.createElement('td');
      tdEvidence.style.minWidth = '140px';
      if (item.evidence && item.evidence.length) {
        item.evidence.forEach((file) => {
          const link = document.createElement('a');
          link.className = 'pickup-file-link';
          link.href = file.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = file.name;
          tdEvidence.append(link);
        });
      } else {
        const noEv = document.createElement('span');
        noEv.className = 'pickup-no-evidence';
        noEv.textContent = 'Sin adjuntos';
        tdEvidence.append(noEv);
      }

      const tdAction = document.createElement('td');
      tdAction.style.whiteSpace = 'nowrap';
      tdAction.style.minWidth = '180px';
      const actionsWrap = document.createElement('div');
      actionsWrap.style.display = 'flex';
      actionsWrap.style.gap = '6px';
      actionsWrap.style.flexWrap = 'nowrap';

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = canOperate ? 'pickup-action' : 'pickup-action view';
      actionBtn.textContent = canOperate ? 'Completar / Editar' : 'Ver detalle';
      actionBtn.addEventListener('click', () => openPickupDialog(item));
      actionsWrap.append(actionBtn);

      if (canOperate) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'pickup-action';
        deleteBtn.style.background = '#fff0f0';
        deleteBtn.style.borderColor = '#f5c6cb';
        deleteBtn.style.color = '#a84242';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', () => deletePickup(item));
        actionsWrap.append(deleteBtn);
      }

      tdAction.append(actionsWrap);

      tr.append(tdCode, tdOrder, tdInst, tdDriver, tdStatus, tdWashStatus, tdTrace, tdEvidence, tdAction);
      pickupsBody.append(tr);
    });

    emptyState.hidden = filtered.length > 0;
    recordCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;

    document.getElementById('summary-total').textContent = String(pickups.length);
    document.getElementById('summary-pending').textContent = String(
      pickups.filter((p) => p.status === 'Pendiente de recojo').length
    );
    const summaryWashing = document.getElementById('summary-washing');
    if (summaryWashing) {
      summaryWashing.textContent = String(
        pickups.filter((p) => p.washingStatus === 'En lavado (San Martín)').length
      );
    }
  }

  function showDialogFeedback(msg) {
    dialogFeedback.textContent = msg;
    dialogFeedback.hidden = false;
  }

  function showModuleFeedback(msg) {
    if (!moduleFeedback) return;
    moduleFeedback.textContent = msg;
    moduleFeedback.hidden = false;
    setTimeout(() => {
      moduleFeedback.hidden = true;
    }, 4000);
  }

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);
  if (washingFilter) washingFilter.addEventListener('change', renderTable);

  setInterval(() => {
    const prevCount = pickups.length;
    syncFromCuadroSalidas();
    if (pickups.length !== prevCount) renderTable();
  }, 30000);

  window.addEventListener('storage', (e) => {
    if (e.key === cuadroRecordsKey) {
      syncFromCuadroSalidas();
      renderTable();
    }
    if (e.key === catalogsStorageKey) renderCatalogsUI();
    if (e.key === pickupsStorageKey) {
      loadPickups();
      renderTable();
    }
  });

  renderCatalogsUI();
  loadPickups();
  syncFromCuadroSalidas();
  renderTable();
});