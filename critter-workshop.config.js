/* ================================================================
   CRITTER WORKSHOP — config for the generic Workshop engine.
   This is the ONLY file that knows what a "critter" is.
   Workshop itself (workshop.js) has no idea.

   Depends on things already defined in your Critter Vault
   index.html: `sb` (Supabase client), `critters` (the in-memory
   array), `expandedId`, `renderAll()`, `showToast()`,
   `PRESET_TOPICS`, `rowToCritter()`.
   ================================================================ */

const critterWorkshopConfig = {
  containerId: 'critterWorkshopContainer',
  title: 'Critter',
  table: 'critters',
  supabase: sb,
  idColumn: 'id',
  idStrategy: 'slug',
  idSourceField: 'name',

  existingIds: () => critters.map(c => c.id),

  fields: [
    { key: 'name',        label: 'Companion Name',    type: 'text', required: true, placeholder: 'e.g. Claude the Kangaroo' },
    { key: 'emoji',       label: 'Emoji',              type: 'text', placeholder: '🐾' },
    { key: 'family',      label: 'Companion Type',     type: 'select', options: ['🐾 Creature Companion','🧭 Tool Companion','🌿 Nature Companion','✨ Symbol Companion'] },
    { key: 'species',     label: 'Species / Kind',     type: 'text', placeholder: 'e.g. Marsupial, Compass…' },
    { key: 'age',         label: 'Age Level',          type: 'select', options: ['All Ages','Young Adult','Mature'] },
    { key: 'status',      label: 'Status',             type: 'select', options: ['Researching','Draft','Complete'] },
    { key: 'comfort',     label: 'Journey Stage',      type: 'select', options: ['🌱 Beginner','🌿 Growing','🌳 Deep Thinking'] },
    { key: 'favorite',    label: '⭐ Favourite',        type: 'boolean' },
    { key: 'personality', label: 'Personality & Role', type: 'textarea', placeholder: 'Who is this critter? What do they do?' },

    { key: 'facts',       label: 'Natural Facts (real animal behaviour)', type: 'chips', placeholder: "e.g. Kangaroos can't walk backwards…" },
    { key: 'quotes',      label: 'Quotes',             type: 'chips', placeholder: 'Add a quote…' },
    { key: 'wisdom',      label: 'Wisdom / Lessons (general)', type: 'chips', placeholder: 'Add a wisdom lesson…' },
    { key: 'metaphors',   label: 'Metaphorical Wisdom', type: 'chips', placeholder: 'Deeper metaphorical meaning…' },
    { key: 'problems',    label: 'Problems This Critter Solves', type: 'chips', placeholder: 'e.g. Doubt and second-guessing…' },

    { key: 'topics',      label: 'Topics / Themes',    type: 'tagselect', presetOptions: PRESET_TOPICS },

    { key: 'related',     label: 'Related Critters',   type: 'chips', placeholder: 'e.g. Terry the Bomber…' },
    { key: 'symbiosis',   label: 'Symbiotic Relationships', type: 'chips', placeholder: 'e.g. Terry clears the path, Claude leaps…' },
    { key: 'editions',    label: 'Creature Comforts Editions', type: 'chips', placeholder: 'e.g. Koalalogic…' },

    { key: 'image_data',  label: 'Critter Image',      type: 'image' },
    { key: 'audio_data',  label: 'Audio (note / recording)', type: 'audio' },
    { key: 'audio_note',  label: 'Audio Note',         type: 'text', placeholder: 'Or add an audio note / link…' },

    { key: 'sources',     label: 'References / Sources', type: 'chips', placeholder: 'Book, website, documentary…' },
    { key: 'try_today',   label: '🐾 Try This Today',   type: 'textarea', placeholder: 'One practical action. Keep it simple and doable…' },
    { key: 'notes',       label: 'Planning Notes (private)', type: 'textarea', placeholder: 'Private ideas, staging notes, plans…' },
  ],

  onSaved: (record, isNew) => {
    const mapped = rowToCritter(record);
    const idx = critters.findIndex(c => c.id === mapped.id);
    if (idx > -1) critters[idx] = mapped; else critters.push(mapped);
    renderAll();
  },

  onDeleted: (id) => {
    critters = critters.filter(c => c.id !== id);
    if (expandedId === id) expandedId = null;
    renderAll();
  },

  onToast: showToast,
};

const CritterWorkshop = createWorkshop(critterWorkshopConfig);
