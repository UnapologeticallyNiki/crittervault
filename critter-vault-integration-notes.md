# Wiring Critter Workshop into Critter Vault

Two new files, three small edits to your existing `index.html`. Nothing
in your CSS, your card rendering, your filters, your CSV/JSON import,
or your profile view changes at all — this only replaces the *editing*
half of the app (the pencil-icon form).

## 1. Add the two script tags

Right before your existing `<script src=".../supabase.js">` tag stays
where it is. Add these two new tags **after** your existing `<script>`
block that defines `sb`, `critters`, `PRESET_TOPICS`, `rowToCritter`,
`renderAll`, `showToast`, `expandedId` — i.e. at the very end, just
before `initAuth();` is called, or in a separate `<script>` block
right after the main one:

```html
<script src="workshop.js"></script>
<script src="critter-workshop.config.js"></script>
```

(Simplest: paste the contents of both files directly into your existing
`<script>` block, right after `let pendingDeleteId = null;` and before
`async function load() {`. Order matters: `workshop.js`'s
`createWorkshop` function must exist before `critter-workshop.config.js`
calls it, and `critter-workshop.config.js` needs `sb`, `critters`,
`PRESET_TOPICS`, `rowToCritter`, `renderAll`, `showToast`, `expandedId`
to already be declared above it.)

## 2. Delete the old static form modal

Remove this whole block from the HTML body — Workshop builds its own
modal dynamically, so this static one is no longer needed:

```html
<!-- FORM MODAL -->
<div class="modal-overlay" id="formModal">
  ...
</div>
```

(Everything from `<!-- FORM MODAL -->` down to its closing `</div>`.)

## 3. Delete the old form-handling JS

These functions become dead code once Workshop takes over — safe to
delete:

`openForm`, `closeForm`, `toggleFav`, `renderFormLists`, `addListItem`,
`removeListItem`, `renderTopicGrid`, `toggleFormTopic`, `addCustomTopic`,
`handleImageUpload`, `handleAudioUpload`, `saveCritter`

Also remove the now-unused `formLists`, `formTopics`, `formFav`
variable declarations.

## 4. Point the existing buttons at Workshop instead

Three places call the old `openForm`:

**The FAB (add button):**
```html
<!-- before -->
<button class="fab" onclick="openForm(null)">+</button>
<!-- after -->
<button class="fab" onclick="CritterWorkshop.open(null)">+</button>
```

**The edit pencil in `cardHTML()`:**
```js
// before
<button class="icon-btn" onclick="openForm('${c.id}')" title="Edit">✏️</button>
// after
<button class="icon-btn" onclick="CritterWorkshop.open(critters.find(x=>x.id==='${c.id}'))" title="Edit">✏️</button>
```

**The "Edit This Companion" button in `buildProfile()`:**
```js
// before
onclick="closeProfile();openForm('${c.id}')"
// after
onclick="closeProfile();CritterWorkshop.open(critters.find(x=>x.id==='${c.id}'))"
```

**The delete button** — `confirmDelete`/`doDelete` can stay exactly as
they are (they already work directly against `critters` +
`deleteCritterRemote`). If you'd rather route deletes through Workshop
too for consistency, replace the body of `doDelete()` with a call to
`CritterWorkshop.remove(pendingDeleteId)` — optional, not required.

## What you get

- Same look, same fields, same behavior as today.
- Adding a new field to a critter (say, a "Favorite Sound") means
  adding **one line** to `critter-workshop.config.js` — no HTML, no
  new render function, no new save logic.
- `workshop.js` never needs to change again for Critter Vault. When
  you're ready for PHC, you write a `phc-workshop.config.js` with
  Planter Workshop's own fields, pointed at the `idea_garden` table
  (or whatever you name it), and reuse the exact same `workshop.js`.

## One naming note

I made `editions` a `chips` field (add/remove list) instead of the old
comma-separated text input — your schema already stores it as
`text[]`, so this is actually a closer match to the database than the
old UI was, and keeps every multi-value field using the same chip
pattern.
