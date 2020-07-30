<template>
    <div id="app">
        <EurekaCanvas v-if="!loading" :canvasImage="image" :gridSizeInPixels="50" :coordinatesOffset="1" :positions="positions" :positionsIdKey="'id'" />
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
                loading: true,
                image: null,
                imagePath: require('./assets/test.jpg'),
                icons: [
                    {
                        path: require('./assets/testIconRed.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconBlue.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconGreen.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconYellow.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconPurple.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconOrange.png'),
                        image: null
                    },
                    {
                        path: require('./assets/testIconTeal.png'),
                        image: null
                    }
                ],
                positions: []
            }
        },
        async created() {
            this.image = await this.loadImage(this.imagePath)
            await this.loadIcons();
            this.positions = this.loadPositions();
            this.loading = false
        },
        methods: {
            async loadIcons() {
                await this.icons.reduce(async (promise, icon) => {
                    // This line will wait for the last async function to finish.
                    // The first iteration uses an already resolved Promise
                    // so, it will immediately continue.
                    await promise;
                    icon.image = await this.loadImage(icon.path)
                }, Promise.resolve());
            },
            loadPositions() {
                let positions = []
                const baseObj = {
                    id: 0,
                    label: '',
                    icons: [],
                    coordinates: {
                        x: 1,
                        y: 1
                    }
                }
                for (let index = 0; index < 250; index++) {
                    positions.push(Object.assign(Object.assign({}, baseObj), {
                        id: index,
                        label: `Test-${index+1}`,
                        coordinates: {
                            x: Math.floor(Math.random() * (41 - 1 + 1)) + 1,
                            y: Math.floor(Math.random() * (41 - 1 + 1)) + 1
                        },
                        icons: [
                            this.icons[Math.floor(Math.random() * (this.icons.length - 1))]
                        ]
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