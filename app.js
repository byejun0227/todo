class TodoApp {
  #todos = [];
  #filter = 'all';
  #editingId = null;

  constructor() {
    this.#todos = this.#load();
    this.#bindElements();
    this.#bindEvents();
    this.#setDate();
    this.render();
  }

  // ── Persistence ──────────────────────────────────────────────

  #load() {
    try { return JSON.parse(localStorage.getItem('todos') ?? '[]'); }
    catch { return []; }
  }

  #save() {
    localStorage.setItem('todos', JSON.stringify(this.#todos));
  }

  // ── Setup ─────────────────────────────────────────────────────

  #bindElements() {
    this.input      = document.getElementById('new-todo');
    this.addBtn     = document.getElementById('add-btn');
    this.list       = document.getElementById('list');
    this.countEl    = document.getElementById('count');
    this.clearBtn   = document.getElementById('clear');
    this.progressEl = document.getElementById('progress');
    this.filterBtns = document.querySelectorAll('.filter');
  }

  #bindEvents() {
    this.addBtn.addEventListener('click', () => this.#add());
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter') this.#add(); });

    this.filterBtns.forEach(btn => btn.addEventListener('click', () => {
      this.#editingId = null;
      this.#filter = btn.dataset.filter;
      this.filterBtns.forEach(b => b.classList.toggle('active', b === btn));
      this.render();
    }));

    this.clearBtn.addEventListener('click', () => {
      this.#todos = this.#todos.filter(t => !t.completed);
      this.#save();
      this.render();
    });

    // Click: checkbox toggle / delete button
    this.list.addEventListener('click', e => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const id = +li.dataset.id;
      if (e.target.closest('.checkbox'))   this.#toggle(id);
      else if (e.target.closest('.delete-btn')) this.#remove(id);
    });

    // Keyboard: checkbox Space/Enter, edit input Enter/Escape
    this.list.addEventListener('keydown', e => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const id = +li.dataset.id;

      if (e.target.classList.contains('checkbox') && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        this.#toggle(id);
        return;
      }

      if (e.target.classList.contains('edit-input')) {
        if (e.key === 'Enter')  this.#commitEdit(id, e.target.value);
        if (e.key === 'Escape') { this.#editingId = null; this.render(); }
      }
    });

    // Double-click text to edit
    this.list.addEventListener('dblclick', e => {
      if (!e.target.classList.contains('todo-text')) return;
      const li = e.target.closest('li[data-id]');
      if (li) this.#startEdit(+li.dataset.id);
    });

    // Commit edit when focus leaves the input
    this.list.addEventListener('focusout', e => {
      if (!e.target.classList.contains('edit-input')) return;
      const li = e.target.closest('li[data-id]');
      if (li && this.#editingId === +li.dataset.id) {
        this.#commitEdit(+li.dataset.id, e.target.value);
      }
    });
  }

  #setDate() {
    const el = document.getElementById('date');
    if (!el) return;
    const d = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    el.textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
  }

  // ── Actions ───────────────────────────────────────────────────

  #add() {
    const text = this.input.value.trim();
    if (!text) {
      this.input.classList.add('shake');
      this.input.addEventListener('animationend', () => this.input.classList.remove('shake'), { once: true });
      this.input.focus();
      return;
    }
    this.#todos.unshift({ id: Date.now(), text, completed: false });
    this.input.value = '';
    this.#save();
    this.render();
    this.input.focus();
  }

  #toggle(id) {
    const t = this.#todos.find(t => t.id === id);
    if (t) { t.completed = !t.completed; this.#save(); this.render(); }
  }

  #remove(id) {
    const li = this.list.querySelector(`li[data-id="${id}"]`);
    if (!li) return;
    li.classList.add('removing');
    setTimeout(() => {
      this.#todos = this.#todos.filter(t => t.id !== id);
      this.#save();
      this.render();
    }, 200);
  }

  #startEdit(id) {
    this.#editingId = id;
    this.render();
    const inp = this.list.querySelector('.edit-input');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  #commitEdit(id, val) {
    const text = val.trim();
    if (text) {
      const t = this.#todos.find(t => t.id === id);
      if (t) t.text = text;
    }
    this.#editingId = null;
    this.#save();
    this.render();
  }

  // ── Render ────────────────────────────────────────────────────

  #filtered() {
    if (this.#filter === 'active')    return this.#todos.filter(t => !t.completed);
    if (this.#filter === 'completed') return this.#todos.filter(t =>  t.completed);
    return this.#todos;
  }

  #esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render() {
    const filtered   = this.#filtered();
    const total      = this.#todos.length;
    const done       = this.#todos.filter(t => t.completed).length;
    const active     = total - done;
    const pct        = total ? Math.round(done / total * 100) : 0;

    this.progressEl.style.width  = pct + '%';
    this.countEl.textContent     = `${active}개 남음`;
    this.clearBtn.style.visibility = done > 0 ? 'visible' : 'hidden';

    if (filtered.length === 0) {
      const cfg = {
        all:       ['📝', '할 일이 없습니다',   '위에서 새 할 일을 추가하세요'],
        active:    ['🎉', '모두 완료했습니다!', '진행 중인 할 일이 없습니다'],
        completed: ['📋', '완료된 항목 없음',   '왼쪽 원을 클릭해 완료 처리하세요'],
      };
      const [icon, title, sub] = cfg[this.#filter];
      this.list.innerHTML = `
        <li class="empty-state">
          <span class="empty-icon">${icon}</span>
          <p class="empty-title">${title}</p>
          <p class="empty-sub">${sub}</p>
        </li>
      `;
      return;
    }

    this.list.innerHTML = filtered.map(t => {
      const editing = this.#editingId === t.id;
      return `
        <li class="todo-item${t.completed ? ' completed' : ''}" data-id="${t.id}">
          <div class="checkbox${t.completed ? ' checked' : ''}"
               role="checkbox"
               aria-checked="${t.completed}"
               tabindex="0"
               aria-label="${t.completed ? '완료 취소' : '완료로 표시'}">
            <svg class="check-icon" viewBox="0 0 12 9" fill="none" aria-hidden="true">
              <path d="M1 4L4.5 7.5L11 1"
                    stroke="white"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
          </div>
          ${editing
            ? `<input class="edit-input" value="${this.#esc(t.text)}" maxlength="200" />`
            : `<span class="todo-text">${this.#esc(t.text)}</span>`
          }
          <button class="delete-btn" aria-label="삭제">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </li>
      `;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => new TodoApp());
