<template>
    <div class="eureka-canvas-zoom-buttons">
        <div class="iconContainer" @click="zoomTo(maximumZoom)" title="Maximize">
            <svg version="1.1" class="eureka-canvas-maximize" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 105 105"
                style="enable-background:new 0 0 105 105;" xml:space="preserve">
                <rect x="2.5" y="2.5" style="fill:none;stroke-miterlimit:10;" width="100"
                    height="100" />
            </svg>
        </div>
        <div class="iconContainer" @click="scaleToFit" title="Scale to fit">
            <svg version="1.1" class="eureka-canvas-fit-to-screen" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 105 105"
                style="enable-background:new 0 0 105 105;" xml:space="preserve">
                <rect x="2.5" y="2.5" style="display:none;fill:none;stroke-miterlimit:10;" width="100"
                    height="100" />
                <rect x="-20" y="70.5" style="fill:none;stroke-miterlimit:10;" width="52.5"
                    height="52.5" />
                <rect x="72.5" y="70.5" style="fill:none;stroke-miterlimit:10;" width="52.5"
                    height="52.5" />
                <rect x="70.5" y="-18" style="fill:none;stroke-miterlimit:10;" width="52.5"
                    height="52.5" />
                <rect x="-18" y="-18" style="fill:none;stroke-miterlimit:10;" width="52.5"
                    height="52.5" />
            </svg>
        </div>
        <div class="eureka-canvas-zoom-combobox">
            <div class="eureka-canvas-zoom-combobox-input-container">
                <input :value="comboBoxZoomLevel" @change="updateZoomFromCombobox"
                    @focus="openZoomComboBox" class="eureka-canvas-zoom-input" type="text" />
            </div>
            <div v-show="showZoomComboBoxDropdown" ref="zoomComboBoxDropdown" class="eureka-canvas-zoom-combobox-levels" :style="zoomComboBoxDropdownTopPosition">
                <div v-for="zoom in zoomLevelOptions" :key="zoom" @click="zoomTo(zoom)" class="eureka-canvas-zoom-combobox-option">{{zoom}}%</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

const props = defineProps<{
    minimumZoom: number
    maximumZoom: number
    zoomLevel: number
}>()

const emit = defineEmits<{
    (e: 'scaleToFit'): void
    (e: 'zoomTo', zoom: number): void
}>()

const showZoomComboBoxDropdown = ref(false)
const zoomComboBoxDropdownTop = ref(0)
const zoomComboBoxDropdown = ref<HTMLElement | null>(null)

const comboBoxZoomLevel = computed(() => `${props.zoomLevel}%`)

const zoomLevelOptions = computed(() => {
    const zoomLevels: number[] = []
    let nearestHundred = 100
    if (props.maximumZoom > 100) {
        nearestHundred = Math.floor(props.maximumZoom / 100) * 100
        if (props.maximumZoom > nearestHundred) {
            zoomLevels.push(props.maximumZoom)
        }
        while (nearestHundred > 100) {
            zoomLevels.push(nearestHundred)
            nearestHundred -= 100
        }
    }
    zoomLevels.push(nearestHundred)
    const subHundredZoom = [66.67, 50, 33.33, 25, 12.5]
    let last = nearestHundred
    for (const level of subHundredZoom) {
        if (last > level && level >= props.minimumZoom) {
            zoomLevels.push(level)
            last = level
        }
    }
    if (props.minimumZoom < zoomLevels[zoomLevels.length - 1]) {
        zoomLevels.push(props.minimumZoom)
    }
    return zoomLevels
})

const zoomComboBoxDropdownTopPosition = computed(() => ({
    top: `-${zoomComboBoxDropdownTop.value}px`
}))

function scaleToFit() {
    emit('scaleToFit')
}

function updateZoomFromCombobox(evt: Event) {
    const target = evt.target as HTMLInputElement
    const value = parseFloat(target.value.replace(/%/g, ''))
    if (!isNaN(value)) {
        zoomTo(value)
    }
}

function zoomTo(zoom: number) {
    emit('zoomTo', zoom)
    showZoomComboBoxDropdown.value = false
}

function openZoomComboBox() {
    showZoomComboBoxDropdown.value = true
    nextTick(() => {
        if (zoomComboBoxDropdown.value) {
            zoomComboBoxDropdownTop.value = zoomComboBoxDropdown.value.clientHeight
        }
    })
}
</script>

<style scoped>
    .eureka-canvas-zoom-buttons {
        position: absolute;
        bottom: 1%;
        right: 1%;
        display: flex;
        box-sizing: border-box;
    }

    .eureka-canvas-zoom-buttons * {
        box-sizing: border-box;
    }

    .eureka-canvas-zoom-buttons .iconContainer {
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

    .eureka-canvas-zoom-buttons .iconContainer svg {
        stroke: #eee;
        stroke-width: 10;
    }

    .eureka-canvas-maximize {
        width: 16px;
        height: 16px;
    }

    .eureka-canvas-fit-to-screen {
        width: 16px;
        height: 16px;
    }

    .eureka-canvas-zoom-combobox {
        height: 32px;
        margin-left: 5px;
        display: flex;
        justify-content: center;
        align-items: stretch;
        position: relative;
    }

    .eureka-canvas-zoom-combobox-input-container {
        height: 100%;
        display: flex;
    }

    .eureka-canvas-zoom-combobox-levels {
        background-color: #474747;
        border-top: 1px solid #767676;
        border-right: 1px solid #767676;
        border-left: 1px solid #767676;
        color: #cccccc;
        position: absolute;
        left: 0;
        width: calc(100% - 2px);
    }

    .eureka-canvas-zoom-combobox-option {
        padding-top: .25rem;
        padding-bottom: .25rem;
        border-bottom: 1px solid #ccc;
        cursor: pointer;
    }

    .eureka-canvas-zoom-combobox-option:hover {
        background-color: #767676;
    }

    .eureka-canvas-zoom-input {
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