import { writable, get } from 'svelte/store'
import Dexie from 'dexie'
import { Note } from './note'

export const search_term = writable('')

export const randomNoteId = function(length=8) {
  let result = ''
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

// Custom store.

const db = new Dexie('notes-database')

db.version(1).stores({
  notes: 'id,title,date',
  items: '++id,note_id,text', // ,level,*collapsed,position,is_done
})

const createNoteStore = function() {
  const note_store = writable([])

  // Load notes from database.
  db.transaction('rw', ['notes', 'items'], tx => {
    return tx.table('notes').toCollection().sortBy('date')
      .then(notes => {
        notes.forEach(x => {
          let note = new Note(x.id, x.title, [], x.date)
          tx.table('items').where('note_id').equals(note.id).sortBy('position')
            .then(items => {
              note.items = items.filter(x => x.title.trim() !== '')
              note_store.update(notes => [note, ...notes])
              // Delete empty items.
              items.map(x => {
                if (x.title.trim() === '') {
                  tx.table('items').delete(x.id)
                    .then(rsp => console.log('db remove item'))
                }
              })
            })
            .catch(err => console.log(err))
        })
        console.log('db load')
      })
  })

  const addNote = function(note_id=randomNoteId()) {
    let new_note = {
      id: note_id,
      title: 'Untitled',
      items: [],
      date: new Date(),
    }
    db.transaction('rw', ['notes'], tx => {
      return tx.table('notes').add({
        id: new_note.id,
        title: new_note.title,
        date: new_note.date,
      })
      .then(rsp => {
        note_store.update(notes => [new_note, ...notes])
        console.log('db add note')
      })
      .catch(err => console.log('Note already exists in the database.'))
    })
  }

  const removeNote = function(note_id) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      notes.splice(i, 1)
      note_store.set(notes)
      // db
      db.transaction('rw', ['notes', 'items'], tx => {
        return tx.table('notes').delete(note_id)
          .then(rsp => {
            return tx.table('items').where('note_id').equals(note_id).delete()
              .then(rsp => console.log('db remove note'))
          })
      })
    }
  }

  const addItem = function(note_id, item_index) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let new_item = notes[i].addNewItem(item_index)
      note_store.set(notes)
      // db
      db.transaction('rw', ['items'], tx => {
        return tx.table('items').add({
          id: new_item.id,
          note_id: new_item.note_id,
          title: new_item.title,
          level: new_item.level,
          position: new_item.position,
        })
        .then(item_id => {
          // notes[i].items[item_index].id = item_id
          console.log('db add item')
        })
      })
    }
  }

  const removeItem = function(note_id, item_index) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let removed_item = notes[i].removeItem(item_index)
      note_store.set(notes)
      // db
      db.transaction('rw', ['items'], tx => {
        return tx.table('items').delete(removed_item.id)
          .then(rsp => console.log('db remove item'))
      })
    }
  }

  const modifyItem = function(note_id, item_index) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let item = notes[i].items[item_index]
      // Any changes to the item should already be reflected in the item.
      let changes = {
        title: item.title,
        level: item.level,
        position: item.position,
        done: item.done,
      }
      // db
      db.transaction('rw', ['items'], tx => {
        return tx.table('items').where('id').equals(item.id).modify(changes)
          .then(rsp => {
            if (rsp > 0)
              console.log('db change item')
            else
              console.log('db no change')
          })
      })
    }
  }

  const switchItems = function(note_id, src_index, dest_index) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let items = notes[i].items
      let src_item = items[src_index]
      let dest_position = items[dest_index].position
      items[src_index] = items[dest_index]
      items[src_index].position = src_item.position
      items[dest_index] = src_item
      items[dest_index].position = dest_position
      note_store.set(notes)
    }
  }

  const modifyNoteTitle = function(note_id) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let note = notes[i]
      let changes = {
        title: note.title
      }
      // db
      db.transaction('rw', ['notes'], tx => {
        return tx.table('notes').where('id').equals(note_id).modify(changes)
          .then(rsp => {
            if (rsp > 0)
              console.log('db change note')
            else
              console.log('db no change')
          })
      })
    }
  }

  return {
    subscribe: note_store.subscribe,
    addNote,
    removeNote,
    removeItem,
    addItem,
    modifyItem,
    modifyNoteTitle,
    switchItems,
  }
}
export const notes = createNoteStore()
