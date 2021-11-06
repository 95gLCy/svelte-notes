import { writable, get } from 'svelte/store'
import { database } from '../utils/database'

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
  isUntitled() {
    return  this.title.trim() === 'Untitled' || this.title.trim() === ''
  }
  isEmpty() {
    return this.isUntitled() && this.items.length === 0
  }
  addItem(index) {
    let new_item = new Item({
      id: randomId(length=12),
      note_id: this.id,
      title: '',
      level: (this.items.length === 0) ? 0 : this.items[index - 1].level,
      position: newItemPosition(this.items, index),
      collapsed: [],
    })
    this.items.splice(index, 0, new_item)
    return new_item
  }
  removeItem(index) {
    let removed_item = this.items[index]
    this.items.splice(index, 1)
    return removed_item
  }
  switch_items(src_index, dest_index) {
    let src = new Item({...this.items[src_index]})
    src.position = this.items[dest_index].position
    let dest = new Item({...this.items[dest_index]})
    dest.position = this.items[src_index].position
    this.items[dest_index] = src
    this.items[src_index] = dest
  }
  getChildren(index) {
    if (index >= 0 && index < this.items.length) {
      let children = []
      let item = this.items[index]
      for (let i = index + 1; i < this.items.length; i++) {
        if (this.items[i].level > item.level)
          children.push(this.items[i])
        else
          break
      }
      return children
    }
    return []
  }
}

const createNoteStore = function() {
  const _store = writable([])

  let db = database()

  db.loadNotes().then(notes => {
    notes.forEach(note_content => {
      let note = new Note(note_content)
      db.loadItems(note.id).then(items => {
        items = items.map(item_content => new Item(item_content))
        note.items = items.filter(item => !item.isEmpty())
        if (note.isEmpty()) {
          db.deleteNote(note)
        } else {
          _store.update(notes => [note, ...notes])
          let empty_items = items.filter(item => item.isEmpty())
          empty_items.forEach(item => {
            db.deleteItem(item)
          })
          console.log(note)
        }
      })
    })
  })

  const addNote = function(note_id) {
    let new_note = new Note({
      id: note_id,
      title: 'Untitled',
      date: new Date(),
      items: [],
    })
    db.addNote(new_note)
      .then(rsp => {
        _store.update(notes => [new_note, ...notes])
        console.log('db add note')
      })
      .catch(err => console.log('Note already exists in the database.'))
  }

  const removeNote = function(note_id) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let removed_note = notes[index]
      notes.splice(index, 1)
      db.deleteNote(removed_note)
      _store.set(notes)
    }
  }

  const addItemToNote = function(note_id, item_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let new_item = notes[index].addItem(item_index)
      _store.set(notes)
      db.addItem(new_item)
        .then(item => console.log('db add item'))
    }
  }

  const removeItemFromNote = function(note_id, item_index) {
    let notes = get(_store)
    let i = notes.findIndex(x => x.id === note_id)
    if (i >= 0) {
      let removed_item = notes[i].removeItem(item_index)
      _store.set(notes)
      db.deleteItem(removed_item)
    }
  }

  const saveItemChanges = function(note_id, item_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let item = notes[index].items[item_index]
      db.saveItemChanges(item)
    }
  }

  const saveNoteChanges = function(note_id) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let note = notes[index]
      db.saveNoteChanges(note)
    }
  }

  const moveItemUpInNote = function(note_id, item_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0 && item_index > 0) {
      notes[index].switch_items(item_index, item_index - 1)
      _store.set(notes)
      db.saveItemChanges(notes[index].items[item_index])
      db.saveItemChanges(notes[index].items[item_index - 1])
    }
  }

  const moveItemDownInNote = function(note_id, item_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0 && item_index < notes[index].items.length - 1) {
      notes[index].switch_items(item_index, item_index + 1)
      _store.set(notes)
      db.saveItemChanges(notes[index].items[item_index])
      db.saveItemChanges(notes[index].items[item_index + 1])
    }
  }

  const collapseItemsInNote = function(note_id, collapse_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let item = notes[index].items[collapse_index]
      let children = notes[index].getChildren(collapse_index)
      children = children.map(child => {
        child.level -= item.level
        return child
      })
      if (!('collapsed' in item))
        item.collapsed = []
      item.collapsed = [...item.collapsed, ...children]
      notes[index].items.splice(collapse_index + 1, children.length)
      _store.set(notes)
      children.forEach(child_to_delete => {
        db.deleteItem(child_to_delete)
      })
      db.saveItemChanges(item)
    }
  }

  const expandItemsInNote = function(note_id, expand_index) {
    let notes = get(_store)
    let index = notes.findIndex(x => x.id === note_id)
    if (index >= 0) {
      let item = notes[index].items[expand_index]
      let children = item.collapsed
      children.forEach((child, k) => {
        child.id = randomId(length=12)
        child.level += item.level
        child.position = newItemPosition(notes[index].items, expand_index + k + 1)
        notes[index].items.splice(expand_index + k + 1, 0, new Item(child))
        db.addItem(child)
          .then(item => console.log('db add item'))
      })
      item.collapsed = []
      _store.set(notes)
      db.saveItemChanges(item)
    }
  }

  return {
    subscribe: _store.subscribe,
    addNote,
    removeNote,
    addItemToNote,
    removeItemFromNote,
    saveItemChanges,
    saveNoteChanges,
    moveItemUpInNote,
    moveItemDownInNote,
    collapseItemsInNote,
    expandItemsInNote,
  }
}

export const notes = createNoteStore()
export const search = writable('')
