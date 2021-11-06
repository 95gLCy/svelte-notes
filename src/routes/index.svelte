<script>
  import { onMount } from 'svelte'
  import { notes, randomId, search } from '../utils/note'

  console.log('> Dashboard')

  // Methods
  const removeNote = function(note_id) {
    notes.removeNote(note_id)
    console.log('Removed note.')
  }
  const showItemsCounter = function(note) {
    let plural_singular = note.items.length == 1 ? 'note' : 'notes'
    return '(' + note.items.length + ' ' + plural_singular + ')'
  }
  const highlightSearchContent = function (items, search_term) {
    let result = []
    let words = search_term.trim().toLowerCase().split(' ')
    items.forEach(item => {
      if (words.some(w => item.title.toLowerCase().includes(w)))
        result.push(highlightSearchWords(item.title, search_term))
    })
    return result.join('<br>')
  }
  const highlightSearchWords = function(text, search_term){
    let words = search_term.trim().split(' ')
    words.sort((a, b) => text.toLowerCase().indexOf(a) - text.toLowerCase().indexOf(b))
    let remainder = text
    let new_text = ''
    // Each replacement needs to be done over the remaining text only because
    // otherwise we may start replacing previous replacements (e.g. `span`).
    words.forEach(w => {
      let i = remainder.toLowerCase().indexOf(w)
      if (i >= 0) {
        new_text += remainder.substr(0, i) + '<span class="highlight">'
          + remainder.substr(i, w.length) + '</span>'
        remainder = remainder.substr(i + w.length)
      }
    })
    new_text += remainder
    return new_text
  }
  const matchesAllWords = function(text, search_term) {
    let words = search_term.trim().toLowerCase().split(' ')
    return words.every(w => text.toLowerCase().includes(w))
  }

  let search_input
  let search_results
  let search_content_results
  let time_periods = []

  let last_week = new Date()
  last_week.setDate(last_week.getDate() - 7)
  let yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)


  $: {
    // Check for empty notes and remove them.
    $notes.forEach(note => {
      if (note.isEmpty())
        notes.removeNote(note.id)
    })
  }

  $: {
    // Update notes in time periods.
    let todays, last_weeks, older
    todays = $notes.filter(x => x.date.getTime() >= yesterday.getTime())
    last_weeks = $notes.filter(x =>
      x.date.getTime() >= last_week.getTime() &&
      x.date.getTime() <= yesterday.getTime()
    )
    older = $notes.filter(x => x.date.getTime() <= last_week.getTime())
    time_periods = [
      {'name': 'Today', notes: todays},
      {'name': 'Previous 7 days', notes: last_weeks},
      {'name': 'Older', notes: older},
    ]
  }

  $: {
    // Update search results (by note title).
    if ($search !== undefined && $search.trim() !== '') {
      search_results = $notes.filter(x => matchesAllWords(x.title, $search))
      search_results.sort((a, b) => b.date - a.date)
    }
    else
      search_results = undefined
  }

  $: {
    // Update search result (by content).
    if ($search !== undefined && $search.trim() !== '') {
      search_content_results = $notes.filter(note => {
        let text = note.items.map(item => item.title).join('\n')
        return matchesAllWords(text, $search)
      })
      search_content_results.sort((a, b) => b.date - a.date)
    }
    else
      search_content_results = undefined
  }

  $: {
    // Focus on search input.
    if (search_input !== undefined && search_input !== null) {
      search_input.focus()
    }
  }

  onMount(() => {
  })

</script>

<svelte:head>
  <title>Notes dashboard</title>
</svelte:head>

<slot />

<h1>Dashboard</h1>

<div>
  <div class="search-div">
    <label>Search:</label>
    <input type="text" bind:value={$search} bind:this={search_input}/>
  </div>
  <a href={randomId()}>+ Add new note</a>
</div>

<div>

  {#if search_results !== undefined}

    <div class="period-label">Search by title</div>
    {#each search_results as note (note.id)}
      <div class="note-link-div">
        <a href={note.id}>
          {@html highlightSearchWords(note.title, $search)}
        </a>
        <span class="counter">{showItemsCounter(note)}</span>
        <span class="remove-button" on:click={() => removeNote(note.id)}>[x]</span>
      </div>
    {/each}

    {#if search_content_results !== undefined }
      <div class="period-label">Search by content</div>
      {#each search_content_results as note (note.id)}
        <div class="note-link-div">
          <a href={note.id}>{note.title}</a>
          <span class="counter">{showItemsCounter(note)}</span>
          <span class="remove-button" on:click={() => removeNote(note.id)}>[x]</span>
          <div class="snippet">
            {@html highlightSearchContent(note.items, $search)}
          </div>
        </div>
      {/each}
    {/if}

  {:else}

    {#each time_periods as period}
      {#if period.notes.length > 0}
        <div class="period-label">{period.name}</div>
        {#each period.notes as note (note.id)}
          <div class="note-link-div">
            <a href={note.id}>{note.title}</a>
            <span class="counter">{showItemsCounter(note)}</span>
            <span class="remove-button" on:click={() => removeNote(note.id)}>[x]</span>
          </div>
        {/each}
      {/if}
    {/each}

  {/if}

</div>

<style>
  .period-label {
    font-size: 18pt;
    font-weight: 600;
    margin: 30px 0 15px 0;
  }
  .note-link-div {
    margin: 0 0 15px 20px;
  }
  .search-div {
    margin: 15px 0;
  }
  label {
    margin-right: 10px;
  }
  .search-div > input {
    font-family: monospace;
    font-size: .95em;
    line-height: 1.3em;
    color: #410;
    margin: 0 0 -3px 0;
    padding: 6px 0 3px 0;
    width: 400px;
    outline: none;
    resize: none;
    overflow: hidden;
    border: 0;
    border-bottom: 1px solid #ccc;
    background-color: white;
  }
  .counter {
    padding-left: 5px;
    font-size: 1rem;
    color: #888;
  }
  .remove-button {
    font-family: sans-serif;
    cursor: pointer;
    padding-left: 5px;
    font-size: 1rem;
    color: #888;
  }
</style>
