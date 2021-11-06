import Dexie from 'dexie'

const db = new Dexie('notes-database')

db.version(1).stores({
  notes: 'id,title,date',
  items: '++id,note_id,text',
})

export const database = function() {

  let timeout
  let timeout_delay = 2000
  let queue = new Map()

  const loadNotes = function() {
    return db.transaction('r', ['notes'], tx => {
      return tx.table('notes').toCollection().sortBy('date')
    })
  }
  const loadItems = function(note_id) {
    return db.transaction('r', ['items'], tx => {
      return tx.table('items').where('note_id').equals(note_id).sortBy('position')
    })
  }
  const _debounce = function(id, func, input) {
    queue.set(id, {func, input})
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      for (const [k, v] of queue) {
        v.func(v.input)
      }
      queue.clear()
    }, timeout_delay)
  }
  const deleteNote = function(note) {
    _debounce(note.id, _deleteNote, note)
  }
  const _deleteNote = function(note) {
    console.log('triggered delete note function', note.id)
    return db.transaction('rw', ['notes'], tx => {
      return tx.table('notes').delete(note.id)
    })
  }
  const addNote = function(note) {
    console.log('triggered add note function', note.id)
    return db.transaction('rw', ['notes'], tx => {
      return tx.table('notes').add(note)
    })
  }
  const addItem = function(item) {
    console.log('triggered add item function', item.id)
    return db.transaction('rw', ['items'], tx => {
      return tx.table('items').add({
        id: item.id,
        note_id: item.note_id,
        title: item.title,
        level: item.level,
        position: item.position,
      })
    })
  }
  const deleteItem = function(item) {
    _debounce(item.id, _deleteItem, item.id)
  }
  const _deleteItem = function(item_id) {
    console.log('triggered delete item function', item_id)
    return db.transaction('rw', ['items'], tx => {
      return tx.table('items').delete(item_id)
    })
  }
  const saveItemChanges = function(item) {
    _debounce(item.id, _saveItemChanges, item)
  }
  const _saveItemChanges = function(item) {
    let changes = {
      title: item.title,
      level: item.level,
      position: item.position,
      done: item.done,
      collapsed: item.collapsed,
    }
    console.log('triggered save item function', item.id)
    return db.transaction('rw', ['items'], tx => {
      return tx.table('items').where('id').equals(item.id).modify(changes)
    })
  }
  const saveNoteChanges = function(note) {
    _debounce(note.id, _saveNoteChanges, note)
  }
  const _saveNoteChanges = function(note) {
    let changes = {
      title: note.title
    }
    console.log('triggered save note function')
    return db.transaction('rw', ['notes'], tx => {
      return tx.table('notes').where('id').equals(note.id).modify(changes)
    })
  }

  return {
    loadNotes,
    loadItems,
    deleteNote,
    addNote,
    addItem,
    deleteItem,
    saveItemChanges,
    saveNoteChanges,
  }
}
