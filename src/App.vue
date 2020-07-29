<template>
    <div id="app">
        <EurekaCanvas :canvasImageSource="image" :gridSizeInPixels="50" :coordinatesOffset="1" :positions="positions" :positionsIdKey="'id'" />
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
                image: require('./assets/pyros.jpg'),
                positions: []
            }
        },
        async mounted() {
            this.positions = await this.loadPositions();
        },
        methods: {
            async loadPositions() {
                let positions = []
                let icon = {
                    path: require('./assets/testIconRed.png'),
                    image: null
                }
                icon.image = await this.loadImage(icon.path)
                const baseObj = {
                    id: 0,
                    label: '',
                    icons: [
                        icon
                    ],
                    coordinates: {
                        x: 1,
                        y: 1
                    }
                }
                for (let index = 0; index < 5; index++) {
                    positions.push(Object.assign(Object.assign({}, baseObj), {
                        id: index,
                        label: `Test-${index+1}`,
                        coordinates: {
                            x: Math.floor(Math.random() * (41 - 1 + 1)) + 1,
                            y: Math.floor(Math.random() * (41 - 1 + 1)) + 1
                        }
                    }))

                }
                return positions
            },
            loadImage: url => new Promise(resolve => {
                let img = new Image()
                img.onload = () => resolve(img)
                img.src = url
            })
        }
    }
</script>

<style>
    body,
    html {
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