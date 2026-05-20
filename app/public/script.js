const noteForm = document.getElementById('note-form');
const noteInput = document.getElementById('note-input');
const noteList = document.getElementById('note-list');

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text;
  return el.innerHTML;
}

function renderNotes(notes) {
  if (!notes.length) {
    noteList.innerHTML = '<li class="message">No notes yet.</li>';
    return;
  }

  noteList.innerHTML = notes
    .map(
      (n) => `
      <li data-id="${n.id}">
        <div class="note-content">
          ${escapeHtml(n.content)}
          <span class="note-date">${new Date(n.created_at).toLocaleString()}</span>
        </div>
        <button type="button" class="btn-delete">Delete</button>
      </li>`
    )
    .join('');

  noteList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteNote(btn.closest('li').dataset.id));
  });
}

async function loadNotes() {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error('Failed');
    renderNotes(await res.json());
  } catch {
    noteList.innerHTML = '<li class="message">Could not load notes.</li>';
  }
}

noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = noteInput.value.trim();
  if (!content) return;

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed');
    noteInput.value = '';
    loadNotes();
  } catch {
    alert('Error saving note.');
  }
});

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    loadNotes();
  } catch {
    alert('Error deleting note.');
  }
}

loadNotes();
