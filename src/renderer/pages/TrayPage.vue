<template>
  <div id="tray-page">
    <h1>111111</h1>
  </div>
</template>

<script>
  export default {
    name: 'tray-page',
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    }
  }
</script>

<style>
</style>
