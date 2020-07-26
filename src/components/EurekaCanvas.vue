<template>
    <div id="eurekaCanvasContainer">
        <canvas draggable="true" id="eurekaCanvas"></canvas>
        <div v-show="showCoordinates" id="eurekaCanvasMouseCoordinates">{{ mouseCoordinates.x }}, {{ mouseCoordinates.y }}</div>
    </div>
</template>

<script>
    export default {
        name: 'EurekaCanvas',
        props: {
            canvasImageSource: {
                type: String,
                required: true
            },
            gridSizeInPixels: {
                type: Number,
                default: 100
            },
            coordinatesOffset: {
                type: Number,
                default: 0
            },
            positions: {
                type: Array,
                required: true
            }
        },
        data() {
            return {
                canvasElement: null,
                canvasElementWidth: 0,
                canvasElementHeight: 0,
                canvasContext: null,
                canvasImage: null,
                canvasImageWidth: 0,
                canvasImageHeight: 0,
                canvasImagePos: { x: 0, y: 0 },
                dragStart: null,
                dragged: false,
                scaleFactor: 1.1,
                zoomLevel: 100,
                lastDragPosition: { x: 0, y: 0 },
                scaledImageWidth: 0,
                scaledImageHeight: 0,
                zoomClamp: {
                    min: 10,
                    max: 100
                },
                showCoordinates: false,
                canvasMousePosition: {
                    x: 0,
                    y: 0
                }
            }
        },
        mounted() {
            (async () => {
                this.canvasImage = await this.loadImage(this.canvasImageSource)
                this.canvasImageWidth = this.canvasImage.naturalWidth
                this.canvasImageHeight = this.canvasImage.naturalHeight
                this.scaledImageWidth = this.canvasImageWidth
                this.scaledImageHeight = this.canvasImageHeight
                this.canvasElement = document.getElementById('eurekaCanvas')
                this.canvasElementWidth = this.canvasElement.getBoundingClientRect().width
                this.canvasElementHeight = this.canvasElement.getBoundingClientRect().height
                this.canvasElement.width = this.canvasElement.offsetWidth
                this.canvasElement.height = this.canvasElement.offsetHeight
                this.canvasContext = this.canvasElement.getContext('2d')
                this.scaleToFit()
                this.canvasImagePos.x = (this.canvasElement.width / 2) - (this.scaledImageWidth / 2)
                this.canvasImagePos.y = (this.canvasElement.height / 2) - (this.scaledImageHeight / 2)

                // this.trackTransforms()
                this.setUpListeners()
                this.draw()
            })();
        },
        computed: {
            scaleMultiplier () {
                if (this.zoomLevel === 100) {
                    return 1
                }

                return (this.zoomLevel / 100)
            },
            scaledImageMousePosition () {
                return this.relativePointOnImage(this.canvasMousePosition)
            },
            fullImageMousePosition () {
                return this.scaledPointToFullPoint(this.scaledImageMousePosition)
            },
            mouseCoordinates () {
                return this.fullPointToCoordinates(this.fullImageMousePosition)
            }
        },
        methods: {
            draw() {
                this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)

                this.canvasContext.save()
                this.canvasContext.setTransform(1, 0, 0, 1, 0, 0)
                this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
                this.canvasContext.restore()

                this.canvasContext.drawImage(this.canvasImage, this.canvasImagePos.x, this.canvasImagePos.y, this.scaledImageWidth, this.scaledImageHeight)

                this.drawPositions()
            },
            drawPositions() {
                this.positions.forEach((position) => {
                    if (this.isCoordinateInView(position.coordinates)) {
                        let drawPosition = this.fullPointToScaledPoint(this.coordinatesToFullPoint(position.coordinates))
                        let lastIconWidth = 0
                        let totalIconWidth = 0
                        position.icons.forEach(icon => {
                            if (icon.image !== null) {
                                const iconPosition = {
                                    x: ((drawPosition.x + this.canvasImagePos.x) - (icon.image.naturalWidth / 2)) + totalIconWidth,
                                    y: (drawPosition.y + this.canvasImagePos.y) - (icon.image.naturalHeight / 2)
                                }
                                lastIconWidth = icon.image.naturalWidth
                                totalIconWidth += lastIconWidth
                                this.canvasContext.drawImage(icon.image, iconPosition.x, iconPosition.y)
                            }
                        })

                        const textPosition = {
                            x: (drawPosition.x + this.canvasImagePos.x) + totalIconWidth - (lastIconWidth / 2),
                            y: (drawPosition.y + this.canvasImagePos.y)
                        }

                        this.canvasContext.textBaseline = 'middle'
                        this.canvasContext.font = '24pt sans-serif'
                        this.canvasContext.strokeStyle = 'black'
                        this.canvasContext.lineWidth = 4
                        this.canvasContext.strokeText(position.label, textPosition.x, textPosition.y)
                        this.canvasContext.fillStyle = 'white'
                        this.canvasContext.fillText(position.label, textPosition.x, textPosition.y)
                    }
                })
            },
            scaleToFit() {
                let canvasRatio = this.canvasElementWidth / this.canvasElementHeight
                let imageRatio = this.canvasImageWidth / this.canvasImageHeight

                // rs > ri ? (wi * hs/hi, hs) : (ws, hi * ws/wi)
                if (canvasRatio > imageRatio) {
                    this.scaledImageWidth = this.canvasImageWidth * (this.canvasElementHeight / this.canvasImageHeight)
                    this.scaledImageHeight = this.canvasElementHeight
                } else {
                    this.scaledImageWidth = this.canvasElementWidth
                    this.scaledImageHeight = this.canvasImageHeight * (this.canvasElemenWidth / this.canvasImageWidth)
                }
                this.zoomLevel = (this.scaledImageWidth / this.canvasImageWidth) * 100
            },
            setUpListeners() {
                this.canvasElement.addEventListener('click', this.clickEvent, false)
                this.canvasElement.addEventListener('wheel', this.wheelEvent, false)
                this.canvasElement.addEventListener('drag', this.dragEvent, false)
                this.canvasElement.addEventListener('dragstart', this.dragStartEvent, false)
                this.canvasElement.addEventListener('dragend', this.dragEndEvent, false)
                this.canvasElement.addEventListener('mousemove', this.mouseMoveEvent, false)
                this.canvasElement.addEventListener('mouseleave', this.mouseLeaveEvent, false)
                document.addEventListener('dragover', (e) => e.preventDefault(), true)
            },
            clickEvent(evt) {
                const point = this.fullPointToCoordinates(this.scaledPointToFullPoint(this.relativePointOnImage({ x: evt.offsetX, y: evt.offsetY })))
                console.log(point)
                this.$emit('click', {
                    coordinates: point
                })
            },
            wheelEvent(evt) {
                const point = { x: evt.offsetX, y: evt.offsetY }
                if (this.pointIsOnImage(point)) {
                    this.zoomImage(evt.deltaY, point)
                }
            },
            dragEvent(evt) {
                const moved = { x: evt.offsetX - this.lastDragPosition.x, y: evt.offsetY - this.lastDragPosition.y }
                this.lastDragPosition = { x: evt.offsetX, y: evt.offsetY }

                this.canvasImagePos.x += moved.x
                this.canvasImagePos.y += moved.y

                if (this.scaledImageWidth > this.canvasElementWidth) {
                    // left
                    if (this.canvasImagePos.x > 0 && this.canvasImagePos.x < this.canvasElementWidth * .05) {
                        this.canvasImagePos.x = 0
                    }

                    // right
                    if ((this.canvasImagePos.x + this.scaledImageWidth) < this.canvasElementWidth) {
                        this.canvasImagePos.x = this.canvasElementWidth - this.scaledImageWidth
                    }
                } else {
                    // left
                    if (this.canvasImagePos.x < 0 && this.canvasImagePos.x < this.canvasElementWidth - (this.canvasElementWidth * .05)) {
                        this.canvasImagePos.x = 0
                    }

                    // right
                    if ((this.canvasImagePos.x + this.scaledImageWidth) > this.canvasElementWidth) {
                        this.canvasImagePos.x = this.canvasElementWidth - this.scaledImageWidth
                    }
                }

                if (this.scaledImageHeight > this.canvasElementHeight) {
                    // top
                    if (this.canvasImagePos.y > 0 && this.canvasImagePos.y < this.canvasElementHeight * .05) {
                        this.canvasImagePos.y = 0
                    }

                    // bottom
                    if ((this.canvasImagePos.y + this.scaledImageHeight) < this.canvasElementHeight) {
                        this.canvasImagePos.y = this.canvasElementHeight - this.scaledImageHeight
                    }
                } else {
                    // top
                    if (this.canvasImagePos.y < 0 && this.canvasImagePos.y < this.canvasElementHeight - (this.canvasElementHeight * .05)) {
                        this.canvasImagePos.y = 0
                    }

                    // bottom
                    if ((this.canvasImagePos.y + this.scaledImageHeight) > this.canvasElementHeight) {
                        this.canvasImagePos.y = this.canvasElementHeight - this.scaledImageHeight
                    }
                }
                this.draw()
            },
            dragStartEvent(evt) {
                var img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                evt.dataTransfer.setDragImage(img, 0, 0);
                event.dataTransfer.dropEffect = "move";
                event.dataTransfer.effectAllowed = "move";
                document.documentElement.style.cursor = 'move'
                this.lastDragPosition = { x: evt.offsetX, y: evt.offsetY }
            },
            dragEndEvent() {
                document.documentElement.style.cursor = 'auto'
            },
            mouseMoveEvent(evt) {
                this.canvasMousePosition = { x: evt.offsetX, y: evt.offsetY }
                this.toggleCoordinates(this.pointIsOnImage(this.canvasMousePosition))
            },
            mouseLeaveEvent() {
                this.toggleCoordinates(false)
            },
            toggleCoordinates(show) {
                if (this.showCoordinates != show) {
                    this.showCoordinates = show
                }
            },
            pointIsOnImage(point) {
                let rect = {
                    top: this.canvasImagePos.y,
                    right: (this.canvasImagePos.x + this.scaledImageWidth),
                    bottom: (this.canvasImagePos.y + this.scaledImageHeight),
                    left: this.canvasImagePos.x
                }
                return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
            },
            relativePointOnImage(point) {
                return { x: point.x - this.canvasImagePos.x, y: point.y - this.canvasImagePos.y }
            },
            scaledPointToFullPoint(scaledPoint) {
                return {x: scaledPoint.x / this.scaleMultiplier, y: scaledPoint.y / this.scaleMultiplier}
            },
            fullPointToScaledPoint(fullPoint) {
                return {x: fullPoint.x * this.scaleMultiplier, y: fullPoint.y * this.scaleMultiplier}
            },
            fullPointToCoordinates(fullPoint) {
                return {x: (Math.round((fullPoint.x / this.gridSizeInPixels) * 10) / 10) + this.coordinatesOffset, y: (Math.round((fullPoint.y / this.gridSizeInPixels) * 10) / 10) + this.coordinatesOffset}
            },
            coordinatesToFullPoint(coordinates) {
                return {
                    x: (coordinates.x - this.coordinatesOffset) * this.gridSizeInPixels,
                    y: (coordinates.y - this.coordinatesOffset) * this.gridSizeInPixels
                }
            },
            isCoordinateInView(coordinates) {
                const position = this.fullPointToScaledPoint(this.coordinatesToFullPoint(coordinates))
                const shiftedPosition = {
                    x: position.x + this.canvasImagePos.x,
                    y: position.y + this.canvasImagePos.y
                }
                if (shiftedPosition.y < 0 || shiftedPosition.y > this.canvasElementHeight || shiftedPosition.x < 0 || shiftedPosition.x > this.canvasElementWidth) {
                    return false
                }

                return true
            },
            zoomImage(delta, point) {
                const oldZoom = this.zoomLevel
                if (delta > 0) {
                    // mousewheel down, zoom out
                    if (this.zoomClamp.min > (this.zoomLevel | 0) - 1) {
                        // clamp
                        this.zoomLevel = this.zoomClamp.min
                    } else {
                        this.zoomLevel = (this.zoomLevel | 0) - 1
                    }
                } else {
                    // mousewheel up, zoom in
                    if (this.zoomClamp.max < (this.zoomLevel | 0) + 1) {
                        this.zoomLevel = this.zoomClamp.max
                    } else {
                        this.zoomLevel = (this.zoomLevel | 0) + 1
                    }
                }
                if (oldZoom !== this.zoomLevel) {
                    const zoomChange = ((this.zoomLevel - oldZoom) / Math.abs(oldZoom))
                    let oldRelativePoint = this.relativePointOnImage(point)
                    let newRelativePoint = { x: oldRelativePoint.x + (oldRelativePoint.x * (Math.sign(delta) * zoomChange)), y: oldRelativePoint.y + (oldRelativePoint.y * (Math.sign(delta) * zoomChange)) }
                    let newScaledImageWidth = this.canvasImageWidth * (this.zoomLevel / 100)
                    let newScaledImageHeight = this.canvasImageHeight * (this.zoomLevel / 100)
                    let distance = { x: newRelativePoint.x - oldRelativePoint.x, y: newRelativePoint.y - oldRelativePoint.y }
                    this.canvasImagePos.x -= Math.sign(delta) * distance.x
                    this.canvasImagePos.y -= Math.sign(delta) * distance.y

                    this.scaledImageWidth = newScaledImageWidth
                    this.scaledImageHeight = newScaledImageHeight

                    this.draw()
                }
            },
            loadImage: url => new Promise(resolve => {
                let img = new Image()
                img.onload = () => resolve(img)
                img.src = url
            })
        }
    }
</script>


<style scoped>
    #eurekaCanvasContainer,
    #eurekaCanvas {
        width: 100%;
        height: 100%;
    }

    #eurekaCanvasMouseCoordinates {
        position: absolute;
        top: 1%;
        right: 1%;
        background-color: rgba(50, 50, 50, 1);
        border: 1px solid rgba(25, 25, 25, 0.8);
        color: #eee;
        padding: 5px;
    }
</style>