<template>
    <div id="app">
        <EurekaCanvas :canvasImageSource="image" :gridSizeInPixels="50" :coordinatesOffset="1" :positions="positions" />
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
                image: require('./assets/test.jpg'),
                positions: []
            }
        },
        mounted() {
            this.setUpPositions()
        },
        methods: {
            setUpPositions() {
                let positions = this.loadPositions()
                positions.forEach(position => {
                    position.icons.forEach(async (icon) => {
                        icon.image =  await this.loadImage(icon.path)
                    })
                })

                this.positions = positions
            },
            loadPositions() {
                return [
                    {
                        label: 'Test',
                        icons: [
                            {
                                path: require('./assets/testIconRed.png'),
                                image: null
                            },
                            {
                                path: require('./assets/testIconBlue.png'),
                                image: null
                            }
                        ],
                        coordinates: {
                            x: 41,
                            y: 41
                        }
                    }
                ]
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