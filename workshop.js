/* ================================================================
   WORKSHOP — a reusable, config-driven entry editor.

   It knows nothing about critters, ideas, or notes. It only knows
   field TYPES: text, textarea, select, boolean, chips, tagselect,
   image, audio. Each app (Critter Vault, PHC, Second Brain) hands
   it a config describing its fields, its Supabase table, and what
   to do when something is saved or deleted.

   Reuses your existing CSS classes exactly as-is:
   form-input, form-textarea, form-select, form-row, form-label,
   chip, list-item, list-item-del, list-add-row, star-toggle,
   image-preview, form-file, audio-player, modal-overlay, modal,
   modal-title, modal-close, btn-primary, btn-ghost, btn-small,
   topic-grid.
   ================================================================ */

function createWorkshop(config) {
  const {
    containerId   = 'workshopContainer',
    title         = 'Workshop',
    table,                          // Supabase table name, required
    supabase,                       // Supabase client, required
    idColumn      = 'id',
    idStrategy    = 'slug',         // 'slug' | 'uuid'
    idSourceField = 'name',         // which field to derive a slug from
    fields        = [],             // array of field defs — see README below
    existingIds   = () => [],       // fn returning array of ids already in use (for slug collisions)
    onSaved       = () => {},       // (record, isNew) => void
    onDeleted     = () => {},       // (id) => void
    onToast       = (msg) => console.log(msg),
  } = config;

  let state = {};
  let editingId = null;

  // ---------- id generation ----------
  function slugify(str) {
    return String(str || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'item';
  }

  function genId(sourceVal) {
    if (idStrategy === 'uuid') {
      return (crypto.randomUUID ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2));
    }
    const base = slugify(sourceVal);
    const taken = new Set(existingIds());
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  // ---------- container ----------
  function ensureContainer() {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      document.body.appendChild(el);
    }
    return el;
  }

  function defaultFor(field) {
    if (field.type === 'boolean') return false;
    if (field.type === 'chips' || field.type === 'tagselect') return [];
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- open / close ----------
  function open(record) {
    editingId = record ? record[idColumn] : null;
    state = {};
    fields.forEach(f => {
      if (record && record[f.key] !== undefined && record[f.key] !== null) {
        state[f.key] = (f.type === 'chips' || f.type === 'tagselect')
          ? [...(record[f.key] || [])]
          : record[f.key];
      } else {
        state[f.key] = defaultFor(f);
      }
    });
    render();
    document.getElementById(containerId + '-overlay').classList.add('open');
  }

  function close() {
    const ov = document.getElementById(containerId + '-overlay');
    if (ov) ov.classList.remove('open');
  }

  // ---------- field rendering ----------
  function fieldHTML(f) {
    const val = state[f.key];
    const id = `wk_${f.key}`;
    switch (f.type) {
      case 'text':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <input class="form-input" id="${id}" placeholder="${esc(f.placeholder || '')}" value="${esc(val)}"></div>`;

      case 'textarea':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <textarea class="form-textarea" id="${id}" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea></div>`;

      case 'select':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <select class="form-select" id="${id}">
            <option value="">Select…</option>
            ${(f.options || []).map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}
          </select></div>`;

      case 'boolean':
        return `<div class="form-row"><button type="button" class="star-toggle${val ? ' active' : ''}" id="${id}">${esc(f.label)}</button></div>`;

      case 'chips':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <div class="list-add-row">
            <input class="form-input" id="${id}_draft" placeholder="${esc(f.placeholder || 'Add item…')}">
            <button type="button" class="btn-small" data-chipadd="${f.key}">Add</button>
          </div>
          <div id="${id}_list"></div></div>`;

      case 'tagselect':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <div class="topic-grid" id="${id}_grid"></div>
          <div class="list-add-row">
            <input class="form-input" id="${id}_custom" placeholder="Add custom…">
            <button type="button" class="btn-small" data-tagcustom="${f.key}">Add</button>
          </div></div>`;

      case 'image':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <input type="file" class="form-file" id="${id}" accept="image/*">
          <img id="${id}_preview" class="image-preview" ${val ? `src="${val}" style="display:block"` : ''}></div>`;

      case 'audio':
        return `<div class="form-row"><label class="form-label">${esc(f.label)}</label>
          <input type="file" class="form-file" id="${id}" accept="audio/*">
          <div id="${id}_preview">${val ? `<audio controls class="audio-player"><source src="${val}"></audio>` : ''}</div></div>`;

      default:
        return '';
    }
  }

  function render() {
    const el = ensureContainer();
    el.innerHTML = `
      <div class="modal-overlay" id="${containerId}-overlay">
        <div class="modal">
          <div class="modal-title">
            <span>${editingId ? '✏️ Edit — ' + esc(state[idSourceField]) : '✨ New ' + esc(title)}</span>
            <button type="button" class="modal-close" id="${containerId}-close">×</button>
          </div>
          ${fields.map(fieldHTML).join('')}
          <button type="button" class="btn-primary" id="${containerId}-save">Save</button>
          <button type="button" class="btn-ghost" id="${containerId}-cancel">Cancel</button>
        </div>
      </div>`;
    wireEvents();
  }

  function wireEvents() {
    document.getElementById(`${containerId}-close`).onclick = close;
    document.getElementById(`${containerId}-cancel`).onclick = close;
    document.getElementById(`${containerId}-save`).onclick = save;

    fields.forEach(f => {
      const id = `wk_${f.key}`;

      if (f.type === 'boolean') {
        document.getElementById(id).onclick = () => {
          state[f.key] = !state[f.key];
          document.getElementById(id).classList.toggle('active', state[f.key]);
        };
      }

      if (f.type === 'chips') {
        renderChipList(f);
        document.querySelector(`[data-chipadd="${f.key}"]`).onclick = () => {
          const input = document.getElementById(id + '_draft');
          const v = input.value.trim();
          if (!v) return;
          state[f.key].push(v);
          input.value = '';
          renderChipList(f);
        };
      }

      if (f.type === 'tagselect') {
        renderTagGrid(f);
        document.querySelector(`[data-tagcustom="${f.key}"]`).onclick = () => {
          const input = document.getElementById(id + '_custom');
          const v = input.value.trim();
          if (!v || state[f.key].includes(v)) { input.value = ''; return; }
          state[f.key].push(v);
          input.value = '';
          renderTagGrid(f);
        };
      }

      if (f.type === 'image' || f.type === 'audio') {
        document.getElementById(id).onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            state[f.key] = ev.target.result;
            const prev = document.getElementById(id + '_preview');
            if (f.type === 'image') {
              prev.src = ev.target.result;
              prev.style.display = 'block';
            } else {
              prev.innerHTML = `<audio controls class="audio-player"><source src="${ev.target.result}"></audio>`;
            }
          };
          reader.readAsDataURL(file);
        };
      }
    });
  }

  function renderChipList(f) {
    const list = document.getElementById(`wk_${f.key}_list`);
    list.innerHTML = state[f.key].map((item, i) =>
      `<div class="list-item"><span class="list-item-text">${esc(item)}</span>
       <button type="button" class="list-item-del" data-chipdel="${f.key}::${i}">×</button></div>`
    ).join('');
    list.querySelectorAll('[data-chipdel]').forEach(btn => {
      btn.onclick = () => {
        const [key, idx] = btn.dataset.chipdel.split('::');
        state[key].splice(Number(idx), 1);
        renderChipList(f);
      };
    });
  }

  function renderTagGrid(f) {
    const grid = document.getElementById(`wk_${f.key}_grid`);
    const preset = f.presetOptions || [];
    const all = [...new Set([...preset, ...state[f.key]])];
    grid.innerHTML = all.map(t =>
      `<button type="button" class="chip${state[f.key].includes(t) ? ' active' : ''}" data-tagtoggle="${f.key}::${esc(t)}">${esc(t)}</button>`
    ).join('');
    grid.querySelectorAll('[data-tagtoggle]').forEach(btn => {
      btn.onclick = () => {
        const idx = btn.dataset.tagtoggle.indexOf('::');
        const key = btn.dataset.tagtoggle.slice(0, idx);
        const val = btn.dataset.tagtoggle.slice(idx + 2);
        if (state[key].includes(val)) state[key] = state[key].filter(x => x !== val);
        else state[key].push(val);
        renderTagGrid(f);
      };
    });
  }

  function readFieldValues() {
    fields.forEach(f => {
      const id = `wk_${f.key}`;
      if (f.type === 'text' || f.type === 'textarea') {
        state[f.key] = document.getElementById(id).value.trim();
      }
      if (f.type === 'select') {
        state[f.key] = document.getElementById(id).value;
      }
      // boolean / chips / tagselect / image / audio are already kept live in `state`
    });
  }

  // ---------- save / delete ----------
  async function save() {
    readFieldValues();

    for (const f of fields.filter(f => f.required)) {
      const v = state[f.key];
      if (!v || (Array.isArray(v) && !v.length)) {
        onToast(`${f.label} is required`);
        return;
      }
    }

    const record = { ...state };
    record[idColumn] = editingId || genId(state[idSourceField]);

    const { error } = await supabase.from(table).upsert(record);
    if (error) { onToast('⚠️ Save failed: ' + error.message); return; }

    const wasNew = !editingId;
    close();
    onSaved(record, wasNew);
    onToast(wasNew ? 'Added 🎉' : 'Saved ✓');
  }

  async function remove(id) {
    const { error } = await supabase.from(table).delete().eq(idColumn, id);
    if (error) { onToast('⚠️ Delete failed: ' + error.message); return; }
    onDeleted(id);
    onToast('Removed');
  }

  return { open, close, remove };
}

/* ================================================================
   FIELD DEF REFERENCE (for building a config for a new app)

   { key, label, type, required?, placeholder?, options?, presetOptions? }

   key    — must match the Supabase column name exactly. No mapping
            layer; Workshop reads/writes state[key] straight to/from
            the row.
   type   — 'text' | 'textarea' | 'select' | 'boolean' | 'chips'
             | 'tagselect' | 'image' | 'audio'
   options       — required for 'select'. Array of strings.
   presetOptions — optional for 'tagselect'. Array of suggested tags
                   shown alongside whatever the record already has.
   required      — if true, blocks save until filled.

   Example minimal config:

   const MyWorkshop = createWorkshop({
     title: 'Thing',
     table: 'things',
     supabase: sb,
     idSourceField: 'title',
     existingIds: () => myThings.map(t => t.id),
     fields: [
       { key: 'title', label: 'Title', type: 'text', required: true },
       { key: 'tags',  label: 'Tags',  type: 'chips' },
     ],
     onSaved: (record, isNew) => { ...update local array, re-render... },
     onDeleted: (id) => { ...remove from local array, re-render... },
     onToast: showToast,
   });

   MyWorkshop.open(existingRecordOrNull);
   MyWorkshop.remove(id);
   ================================================================ */
