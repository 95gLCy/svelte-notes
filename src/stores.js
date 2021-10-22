import { writable, get } from 'svelte/store'
import Dexie from 'dexie'

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

const titleCase = function(string) {
  let sentence = string.toLowerCase().split(' ')
  for(let i = 0; i < sentence.length; i++){
     sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1)
  }
  return sentence.join(' ')
}

const randomDate = function(start=new Date(2021, 8, 25), end=new Date()) {
  return new Date(+start + Math.random() * (end - start))
}

const fetchNotes = async function() {
  let url = `https://jsonplaceholder.typicode.com/posts`
  let rsp = await fetch(url)
  const notes_data = await rsp.json()

  url = `https://jsonplaceholder.typicode.com/todos`
  rsp = await fetch(url)
  const items_data = await rsp.json()

  let loaded_notes = []
  notes_data.forEach(note => {
    note.id = randomNoteId()
    note.title = titleCase(note.title)
    let rnd_index = Math.floor(Math.random() * 170)
    let rnd_count = Math.floor(Math.random() * 10) + 1
    note.items = [...items_data.slice(rnd_index, rnd_index + rnd_count)]
    note.date = randomDate()
    loaded_notes.push(note)
  })
  loaded_notes = loaded_notes.slice(0, 10)
  loaded_notes.sort(function(a, b){
    return new Date(b.date) - new Date(a.date);
  })
  return loaded_notes
}

// let loaded_notes = await fetchNotes()
let loaded_notes = []
console.log('Loaded notes.')

// --- Custom store ---

const db = new Dexie('notes-database')

db.version(1).stores({
  notes: 'id,title,date',
  items: '++id,note_id,text', // ,level,*collapsed,position,is_done
})

const createNoteStore = function() {
  const note_store = writable(loaded_notes)

  // Load notes from database.
  db.transaction('rw', ['notes', 'items'], tx => {
    return tx.table('notes').toCollection().sortBy('date')
      .then(notes => {
        notes.forEach(note => {
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

  // const _getNewItemNext = function(note, i) {
  //   if (i === note.items.length)
  //     return null
  //   else
  //     return note.items[i]
  // }
  // const _getNewItemPrevious = function(note, i) {
  //   if (i === 0)
  //     return null
  //   else
  //     return note.items[i - 1]
  // }

  const _newItemLevel = function(note, i) {
    if (note.items.length === 0 || i === 0)
      return 0
    return note.items[i - 1].level
  }
  const _newItemPosition = function(note, i) {
    if (note.items.length === 0)
      return 1000
    if (i === note.items.length)
      return note.items[i - 1].position + 1000
    return Math.round(
      (note.items[i - 1].position + note.items[i].position) / 2)
  }
  const addItem = function(note_id, item_index) {
    let notes = get(note_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      // let previous = (item_index > 0) ? notes[i].items[item_index - 1] : null
      // let next = (item_index < notes[i].items.length) ? notes[i].items[item_index] : null
      let new_item = {
        id: randomNoteId(),
        note_id: note_id,
        title: '',
        level: _newItemLevel(notes[i], item_index),
        position: _newItemPosition(notes[i], item_index),
        // previous: previous,
        // next: next,
      }
      // previous.next = new_item
      // next.previous = new_item
      notes[i].items.splice(item_index, 0, new_item)
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
      let item = notes[i].items[item_index]
      // item.next.previous = item.previous
      // item.previous.next = item.next
      notes[i].items.splice(item_index, 1)
      note_store.set(notes)
      // db
      db.transaction('rw', ['items'], tx => {
        return tx.table('items').delete(item.id)
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
      let src_item = {...items[src_index]}
      let dest_item = {...items[dest_index]}
      items[src_index] = {
        ...dest_item,
        position: src_item.position,
        next: src_item.next,
        previous: src_item.previous,
      }
      items[dest_index] = {
        ...src_item,
        position: dest_item.position,
        next: dest_item.next,
        previous: dest_item.previous,
      }
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
