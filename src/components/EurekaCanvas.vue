<template>
    <div id="eurekaCanvasContainer">
        <canvas id="eurekaCanvas"></canvas>
        <div v-show="showCoordinates" id="eurekaCanvasMouseCoordinates">{{ mouseCoordinates.x }},
            {{ mouseCoordinates.y }}</div>
        <div id="_eurekaCanvas-ZoomButtonsContainer">
            <div class="iconContainer" @click="zoomTo(maximumZoom)" title="Maximize">
                <svg version="1.1" id="_eurekaCanvas-maximize" xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 105 105"
                    style="enable-background:new 0 0 105 105;" xml:space="preserve">
                    <rect id="XMLID_1_" x="2.5" y="2.5" style="fill:none;stroke-miterlimit:10;" width="100"
                        height="100" />
                </svg>
            </div>
            <div class="iconContainer" @click="scaleToFit" title="Scale to fit">
                <svg version="1.1" id="_eurekaCanvas-fittoscreen" xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 105 105"
                    style="enable-background:new 0 0 105 105;" xml:space="preserve">
                    <rect id="XMLID_1_" x="2.5" y="2.5" style="display:none;fill:none;stroke-miterlimit:10;" width="100"
                        height="100" />
                    <rect id="XMLID_15_" x="-20" y="70.5" style="fill:none;stroke-miterlimit:10;" width="52.5"
                        height="52.5" />
                    <rect id="XMLID_16_" x="72.5" y="70.5" style="fill:none;stroke-miterlimit:10;" width="52.5"
                        height="52.5" />
                    <rect id="XMLID_17_" x="70.5" y="-18" style="fill:none;stroke-miterlimit:10;" width="52.5"
                        height="52.5" />
                    <rect id="XMLID_18_" x="-18" y="-18" style="fill:none;stroke-miterlimit:10;" width="52.5"
                        height="52.5" />
                </svg>
            </div>
            <div id="_eurekaCanvas-zoomComboBox">
                <div id="_eurekaCanvas-zoomComboBoxInputContainer">
                    <input :value="comboBoxZoomLevel" @change="updateZoomFromCombobox"
                        @focus="openZoomComboBox" id="_eurekaCanvas-input" type="text" />
                </div>
                <div v-show="showZoomComboBoxDropdown" ref="zoomComboBoxDropdown" id="_eurekaCanvas-zoomComboBoxLevels" :style="zoomComboBoxDropdownTopPosition">
                    <div v-for="zoom in zoomLevelOptions" :key="zoom" @click="zoomTo(zoom); showZoomComboBoxDropdown = false" class="_eurekaCanvas-zoomComboBoxLevelsOption">{{zoom}}%</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import Vue from 'vue'

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
                dragging: false,
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
                showZoomComboBoxDropdown: false,
                zoomComboBoxDropdownTop: 0,
                calculateBoundingBoxes: true,
                zoomFactor: 1,
                lastZoomTime: 0,
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
                this.setUpListeners()
                this.scaleToFit()
            })();
        },
        watch: {
            positions: {
                handler() {
                    this.resetUpBoundingBoxQuadrants()
                    this.draw()
                }
            }
        },
        computed: {
            scaleMultiplier() {
                if (this.zoomLevel === 100) {
                    return 1
                }

                return (this.zoomLevel / 100)
            },
            scaledImageMousePosition() {
                return this.relativePointOnImage(this.canvasMousePosition)
            },
            fullImageMousePosition() {
                return this.scaledPointToFullPoint(this.scaledImageMousePosition)
            },
            mouseCoordinates() {
                return this.fullPointToCoordinates(this.fullImageMousePosition)
            },
            clampedZoomLevel() {
                return (((this.zoomLevel - this.minimumZoom) * (100 - 50)) / (this.maximumZoom - this.minimumZoom)) + 50
            },
            comboBoxZoomLevel() {
                return `${this.zoomLevel}%`
            },
            zoomLevelOptions() {
                let zoomLevels = []
                let nearestHundred = 100
                if (this.maximumZoom > 100) {
                    nearestHundred = Math.floor(this.maximumZoom / 100) * 100;
                    if (this.maximumZoom > nearestHundred) {
                        zoomLevels.push(this.maximumZoom)
                    }
                    while (nearestHundred > 100) {
                        zoomLevels.push(nearestHundred)
                        nearestHundred -= 100
                    }
                }
                zoomLevels.push(nearestHundred)
                const subHundredZoom = [66.67, 50, 33.33, 25, 12.5]
                while (nearestHundred > this.minimumZoom) {
                    if (nearestHundred > 100) {
                        nearestHundred -= 100
                    } else if (nearestHundred <= 100) {
                        nearestHundred = subHundredZoom.find(level => {
                            return nearestHundred > level
                        })
                    }
                    if (nearestHundred !== undefined) {
                        zoomLevels.push(nearestHundred)
                    }
                }
                if (this.minimumZoom < zoomLevels[zoomLevels.length - 1]) {
                    zoomLevels.push(this.minimumZoom)
                }

                return zoomLevels
            },
            zoomComboBoxDropdownTopPosition() {
                return {top: `-${this.zoomComboBoxDropdownTop}px`}
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
                                    width: icon.image.naturalWidth * (this.clampedZoomLevel / 100),
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
                                x: drawPosition.x - (position.icons[0].image.naturalWidth * (this.clampedZoomLevel / 100) / 2),
                                y: drawPosition.y - (position.icons[0].image.naturalHeight * (this.clampedZoomLevel / 100) / 2),
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
                this.zoomLevel = ((this.scaledImageWidth / this.canvasImageWidth) * 100).toFixed(2)
                this.canvasImagePos.x = (this.canvasElement.width / 2) - (this.scaledImageWidth / 2)
                this.canvasImagePos.y = (this.canvasElement.height / 2) - (this.scaledImageHeight / 2)


                this.resetUpBoundingBoxQuadrants()
                this.draw()
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
                this.canvasElement.addEventListener('mousedown', this.mouseDownEvent, false)
                this.canvasElement.addEventListener('mouseup', this.mouseUpEvent, false)
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
                this.showZoomComboBoxDropdown = false
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
            mouseDownEvent(evt) {
                this.dragging = true
                document.documentElement.style.cursor = 'move'
                this.lastDragPosition = { x: evt.offsetX, y: evt.offsetY }
            },
            mouseUpEvent() {
                document.documentElement.style.cursor = 'auto'
                this.dragging = false
            },
            mouseMoveEvent(evt) {
                this.canvasMousePosition = { x: evt.offsetX, y: evt.offsetY }
                this.toggleCoordinates(this.pointIsOnImage(this.canvasMousePosition))
                if (this.dragging) {
                    this.dragEvent(evt)
                }
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
                return { x: scaledPoint.x / this.scaleMultiplier, y: scaledPoint.y / this.scaleMultiplier }
            },
            fullPointToScaledPoint(fullPoint) {
                return { x: fullPoint.x * this.scaleMultiplier, y: fullPoint.y * this.scaleMultiplier }
            },
            fullPointToCoordinates(fullPoint) {
                return { x: (Math.round((fullPoint.x / this.gridSizeInPixels) * 10) / 10) + this.coordinatesOffset, y: (Math.round((fullPoint.y / this.gridSizeInPixels) * 10) / 10) + this.coordinatesOffset }
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
                const now = Date.now()
                if (now - this.lastZoomTime < 100) {
                    if (this.zoomFactor < 5) {
                        this.zoomFactor += 1
                    }
                } else {
                    this.zoomFactor = 1
                }
                this.lastZoomTime = now
                const changeAmount = 1 * this.zoomFactor
                if (delta > 0) {
                    // mousewheel down, zoom out
                    if (this.minimumZoom > (this.zoomLevel | 0) - changeAmount) {
                        // clamp
                        this.zoomLevel = this.minimumZoom
                    } else {
                        this.zoomLevel = (this.zoomLevel | 0) - changeAmount
                    }
                } else {
                    // mousewheel up, zoom in
                    if (this.maximumZoom < (this.zoomLevel | 0) + changeAmount) {
                        this.zoomLevel = this.maximumZoom
                    } else {
                        this.zoomLevel = (this.zoomLevel | 0) + changeAmount
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
            },
            zoomTo(level) {
                this.zoomLevel = level
                let newScaledImageWidth = this.canvasImageWidth * (this.zoomLevel / 100)
                let newScaledImageHeight = this.canvasImageHeight * (this.zoomLevel / 100)
                this.scaledImageWidth = newScaledImageWidth
                this.scaledImageHeight = newScaledImageHeight
                this.canvasImagePos.x = (this.canvasElement.width / 2) - (this.scaledImageWidth / 2)
                this.canvasImagePos.y = (this.canvasElement.height / 2) - (this.scaledImageHeight / 2)
                this.resetUpBoundingBoxQuadrants()
                this.draw()
            },
            updateZoomFromCombobox(evt) {
                this.zoomTo(evt.target.value.replace(/%/g, ''))
            },
            openZoomComboBox() {
                this.showZoomComboBoxDropdown = true
                Vue.nextTick(() => {
                    this.zoomComboBoxDropdownTop = this.$refs.zoomComboBoxDropdown.clientHeight
                })
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

    #_eurekaCanvas-ZoomButtonsContainer {
        position: absolute;
        bottom: 1%;
        right: 1%;
        display: flex;
        box-sizing: border-box;
    }

    #_eurekaCanvas-ZoomButtonsContainer * {
        box-sizing: border-box;
    }

    #_eurekaCanvas-ZoomButtonsContainer .iconContainer {
        background-color: #333;
        border: 1px solid #333;
        color: #eee;
        padding: 5px;
        margin-left: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 32px;
        height: 32px;
        cursor: pointer;
    }

    #_eurekaCanvas-ZoomButtonsContainer .iconContainer svg {
        stroke: #eee;
        stroke-width: 10;
    }

    #_eurekaCanvas-maximize {
        width: 16px;
        height: 16px;
    }

    #_eurekaCanvas-fittoscreen {
        width: 16px;
        height: 16px;
    }

    #_eurekaCanvas-zoomComboBox {
        height: 32px;
        margin-left: 5px;
        display: flex;
        justify-content: center;
        align-items: stretch;
        position: relative;
    }

    #_eurekaCanvas-zoomComboBoxInputContainer {
        height: 100%;
        display: flex;
    }

    #_eurekaCanvas-zoomComboBoxLevels {
        background-color: #474747;
        border-top: 1px solid #767676;
        border-right: 1px solid #767676;
        border-left: 1px solid #767676;
        color: #cccccc;
        position: absolute;
        left: 0;
        width: calc(100% - 2px);
    }

    ._eurekaCanvas-zoomComboBoxLevelsOption {
        padding-top: .25rem;
        padding-bottom: .25rem;
        border-bottom: 1px solid #ccc;
        cursor: pointer;
    }

    ._eurekaCanvas-zoomComboBoxLevelsOption:hover {
        background-color: #767676;
    }

    #_eurekaCanvas-input {
        background-color: #474747;
        border: 1px solid #474747;
        color: #cccccc;
        width: 80px;
        padding-left: .5rem;
        padding-right: .5rem;
        padding-top: .25rem;
        padding-bottom: .25rem;
        direction: rtl;
    }
</style>