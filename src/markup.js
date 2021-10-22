
const testCodeBlock = function(text) {
  let regex = /^```\s*(.*)\s*```$/sm
  return regex.test(text)
}

const testNumberedList = function(text) {
  let regex = /^(\d+)[\.\)]\s+(\S.*)$/
  return regex.test(text)
}

export class Markup {

  constructor() {
    this.state = {}
  }

  parser(item) {
    this.text = item.title
    this.item = item
    // If it's a code block, skip all the other parsers.
    if (testCodeBlock(this.text))
      return this.parseCodeBlock().text
    // Otherwise, parse everything else.
    return this
      .parseBlockquote()
      .parseHeading()
      .parseBulletList()
      .parseNumberedList()
      .parseInlineCode()
      .parseLinks()
      .parseItalics()
      .parseBold()
      .text
  }

  retrieveNumber(item, level) {
    if (item.previous === null)
      return 1
    if (item.previous.level < level)
      return 1
    if (item.previous.level === level)
      if (testNumberedList(item.previous.title))
        return this.retrieveNumber(item.previous, level) + 1
      else
        return 1
    if (item.previous.level > level)
      return this.retrieveNumber(item.previous, level)
  }

  parseHeading() {
    let h4_regex = /^####\s+(\S.*)$/
    let h3_regex = /^###\s+(\S.*)$/
    let h2_regex = /^##\s+(\S.*)$/
    let h1_regex = /^#\s+(\S.*)$/
    this.text = this.text
      .replace(h4_regex, '<h4>$1</h4>')
      .replace(h3_regex, '<h3>$1</h3>')
      .replace(h2_regex, '<h2>$1</h2>')
      .replace(h1_regex, '<h1>$1</h1>')
    return this
  }

  parseInlineCode() {
    let regex = /`([^`]+)`/
    this.text = this.text.replace(regex, '<code>$1</code>')
    return this
  }

  parseBlockquote() {
    let regex = /^>\s+(\S.*)$/
    this.text = this.text.replace(regex, '<blockquote>$1</blockquote>')
    return this
  }

  parseLinks() {
    let regex = /\[([^\]]+)\]\(([^\)]+)\)/
    this.text = this.text.replace(regex, '<a href="$2">$1</a>')
    return this
  }

  parseItalics() {
    let regex = /_([^\s\_][^_]+[^\s\_])_/
    this.text = this.text.replace(regex, '<em>$1</em>')
    return this
  }

  parseBold() {
    let regex = /\*([^\s\*][^\*]+[^\s\*])\*/
    this.text = this.text.replace(regex, '<strong>$1</strong>')
    return this
  }

  parseCodeBlock() {
    let regex = /^```\s*(.*)\s*```$/sm
    this.text = this.text.replace(regex, '<pre><code>$1</code></pre>')
    return this
  }

  parseBulletList() {
    let regex = /^[\*\-]\s+(\S.*)$/
    let output = `<p><span class="bullet"><svg width="12px" height="12px"
      viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="28" /></svg></span>$1</p>`
    this.text = this.text.replace(regex, output)
    return this
  }

  parseNumberedList() {
    // let number
    // if (testNumberedList(this.text))
    //   number = this.retrieveNumber(this.item, this.item.level)
    let regex = /^(\d+)[\.\)]\s+(\S.*)$/
    let output = `<p><span class="bullet"><strong>$1.</strong></span>$2</p>`
    this.text = this.text.replace(regex, output)
    return this
  }

}