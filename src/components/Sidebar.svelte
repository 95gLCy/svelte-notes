<script>

  import { onMount } from 'svelte'
  import marked from 'marked'

  export let items
  let show_sidebar = false

  const removeTags = function(markdown_text) {
    let html = marked(markdown_text)
    let clean_text = html.replace(/<\/?[^>]+(>|$)/g, '')
    if (clean_text.length > 30)
      return clean_text.slice(0, 30).trim() + '...'
    return  clean_text
  }
  const scrollIntoView = function(item_index) {
    document.getElementById('anchor_' + item_index).scrollIntoView({
      'behavior': 'smooth',
    })
  }
  const hideSidebar = function() {
    show_sidebar = false
  }
  const showSidebar = function() {
    show_sidebar = true
  }

  onMount(() => {})

</script>

<slot />

<div class="sidebar">
  <h1>Scroll to:</h1>

  {#each items as item, i}
    {#if item.level < 1}
      <p><a on:click={() => scrollIntoView(i)}>
        {removeTags(item.title)}
      </a></p>
    {/if}
  {/each}

</div>

<style>

h1 {
  font-size: 18pt;
  font-weight: 400;
}
p {
  font-size: .9em;
  margin: 10px 0;
}
a {
  cursor: pointer;
}
.sidebar-container {
  float: right;
  width: 280px;
  border: 1px solid red;
}
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  padding: 45px 0 0 30px;
  background-color: white;
  border-left: 1px solid #ccc;
  -webkit-box-shadow: -4px 0px 12px -1px rgba(0,0,0,0.2);
  -moz-box-shadow: -4px 0px 12px -1px rgba(0,0,0,0.2);
  box-shadow: -4px 0px 12px -1px rgba(0,0,0,0.2);
}
</style>
