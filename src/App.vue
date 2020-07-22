<template>
    <div id="app">
        <EurekaCanvas :canvasImageSource="image" :gridSizeInPixels="50" :coordinatesOffset="1" />
    </div>
</template>

<script>
    import EurekaCanvas from './components/EurekaCanvas.vue'

    export default {
        name: 'app',
        components: {
            EurekaCanvas
        },
        data() {
            return {
                image: require('./assets/test.jpg')
            }
        }
    }
</script>

<style>
    body, html {
        height: 100vh;
        width: 100vw;
        padding: 0;
        margin: 0;
    }

    #app {
        width: 100%;
        height: 100%;
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
    }
</style>