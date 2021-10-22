<script>
  import { Markup } from '../markup'
  import { createEventDispatcher } from 'svelte';

  export let item
  export let is_selected
  export let index

  let markup = new Markup()
  const dispatch = createEventDispatcher()

  const parseContent = function() {
    return markup.parser(item)
  }
  const clicked = function(event) {
    if (event.target.nodeName === 'A')
      event.stopPropagation()
    else {
      dispatch('select-item', index)
      event.preventDefault()
    }
  }
  const changed = function(event) {
    dispatch('item-changed', index)
  }
  const deselect = function() {
    dispatch('deselect-item', index)
  }
  const autoHeight = function(elem) {
    elem.style.height = "1px";
    elem.style.height = (elem.scrollHeight - 12) + "px";
  }
  const handleKeyDown = function(event) {
    let key = event.key
    // Deselect.
    if (key === 'Escape') {
      deselect()
      event.stopPropagation()
    }
    // Select below.
    if (key === 'ArrowDown' && !event.altKey) {
      dispatch('select-below', index)
      event.preventDefault()
    }
    // Select above.
    if (key === 'ArrowUp' && !event.altKey) {
      dispatch('select-above', index)
      event.preventDefault()
    }
    // Move down.
    if (key === 'ArrowDown' && event.altKey) {
      dispatch('move-down', index)
      event.preventDefault()
    }
    // Move up.
    if (key === 'ArrowUp' && event.altKey) {
      dispatch('move-up', index)
      event.preventDefault()
    }
    // Add new item below this one.
    if (key === 'Enter' && !event.altKey && !event.shiftKey) {
      dispatch('add-item-below', index)
      event.preventDefault()
    }
    // Mark done.
    if (key === 'Enter' && event.altKey) {
      dispatch('mark-done', index)
      event.preventDefault()
    }
    // Increase indentation.
    if (key === 'Tab' && !event.shiftKey) {
      dispatch('increase-indentation', index)
      event.preventDefault()
    }
    // Decrease indentation.
    if (key === 'Tab' && event.shiftKey) {
      dispatch('decrease-indentation', index)
      event.preventDefault()
    }
  }

  let selected_ta
  $: {
    // Focus on selected item and auto-height.
    if (selected_ta !== undefined && selected_ta !== null) {
      selected_ta.focus()
      autoHeight(selected_ta)
    }
  }

  let margin
  $: {
    margin = item.level * 34
  }

</script>

<div class="background-div">
  <div style="margin-left: {margin.toString()}px;">
    {#if is_selected}
      <textarea class="item-ta" class:done={item.done} rows="1"
        bind:value={item.title} bind:this={selected_ta}
        on:keydown={event => handleKeyDown(event)} 
        on:blur={deselect} on:input={changed}></textarea>
    {:else}
      <div class="item-div" on:mousedown={clicked}>
        <div class="md" class:done={item.done} id={'anchor_' + index}>
          {@html parseContent()}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .background-div {
    background-image: url("static/bg_lines.png");
    background-repeat: repeat;
    background-size: 30 1px;
    background-position: left -1px bottom 0px;
    margin: 0;
  }
  .item-div {
    background-color: white;
    padding: 6px 0;
    margin: 0;
    line-height: 1.4em;
  }
  .item-div.selected {
    font-family: monospace;
    font-size: .95em;
    color: #410;
    background-color: #f2f2f2;
    border-bottom: 1px solid #ccc;
    border-radius: 2px;
  }
  div.md {
    outline: none;
  }
  .item-ta {
    font-family: monospace;
    font-size: .95em;
    line-height: 1.3em;
    color: #410;
    margin: 0 0 -3px 0;
    padding: 6px 0 6px 0;
    width: 100%;
    outline: none;
    resize: none;
    overflow: hidden;
    border: 0;
    border-bottom: 1px solid #ccc;
    background-color: #f2f2f2; /* #f6f6f6 #E8FDF5 */
  }
</style>