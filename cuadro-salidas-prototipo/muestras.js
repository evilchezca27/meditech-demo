document.addEventListener('DOMContentLoaded', () => {
  const samplesStorageKey = 'meditech-demo-samples-v1';
  const catalogsStorageKey = 'meditech-demo-catalogs-v1';
  const pickupsStorageKey = 'meditech-demo-pickups-v1';

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
  const btnNewSample = document.getElementById('new-sample-button');
  const dialogSample = document.getElementById('sample-dialog');
  const formSample = document.getElementById('sample-form');
  const btnClose = document.getElementById('close-dialog');
  const btnCancel = document.getElementById('cancel-dialog');
  const institutionSelect = document.getElementById('institution-select');
  const driverSelect = document.getElementById('driver-select');
  const samplesBody = document.getElementById('samples-body');
  const emptyState = document.getElementById('empty-state');
  const recordCount = document.getElementById('record-count');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const evidenceUpload = document.getElementById('evidence-upload');
  const evidenceList = document.getElementById('evidence-list');
  const btnRemoveEvidence = document.getElementById('remove-evidence-button');
  const dialogFeedback = document.getElementById('dialog-feedback');
  const moduleFeedback = document.getElementById('module-feedback');
  const overdueAlertBanner = document.getElementById('overdue-alert-banner');
  const overdueAlertText = document.getElementById('overdue-alert-text');
  const filterOverdueBtn = document.getElementById('filter-overdue-btn');

  // Catálogos compartidos
  const institutionsDialog = document.getElementById('institutions-dialog');
  const institutionForm = document.getElementById('institution-form');
  const institutionsList = document.getElementById('institutions-list');
  const institutionFeedback = document.getElementById('institution-feedback');
  const peopleDialog = document.getElementById('people-dialog');

  if (activeRoleBadge) {
    activeRoleBadge.textContent = `${demoRoleLabels[currentRole]} · demo`;
  }
  if (btnNewSample) {
    btnNewSample.hidden = !canOperate;
  }

  let samples = [];
  let editingSampleId = null;
  let draftEvidence = null;

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

    if (institutionSelect) {
      const prevInst = institutionSelect.value;
      institutionSelect.replaceChildren(new Option('Seleccionar clínica u hospital', ''));
      institutions.forEach((inst) => institutionSelect.add(new Option(`${inst.name} (${inst.type})`, inst.name)));
      if (prevInst && !institutions.some((i) => i.name === prevInst)) {
        institutionSelect.add(new Option(`${prevInst} (histórico)`, prevInst));
      }
      institutionSelect.value = prevInst;
    }

    if (driverSelect) {
      const prevDriver = driverSelect.value;
      driverSelect.replaceChildren(new Option('Seleccionar conductor', ''));
      drivers.forEach((d) => driverSelect.add(new Option(d, d)));
      if (prevDriver && !drivers.includes(prevDriver)) {
        driverSelect.add(new Option(`${prevDriver} (histórico)`, prevDriver));
      }
      driverSelect.value = prevDriver;
    }

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

  // Datos iniciales de demostración
  function demoSamples() {
    return [
      {
        id: 'sample-1',
        code: 'MUE-0002',
        institution: 'Hospital Demo Sur',
        doctor: 'Dra. Ejemplo · Traumatología',
        itemsDescription: '01 Set de implantes columna cervical + instrumental de prueba',
        deliveryDriver: 'Conductor B',
        deliveryDate: '2026-11-10',
        dueDate: '2026-11-20',
        status: 'En evaluación',
        linkedOrder: '',
        notes: 'En revisión técnica por comité de compras del hospital.',
        evidence: null
      },
      {
        id: 'sample-2',
        code: 'MUE-0001',
        institution: 'Clínica Demo Norte',
        doctor: 'Dr. Ejemplo · Artroscopia',
        itemsDescription: '02 Anclajes PEEK 5.5mm + guía de inserción (Muestra comercial)',
        deliveryDriver: 'Conductor A',
        deliveryDate: '2026-11-18',
        dueDate: '2026-11-28',
        status: 'Aprobada para CX',
        linkedOrder: 'PED-0261',
        notes: 'Aprobada. Pendiente de recoger tras cirugía programada.',
        evidence: null
      }
    ];
  }

  function loadSamples() {
    try {
      const saved = JSON.parse(localStorage.getItem(samplesStorageKey) || 'null');
      if (Array.isArray(saved)) {
        samples = saved;
        return;
      }
    } catch (e) { /* Usar demo */ }
    samples = demoSamples();
    saveSamples();
  }

  function saveSamples() {
    try {
      localStorage.setItem(samplesStorageKey, JSON.stringify(samples));
    } catch (e) {
      showModuleFeedback('No se pudieron guardar los cambios por límite de memoria del navegador.');
    }
  }

  // Sincronización bidireccional con Recojo de Material
  function syncSampleToPickups(sample) {
    if (sample.status !== 'Por recoger') return;
    try {
      const currentPickups = JSON.parse(localStorage.getItem(pickupsStorageKey) || '[]');
      const list = Array.isArray(currentPickups) ? currentPickups : [];
      const pickupId = `pickup-sample-${sample.id}`;
      const existing = list.find((p) => p.id === pickupId || p.salidaCode === sample.code);

      if (existing) {
        existing.patient = `MUESTRA · ${sample.doctor}`;
        existing.institution = sample.institution;
        existing.orderId = sample.linkedOrder || sample.code;
        existing.notes = `Recojo de muestra (${sample.code}): ${sample.itemsDescription}. ${sample.notes || ''}`.trim();
      } else {
        const nextNum = list.length + 1;
        list.unshift({
          id: pickupId,
          manual: true,
          isSample: true,
          sampleId: sample.id,
          salidaRowId: '',
          salidaCode: sample.code,
          orderId: sample.linkedOrder || sample.code,
          code: `REC-${String(nextNum).padStart(4, '0')}`,
          patient: `MUESTRA · ${sample.doctor}`,
          institution: sample.institution,
          outboundDriver: sample.deliveryDriver || '—',
          surgeryDisplay: `Límite muestra: ${formatDisplayDate(sample.dueDate)}`,
          driver: '',
          status: 'Pendiente de recojo',
          washingStatus: 'No aplica',
          sentToWashDate: '',
          returnedFromWashDate: '',
          pickupDate: '',
          pickupTime: '',
          notes: `Recojo de muestra (${sample.code}): ${sample.itemsDescription}. ${sample.notes || ''}`.trim(),
          evidence: sample.evidence ? [{ ...sample.evidence }] : []
        });
      }
      localStorage.setItem(pickupsStorageKey, JSON.stringify(list));
    } catch (e) {
      console.error('Error sincronizando muestra con recojos:', e);
    }
  }

  function syncFromPickupsStatus() {
    try {
      const currentPickups = JSON.parse(localStorage.getItem(pickupsStorageKey) || '[]');
      if (!Array.isArray(currentPickups)) return;
      let updated = false;
      samples.forEach((sample) => {
        const linkedPickup = currentPickups.find(
          (p) => p.id === `pickup-sample-${sample.id}` || p.salidaCode === sample.code
        );
        if (linkedPickup && linkedPickup.status === 'Recogido' && sample.status !== 'Recogida') {
          sample.status = 'Recogida';
          updated = true;
        }
      });
      if (updated) saveSamples();
    } catch (e) { /* Ignorar */ }
  }

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
    btnRemoveEvidence.hidden = !draftEvidence;
    if (!draftEvidence) return;
    const link = document.createElement('a');
    link.href = draftEvidence.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `📎 ${draftEvidence.name}`;
    evidenceList.append(link);
  }

  evidenceUpload.addEventListener('change', async () => {
    const file = evidenceUpload.files?.[0];
    if (!file) return;
    try {
      draftEvidence = {
        name: file.name,
        url: await readFileAsDataUrl(file)
      };
      renderDraftEvidence();
    } catch (err) {
      showDialogFeedback(err.message);
    }
    evidenceUpload.value = '';
  });

  btnRemoveEvidence.addEventListener('click', () => {
    draftEvidence = null;
    renderDraftEvidence();
  });

  function openSampleDialog(sample = null) {
    renderCatalogsUI();
    formSample.reset();
    dialogFeedback.hidden = true;
    editingSampleId = sample ? sample.id : null;
    draftEvidence = sample?.evidence ? { ...sample.evidence } : null;

    document.getElementById('dialog-eyebrow').textContent = sample ? `EDITAR · ${sample.code}` : 'NUEVO REGISTRO';
    document.getElementById('dialog-title').textContent = sample ? 'Actualizar muestra hospitalaria' : 'Registrar entrega de muestra';
    document.getElementById('save-sample').textContent = sample ? 'Guardar cambios' : 'Guardar muestra';

    if (sample) {
      if (sample.institution && !institutions.some((i) => i.name === sample.institution)) {
        institutionSelect.add(new Option(`${sample.institution} (histórico)`, sample.institution));
      }
      formSample.elements.namedItem('institution').value = sample.institution || '';
      formSample.elements.namedItem('doctor').value = sample.doctor || '';
      formSample.elements.namedItem('itemsDescription').value = sample.itemsDescription || '';
      formSample.elements.namedItem('deliveryDriver').value = sample.deliveryDriver || '';
      formSample.elements.namedItem('status').value = sample.status || 'En evaluación';
      formSample.elements.namedItem('deliveryDate').value = sample.deliveryDate || '';
      formSample.elements.namedItem('dueDate').value = sample.dueDate || '';
      formSample.elements.namedItem('linkedOrder').value = sample.linkedOrder || '';
      formSample.elements.namedItem('notes').value = sample.notes || '';
    } else {
      const todayIso = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      formSample.elements.namedItem('deliveryDate').value = todayIso;
      formSample.elements.namedItem('dueDate').value = nextWeek;
      formSample.elements.namedItem('status').value = 'En evaluación';
    }

    const fields = formSample.querySelectorAll('input, select, textarea');
    fields.forEach((f) => { f.disabled = !canOperate; });
    document.getElementById('save-sample').hidden = !canOperate;
    btnRemoveEvidence.hidden = !canOperate || !draftEvidence;
    evidenceUpload.disabled = !canOperate;

    renderDraftEvidence();
    dialogSample.showModal();
  }

  function closeSampleDialog() {
    dialogSample.close();
    formSample.reset();
    editingSampleId = null;
    draftEvidence = null;
  }

  btnNewSample?.addEventListener('click', () => {
    if (canOperate) openSampleDialog();
  });
  btnClose.addEventListener('click', closeSampleDialog);
  btnCancel.addEventListener('click', closeSampleDialog);

  function markSampleReadyForPickup(sample) {
    if (!canOperate) return;
    sample.status = 'Por recoger';
    saveSamples();
    syncSampleToPickups(sample);
    renderTable();
    showModuleFeedback(`Muestra ${sample.code} marcada "Por recoger" y enviada automáticamente a Recojo de Material.`);
  }

  function deleteSample(sample) {
    if (!canOperate) return;
    if (!window.confirm(`¿Eliminar el registro de muestra ${sample.code} (${sample.institution})?`)) return;
    samples = samples.filter((s) => s.id !== sample.id);
    saveSamples();
    renderTable();
    showModuleFeedback(`Muestra ${sample.code} eliminada.`);
  }

  formSample.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canOperate) return;

    const fd = new FormData(formSample);
    const institution = String(fd.get('institution') || '').trim();
    const doctor = String(fd.get('doctor') || '').trim();
    const itemsDescription = String(fd.get('itemsDescription') || '').trim();
    const deliveryDriver = String(fd.get('deliveryDriver') || '').trim();
    const status = String(fd.get('status') || 'En evaluación');
    const deliveryDate = String(fd.get('deliveryDate') || '');
    const dueDate = String(fd.get('dueDate') || '');
    const linkedOrder = String(fd.get('linkedOrder') || '').trim();
    const notes = String(fd.get('notes') || '').trim();

    if (!institution || !doctor || !itemsDescription) {
      showDialogFeedback('Completa institución, solicitante y productos de muestra.');
      return;
    }

    let savedRecord = null;
    if (editingSampleId) {
      savedRecord = samples.find((s) => s.id === editingSampleId);
      if (savedRecord) {
        Object.assign(savedRecord, {
          institution,
          doctor,
          itemsDescription,
          deliveryDriver,
          status,
          deliveryDate,
          dueDate,
          linkedOrder,
          notes,
          evidence: draftEvidence ? { ...draftEvidence } : null
        });
      }
    } else {
      const nextNum = samples.reduce((max, s) => {
        const m = String(s.code).match(/^MUE-(\d+)$/);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0) + 1;
      savedRecord = {
        id: `sample-${Date.now()}`,
        code: `MUE-${String(nextNum).padStart(4, '0')}`,
        institution,
        doctor,
        itemsDescription,
        deliveryDriver,
        status,
        deliveryDate,
        dueDate,
        linkedOrder,
        notes,
        evidence: draftEvidence ? { ...draftEvidence } : null
      };
      samples.unshift(savedRecord);
    }

    saveSamples();
    if (savedRecord && savedRecord.status === 'Por recoger') {
      syncSampleToPickups(savedRecord);
      showModuleFeedback(`Muestra ${savedRecord.code} guardada y enviada a Recojo de Material.`);
    } else {
      showModuleFeedback(`Muestra ${savedRecord?.code || ''} guardada correctamente.`);
    }

    closeSampleDialog();
    renderTable();
  });

  function formatDisplayDate(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  function getTimeAlertInfo(sample) {
    if (sample.status === 'Recogida') {
      return { level: 'closed', label: 'Cerrada', pillClass: 'green' };
    }
    if (!sample.dueDate) {
      return { level: 'ok', label: 'Sin fecha límite', pillClass: 'blue' };
    }
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const due = new Date(`${sample.dueDate}T12:00:00`);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        level: 'overdue',
        label: `Vencida hace ${Math.abs(diffDays)} d`,
        pillClass: 'red'
      };
    }
    if (diffDays <= 2) {
      return {
        level: 'expiring',
        label: diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays} d`,
        pillClass: 'amber'
      };
    }
    return {
      level: 'ok',
      label: `Quedan ${diffDays} d`,
      pillClass: 'green'
    };
  }

  function statusPillClass(status) {
    if (status === 'Recogida') return 'green';
    if (status === 'Por recoger') return 'red';
    if (status === 'Aprobada para CX') return 'blue';
    return 'amber';
  }

  function renderTable() {
    syncFromPickupsStatus();

    const query = searchInput.value.trim().toLowerCase();
    const filterVal = statusFilter.value;

    const filtered = samples.filter((item) => {
      const alertInfo = getTimeAlertInfo(item);
      const searchable = `${item.code} ${item.institution} ${item.doctor} ${item.itemsDescription} ${item.deliveryDriver} ${item.linkedOrder || ''}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      if (!matchesSearch) return false;
      if (filterVal === 'todos') return true;
      if (filterVal === 'alertas') {
        return item.status !== 'Recogida' && (alertInfo.level === 'overdue' || alertInfo.level === 'expiring');
      }
      return item.status === filterVal;
    });

    samplesBody.replaceChildren();

    filtered.forEach((item) => {
      const tr = document.createElement('tr');
      const alertInfo = getTimeAlertInfo(item);

      // 1. Código
      const tdCode = document.createElement('td');
      tdCode.style.whiteSpace = 'nowrap';
      const codeStrong = document.createElement('strong');
      codeStrong.className = 'cell-primary';
      codeStrong.textContent = item.code;
      tdCode.append(codeStrong);
      if (item.linkedOrder) {
        const orderSub = document.createElement('span');
        orderSub.className = 'sample-subline';
        orderSub.textContent = `Ref: ${item.linkedOrder}`;
        tdCode.append(orderSub);
      }

      // 2. Institución y solicitante
      const tdInst = document.createElement('td');
      tdInst.style.minWidth = '190px';
      const instStrong = document.createElement('strong');
      instStrong.className = 'cell-primary';
      instStrong.textContent = item.institution;
      const docSub = document.createElement('span');
      docSub.className = 'sample-subline';
      docSub.textContent = item.doctor;
      tdInst.append(instStrong, docSub);

      // 3. Productos en muestra
      const tdItems = document.createElement('td');
      tdItems.style.minWidth = '230px';
      const itemsText = document.createElement('span');
      itemsText.textContent = item.itemsDescription;
      const driverSub = document.createElement('span');
      driverSub.className = 'sample-subline';
      driverSub.textContent = item.deliveryDriver ? `Entregó: ${item.deliveryDriver}` : 'Entrega sin conductor';
      tdItems.append(itemsText, driverSub);

      // 4. Entrega y límite
      const tdDates = document.createElement('td');
      tdDates.style.whiteSpace = 'nowrap';
      const delLine = document.createElement('div');
      delLine.style.fontSize = '0.84rem';
      delLine.textContent = `Entrega: ${formatDisplayDate(item.deliveryDate)}`;
      const dueLine = document.createElement('div');
      dueLine.style.fontSize = '0.84rem';
      dueLine.style.fontWeight = '600';
      dueLine.textContent = `Límite: ${formatDisplayDate(item.dueDate)}`;
      tdDates.append(delLine, dueLine);

      // 5. Permanencia (Semáforo)
      const tdTimeAlert = document.createElement('td');
      tdTimeAlert.style.whiteSpace = 'nowrap';
      const timePill = document.createElement('span');
      timePill.className = `status-pill ${alertInfo.pillClass}`;
      timePill.textContent = alertInfo.label;
      tdTimeAlert.append(timePill);

      // 6. Estado
      const tdStatus = document.createElement('td');
      tdStatus.style.whiteSpace = 'nowrap';
      const statusPill = document.createElement('span');
      statusPill.className = `status-pill ${statusPillClass(item.status)}`;
      statusPill.textContent = item.status;
      tdStatus.append(statusPill);

      // 7. Guía / Evidencia
      const tdEvidence = document.createElement('td');
      tdEvidence.style.minWidth = '130px';
      if (item.evidence?.url) {
        const link = document.createElement('a');
        link.className = 'sample-file-link';
        link.href = item.evidence.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = item.evidence.name;
        tdEvidence.append(link);
      } else {
        const noEv = document.createElement('span');
        noEv.className = 'sample-no-evidence';
        noEv.textContent = 'Sin cargo';
        tdEvidence.append(noEv);
      }

      // 8. Acción
      const tdAction = document.createElement('td');
      tdAction.style.whiteSpace = 'nowrap';
      const actionsWrap = document.createElement('div');
      actionsWrap.style.display = 'flex';
      actionsWrap.style.gap = '6px';

      if (canOperate && item.status !== 'Por recoger' && item.status !== 'Recogida') {
        const pickupBtn = document.createElement('button');
        pickupBtn.type = 'button';
        pickupBtn.className = 'sample-action pickup-trigger';
        pickupBtn.textContent = 'Enviar a recojo';
        pickupBtn.title = 'Marcar como Por recoger y copiar a Recojo de Material';
        pickupBtn.addEventListener('click', () => markSampleReadyForPickup(item));
        actionsWrap.append(pickupBtn);
      }

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'sample-action';
      editBtn.textContent = canOperate ? 'Editar' : 'Ver';
      editBtn.addEventListener('click', () => openSampleDialog(item));
      actionsWrap.append(editBtn);

      if (canOperate) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'sample-action';
        delBtn.style.background = '#fff0f0';
        delBtn.style.borderColor = '#f5c6cb';
        delBtn.style.color = '#a84242';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', () => deleteSample(item));
        actionsWrap.append(delBtn);
      }

      tdAction.append(actionsWrap);

      tr.append(tdCode, tdInst, tdItems, tdDates, tdTimeAlert, tdStatus, tdEvidence, tdAction);
      samplesBody.append(tr);
    });

    emptyState.hidden = filtered.length > 0;
    recordCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;

    // Resumen superior y banner de alerta
    const activeCount = samples.filter((s) => s.status === 'En evaluación' || s.status === 'Aprobada para CX').length;
    const overdueOrExpiring = samples.filter((s) => {
      if (s.status === 'Recogida') return false;
      const info = getTimeAlertInfo(s);
      return info.level === 'overdue' || info.level === 'expiring';
    });
    const toPickupCount = samples.filter((s) => s.status === 'Por recoger').length;
    const closedCount = samples.filter((s) => s.status === 'Recogida').length;

    document.getElementById('summary-active').textContent = String(activeCount);
    document.getElementById('summary-expiring').textContent = String(overdueOrExpiring.length);
    document.getElementById('summary-to-pickup').textContent = String(toPickupCount);
    document.getElementById('summary-closed').textContent = String(closedCount);

    if (overdueOrExpiring.length > 0) {
      overdueAlertBanner.hidden = false;
      overdueAlertText.textContent = `⚠️ Atención: Tienes ${overdueOrExpiring.length} ${overdueOrExpiring.length === 1 ? 'muestra vencida o por vencer' : 'muestras vencidas o por vencer'} en institución. Envíalas a recojo para evitar cuellos de botella en facturación.`;
    } else {
      overdueAlertBanner.hidden = true;
    }
  }

  function showDialogFeedback(msg) {
    dialogFeedback.textContent = msg;
    dialogFeedback.hidden = false;
  }

  function showModuleFeedback(msg) {
    moduleFeedback.textContent = msg;
    moduleFeedback.hidden = false;
    setTimeout(() => {
      moduleFeedback.hidden = true;
    }, 4500);
  }

  filterOverdueBtn?.addEventListener('click', () => {
    statusFilter.value = 'alertas';
    renderTable();
  });

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  window.addEventListener('storage', (e) => {
    if (e.key === catalogsStorageKey) renderCatalogsUI();
    if (e.key === samplesStorageKey || e.key === pickupsStorageKey) {
      loadSamples();
      renderTable();
    }
  });

  renderCatalogsUI();
  loadSamples();
  renderTable();
});