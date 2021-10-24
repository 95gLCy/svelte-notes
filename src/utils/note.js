import { writable, get } from 'svelte/store'
import Dexie from 'dexie'

const db = new Dexie('notes-database')

db.version(1).stores({
  notes: 'id,title,date',
  items: '++id,note_id,text', // ,level,*collapsed,position,is_done
})

export const randomId = function(length=8) {
  let result = ''
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

const newItemPosition = function(items, index) {
	if (items.length === 0)
		return 1000
	if (index === items.length)
		return items[index - 1].position + 1000
	return Math.round(
		(items[index - 1].position + items[index].position) / 2)
}

class Item {
  constructor(item) {
    // id, note_id, level, title, position
    Object.assign(this, item)
  }
  isEmpty() {
    return this.title.trim() === ''
  }
}

export class Note {
	constructor(note, items=[]) {
    // id, title, date
    Object.assign(this, note)
    this.items = items
	}
  isEmpty() {
    return ((this.title.trim() === 'Untitled' || this.title.trim() === '') &&
      this.items.length === 0)
  }
	addItem(index) {
		let new_item = new Item({
			id: randomId(length=12),
			note_id: this.id,
			title: '',
			level: (this.items.length === 0) ? 0 : this.items[index - 1].level,
			position: newItemPosition(this.items, index),
    })
		this.items.splice(index, 0, new_item)
		return new_item
	}
	removeItem(index) {
		let removed_item = this.items[index]
		this.items.splice(index, 1)
		return removed_item
	}
	moveItemUp(index)  {
		if (index > 0) {
			this._moveItemUpOrDown(index, index - 1)
		}
	}
	moveItemDown(index)  {
		if (index < this.items.length - 1) {
			this._moveItemUpOrDown(index, index + 1)
		}
	}
  _moveItemUpOrDown(src_index, dest_index) {
    let src = new Item({...this.items[src_index]})
    src.position = this.items[dest_index].position
    let dest = new Item({...this.items[dest_index]})
    dest.position = this.items[src_index].position
    this.items[dest_index] = src
    this.items[src_index] = dest
  }
}

const createNoteStore = function() {
  const _store = writable([])
  
  // Load notes from database.
  db.transaction('rw', ['notes', 'items'], tx => {
    return tx.table('notes').toCollection().sortBy('date')
      .then(notes => {
        notes.forEach(x => {
          let note = new Note(x)
          tx.table('items').where('note_id').equals(note.id).sortBy('position')
            .then(items => {
              let none_empty_items = items.filter(x => x.title.trim() !== '')
              note.items = none_empty_items.map(x => new Item(x))
              if (note.isEmpty()) {
                tx.table('notes').delete(note.id)
                  .then(rsp => console.log('db remove empty note'))
              } else {
                _store.update(notes => [note, ...notes])
                // Delete empty items.
                items.map(x => {
                  if (x.title.trim() === '') {
                    tx.table('items').delete(x.id)
                      .then(rsp => console.log('db remove item'))
                  }
                })
              }
            })
            .catch(err => console.log(err))
        })
        console.log('db load')
      })
  })

  const addNote = function(note_id) {
    let new_note = new Note({
      id: note_id,
      title: 'Untitled',
      date: new Date(),
      items: [],
    })
    db.transaction('rw', ['notes'], tx => {
      return tx.table('notes').add({
        id: new_note.id,
        title: new_note.title,
        date: new_note.date,
      })
      .then(rsp => {
        _store.update(notes => [new_note, ...notes])
        console.log('db add note')
      })
      .catch(err => console.log('Note already exists in the database.'))
    })
  }

  const removeNote = function(note_id) {
    let notes = get(_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      notes.splice(i, 1)
      _store.set(notes)
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

  const addItemToNote = function(note_id, item_index) {
    let notes = get(_store)
    console.log(notes)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let new_item = notes[i].addItem(item_index)
      _store.set(notes)
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

  const removeItemFromNote = function(note_id, item_index) {
    let notes = get(_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let removed_item = notes[i].removeItem(item_index)
      _store.set(notes)
      // db
      db.transaction('rw', ['items'], tx => {
        return tx.table('items').delete(removed_item.id)
          .then(rsp => console.log('db remove item'))
      })
    }
  }

  const saveItem = function(note_id, item_index) {
    let notes = get(_store)
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

  const moveItemUpInNote = function(note_id, src_index) {
    let notes = get(_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      notes[i].moveItemUp(src_index)
      _store.set(notes)
    }
  }

  const moveItemDownInNote = function(note_id, src_index) {
    let notes = get(_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      notes[i].moveItemDown(src_index)
      _store.set(notes)
    }
  }

  const saveNote = function(note_id) {
    let notes = get(_store)
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
    subscribe: _store.subscribe,
    addNote,
    removeNote,
    addItemToNote,
    removeItemFromNote,
    saveItem,
    moveItemUpInNote,
    moveItemDownInNote,
    saveNote,
  }
}

export const notes = createNoteStore()
export const search = writable('')
