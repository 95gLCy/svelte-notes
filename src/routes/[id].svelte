<script>
  import "../app.css"
  import { page } from '$app/stores'
  import { notes } from '../utils/note'
  import NoteItem from '../components/NoteItem.svelte'
  import { tick, onMount } from 'svelte'

  console.log('> Note')

  const note_id = $page.params.id
  const save_delay = 1000

  // Check if there is a note with this id.
  let matched_notes = $notes.filter(x => x.id === note_id)
  if (matched_notes.length === 0) {
    // Cannot find note with this id. Create a new one.
    notes.addNote(note_id)
    // We don't have to set `note` explicitly because the line above will
    // trigger a change to `notes` and we have a watcher for that below. 
  }

  let selected
  let note
  let title_ta
  let save_timeout_items
  let save_timeout_title
  let changed_items = []
  
  // Methods 
  const selectItem = function(index) {
    if (index >= 0 && index < note.items.length)
      selected = index
    console.log(note.items[index])
  }
  const deselectItem = function(index) {
    if (selected === index) {
      let item = note.items[index]
      let offset = 0
      if (item.isEmpty()) {
        notes.removeItemFromNote(note_id, index)
        changed_items = changed_items.filter(x => x !== index)
        console.log('Removed empty item.')
        offset = 1
      }
      selected = undefined
      return offset
    }
    return -1
  }
  const selectBelow = function(i) {
    if (i < note.items.length - 1) {
      let offset = deselectItem(i)
      selectItem(i + 1 - offset)
    }
  }
  const selectAbove = function(i) {
    if (i > 0) {
      deselectItem(i)
      selectItem(i - 1)
    }
  }
  const moveDown = async function(i) {
    if (i < note.items.length - 1) {
      notes.moveItemDownInNote(note_id, i)
      // When we move an item, it will blur and deselect. We have to wait for
      // that on-blur update.
      await tick
      selectItem(i + 1)
      itemChanged(i)
      itemChanged(i + 1)
    }
  }
  const moveUp = async function(i) {
    if (i > 0) {
      notes.moveItemUpInNote(note_id, i)
      // When we move an item, it will blur and deselect. We have to wait for
      // that on-blur update.
      await tick
      selectItem(i - 1)
      itemChanged(i)
      itemChanged(i - 1)
    }
  }
  const increaseIndentation = function(i) {
    if (note.items[i].level < 6) {
      note.items[i].level++
      itemChanged(i)
    }
  }
  const decreaseIndentation = function(i) {
    if (note.items[i].level > 0) {
      note.items[i].level--
      itemChanged(i)
    }
  }
  const markDone = function(index) {
    let item = note.items[index]
    if (!item.isEmpty()) {
      if (item.done === undefined)
        item.done = true
      else
        item.done = !item.done
      itemChanged(index)
      deselectItem(index)
      selectItem(index + 1)
    }
  }
  const addItemBelow = function(index) {
    let item = note.items[index]
    if (!item.isEmpty()) {
      deselectItem(index)
      addItem(index + 1)
    }
  }
  const addItem = function(index) {
    notes.addItemToNote(note_id, index)
    selectItem(index)
    console.log('Added new item.')
  }
  const itemChanged = function(index) {
    if (!changed_items.includes(index))
      changed_items.push(index)
    // Set timeout (throttle).
    clearTimeout(save_timeout_items)
    save_timeout_items = window.setTimeout(() => {
      changed_items.forEach(i => {
        notes.saveItem(note_id, i)
        console.log('Item ' + i + ' has changed.')
      })
      changed_items = []
    }, save_delay)
  }
  const checkEmptyTitle = function() {
    if (note.title.trim() === '')
      note.title = 'Untitled'
  }
  const titleChangeDetected = function() {
    // Set timeout (throttle).
    clearTimeout(save_timeout_title)
    save_timeout_title = window.setTimeout(() => {
      notes.saveNote(note_id)
      console.log('Title has changed.')
    }, save_delay)
  }
  const handleWindowKeyPress = function(event) {
    let key = event.key
    // On Enter, if nothing is selected, add new item at the end.
    if (key === 'Enter') {
      if (selected === undefined) {
        addItem(note.items.length)
        event.preventDefault()
      }
    }
    if (key === 'Escape') {
      if (selected === undefined) {
        title_ta.blur()
        event.preventDefault()
      }
    }
  }

  $: {
    // Update this note when notes store has updated.
    let matched_notes = $notes.filter(x => x.id === note_id)
    if (matched_notes.length > 0)
      note = matched_notes[0]
  }

  onMount(() => {
    // Focus on note title if it's untitled and empty.
    if (title_ta !== undefined && title_ta !== null)
      if ((note.title.trim() === 'Untitled' || note.title.trim() === '') &&
        note.items.length === 0)
        title_ta.focus()
  })

</script>

<svelte:head>
  <title>Note {note_id}</title>
</svelte:head>

<svelte:window on:keydown={handleWindowKeyPress}/>

<slot />

{#if (note !== undefined)}

  <div class="title-div">
    <textarea class="title-ta" rows="1" bind:value={note.title}
      bind:this={title_ta} on:blur={checkEmptyTitle}
      on:input={titleChangeDetected}></textarea>
  </div>

  {#each note.items as item, i (item.id)}
    <NoteItem item={item} selected={selected} index={i}
      on:select-item={e => selectItem(e.detail)}
      on:deselect-item={e => deselectItem(e.detail)}
      on:select-below={e => selectBelow(e.detail)}
      on:select-above={e => selectAbove(e.detail)}
      on:move-down={e => moveDown(e.detail)}
      on:move-up={e => moveUp(e.detail)}
      on:increase-indentation={e => increaseIndentation(e.detail)}
      on:decrease-indentation={e => decreaseIndentation(e.detail)}
      on:mark-done={e => markDone(e.detail)}
      on:add-item-below={e => addItemBelow(e.detail)}
      on:item-changed={e => itemChanged(e.detail)} />
  {/each}

{/if}

<style>
  .title-div {
    padding: 2px 0;
    background-color: white;
  }
  .title-ta {
    font-size: 28pt;
    font-weight: 600;
    width: 100%;
    border: 0;
    padding-bottom: 5px;
    border-bottom: 1px solid white;
    margin-bottom: 20px;
    /*border-radius: 3px;*/
    outline: none;
    resize: none;
    overflow: hidden;
    font-family: Charter;
    letter-spacing: -.02em;
  }
  .title-ta:focus {
    border-bottom: 1px solid #ccc;
    background-color: #f2f2f2;
  }
</style>
