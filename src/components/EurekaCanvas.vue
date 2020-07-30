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
            canvasImage: {
                type: [HTMLImageElement, Image],
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
            },
            minimumZoom: {
                type: Number,
                default: 10
            },
            maximumZoom: {
                type: Number,
                default: 100
            },
            positionsIdKey: {
                type: String,
                default: '_index'
            }
        },
        data() {
            return {
                canvasElement: null,
                canvasElementWidth: 0,
                canvasElementHeight: 0,
                canvasContext: null,
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
                showCoordinates: false,
                lastDragTime: 0,
                canvasMousePosition: {
                    x: 0,
                    y: 0
                },
                calculateBoundingBoxes: true,
                positionBoundingBoxes: {
                    'northwest': {
                        box: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0
                        },
                        children: []
                    },
                    'northeast': {
                        box: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0
                        },
                        children: []
                    },
                    'southeast': {
                        box: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0
                        },
                        children: []
                    },
                    'southwest': {
                        box: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0
                        },
                        children: []
                    }
                }
            }
        },
        mounted() {
            (async () => {
                this.canvasImageWidth = this.canvasImage.naturalWidth
                this.canvasImageHeight = this.canvasImage.naturalHeight
                this.scaledImageWidth = this.canvasImageWidth
                this.scaledImageHeight = this.canvasImageHeight
                this.canvasElement = document.getElementById('eurekaCanvas')
                this.resizeCanvas()
                this.canvasContext = this.canvasElement.getContext('2d')
                this.scaleToFit()
                this.canvasImagePos.x = (this.canvasElement.width / 2) - (this.scaledImageWidth / 2)
                this.canvasImagePos.y = (this.canvasElement.height / 2) - (this.scaledImageHeight / 2)

                // this.trackTransforms()
                this.setUpListeners()
                this.resetUpBoundingBoxQuadrants()
                this.draw()
            })();
        },
        watch: {
            positions: {
                handler() {
                    this.draw()
                }
            }
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
            },
            clampedZoomLevel () {
                return (((this.zoomLevel - this.minimumZoom) * (100 - 50)) / (this.maximumZoom - this.minimumZoom)) + 50
            }
        },
        methods: {
            draw() {
                this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)

                this.canvasContext.drawImage(this.canvasImage, this.canvasImagePos.x, this.canvasImagePos.y, this.scaledImageWidth, this.scaledImageHeight)

                this.drawPositions()
            },
            drawPositions() {
                this.positions.forEach((position, index) => {
                    if (this.isCoordinateInView(position.coordinates)) {
                        const drawPosition = this.fullPointToScaledPoint(this.coordinatesToFullPoint(position.coordinates))
                        const offsetDrawPosition = {
                            x: drawPosition.x + this.canvasImagePos.x,
                            y: drawPosition.y + this.canvasImagePos.y,
                        }
                        let lastIconWidth = 0
                        let totalIconWidth = 0
                        let iconHeight = 0
                        position.icons.forEach(icon => {
                            if (icon.image !== null) {
                                const scaledImageDimensions = {
                                    width:  icon.image.naturalWidth * (this.clampedZoomLevel / 100),
                                    height: icon.image.naturalHeight * (this.clampedZoomLevel / 100)
                                }
                                const iconPosition = {
                                    x: (offsetDrawPosition.x - (scaledImageDimensions.width / 2)) + totalIconWidth,
                                    y: offsetDrawPosition.y - (scaledImageDimensions.height / 2)
                                }
                                lastIconWidth = scaledImageDimensions.width
                                totalIconWidth += lastIconWidth
                                this.canvasContext.drawImage(icon.image, iconPosition.x, iconPosition.y, scaledImageDimensions.width, scaledImageDimensions.height)
                                if (scaledImageDimensions.height > iconHeight) {
                                    iconHeight = scaledImageDimensions.height
                                }
                            }
                        })

                        const textPosition = {
                            x: offsetDrawPosition.x + totalIconWidth - (lastIconWidth / 2),
                            y: offsetDrawPosition.y
                        }

                        this.canvasContext.textBaseline = 'middle'
                        this.canvasContext.font = `${18 * (this.clampedZoomLevel / 100)}pt sans-serif`
                        this.canvasContext.strokeStyle = 'rgba(0, 0, 0, 1)'
                        this.canvasContext.lineWidth = 4
                        this.canvasContext.strokeText(position.label, textPosition.x, textPosition.y)
                        this.canvasContext.fillStyle = 'rgba(255, 255, 255, 1)'
                        this.canvasContext.fillText(position.label, textPosition.x, textPosition.y)

                        if (this.calculateBoundingBoxes) {
                            const boundingBox = {
                                id: this.positionsIdKey === '_index' ? index : position[this.positionsIdKey],
                                idKey: this.positionsIdKey,
                                x: drawPosition.x - (position.icons[0].image.naturalWidth * (this.clampedZoomLevel / 100)/ 2),
                                y: drawPosition.y - (position.icons[0].image.naturalHeight * (this.clampedZoomLevel / 100)/ 2),
                                width: totalIconWidth + this.canvasContext.measureText(position.label).width,
                                height: iconHeight,
                            }
                            const quadrants = this.getQuadrantsForBoundingBox(boundingBox)
                            quadrants.forEach(quadrant => {
                                this.positionBoundingBoxes[quadrant].children.push(boundingBox)
                            })
                        }
                    }
                })
                this.calculateBoundingBoxes = false
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
            resetUpBoundingBoxQuadrants() {
                for (const [key, quadrant] of Object.entries(this.positionBoundingBoxes)) {
                    quadrant.children.length = 0
                    quadrant.box.width = this.scaledImageWidth / 2
                    quadrant.box.height = this.scaledImageHeight / 2
                    switch (key) {
                        case 'northwest':
                            quadrant.box.x = 0
                            quadrant.box.y = 0
                            break;
                        case 'northeast':
                            quadrant.box.x = quadrant.box.width
                            quadrant.box.y = 0
                            break;
                        case 'southeast':
                            quadrant.box.x = quadrant.box.width
                            quadrant.box.y = quadrant.box.height
                            break;
                        case 'southwest':
                            quadrant.box.x = 0
                            quadrant.box.y = quadrant.box.height
                            break;
                    }                    
                }
                this.calculateBoundingBoxes = true
            },
            setUpListeners() {
                window.addEventListener('resize', () => {
                    this.resizeCanvas()
                    this.draw()
                }, false);
                this.canvasElement.addEventListener('click', this.clickEvent, false)
                this.canvasElement.addEventListener('wheel', this.wheelEvent, false)
                this.canvasElement.addEventListener('drag', this.dragEvent, false)
                this.canvasElement.addEventListener('dragstart', this.dragStartEvent, false)
                this.canvasElement.addEventListener('dragend', this.dragEndEvent, false)
                this.canvasElement.addEventListener('mousemove', this.mouseMoveEvent, false)
                this.canvasElement.addEventListener('mouseleave', this.mouseLeaveEvent, false)
                document.addEventListener('dragover', (e) => e.preventDefault(), true)
            },
            resizeCanvas() {
                this.canvasElementWidth = this.canvasElement.getBoundingClientRect().width
                this.canvasElementHeight = this.canvasElement.getBoundingClientRect().height
                this.canvasElement.width = this.canvasElement.offsetWidth
                this.canvasElement.height = this.canvasElement.offsetHeight
            },
            clickEvent(evt) {
                const point = { x: evt.offsetX, y: evt.offsetY }
                this.$emit('click', {
                    coordinates: this.fullPointToCoordinates(this.scaledPointToFullPoint(this.relativePointOnImage(point)))
                })
                this.checkIntersections(point)
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
                const now = Date.now();
                const lastDragDelta = now - this.lastDragTime;
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

                if (lastDragDelta >= 16 && (moved.x != 0 || moved.y != 0)) {
                    this.lastDragTime = now
                    this.draw()
                }
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
            checkIntersections(point) {
                if (this.pointIsOnImage(point)) {
                    const relPoint = this.relativePointOnImage(point)

                    this.getRelativePointQuadrant(relPoint)

                    const hit = this.positionBoundingBoxes[this.getRelativePointQuadrant(relPoint)].children.slice().reverse().find(box => {
                        return relPoint.x >= box.x && relPoint.x <= (box.x + box.width) && relPoint.y >= box.y && relPoint.y <= (box.y + box.height)
                    })

                    if (hit !== undefined) {
                        if (hit.idKey == '_index') {
                            this.$emit('clickedElement', this.positions[hit.id])
                        } else {
                            this.$emit('clickedElement', this.positions.find(position => {
                                return position[hit.idKey] === hit.id
                            }))
                        }
                    }
                }
            },
            getRelativePointQuadrant(point) {
                return Object.keys(this.positionBoundingBoxes).find((key) => {
                    const box = this.positionBoundingBoxes[key].box
                    return point.x >= box.x && point.x <= (box.x + box.width) && point.y >= box.y && point.y <= (box.y + box.height)
                })
            },
            getQuadrantsForBoundingBox(box) {
                return Object.keys(this.positionBoundingBoxes).filter((key) => {
                    const quadBox = this.positionBoundingBoxes[key].box
                    return box.x < (quadBox.x + quadBox.width) && (box.x + box.width) > quadBox.x && box.y < (quadBox.y + quadBox.height) && (box.y + box.height) > quadBox.y
                })
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
                    if (this.minimumZoom > (this.zoomLevel | 0) - 1) {
                        // clamp
                        this.zoomLevel = this.minimumZoom
                    } else {
                        this.zoomLevel = (this.zoomLevel | 0) - 1
                    }
                } else {
                    // mousewheel up, zoom in
                    if (this.maximumZoom < (this.zoomLevel | 0) + 1) {
                        this.zoomLevel = this.maximumZoom
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
                    this.resetUpBoundingBoxQuadrants()
                    this.draw()
                }
            }
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