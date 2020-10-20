<template>
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
                <div v-for="zoom in zoomLevelOptions" :key="zoom" @click="zoomTo(zoom)" class="_eurekaCanvas-zoomComboBoxLevelsOption">{{zoom}}%</div>
            </div>
        </div>
    </div>
</template>

<script>
    import Vue from 'vue'

    export default {
        name: 'ZoomContainer',
        props: {
            minimumZoom: {
                type: Number,
                required: true
            },
            maximumZoom: {
                type: Number,
                required: true
            },
            zoomLevel: {
                type: Number,
                required: true
            }
        },
        data() {
            return {
                showZoomComboBoxDropdown: false,
                zoomComboBoxDropdownTop: 0
            }
        },
        computed: {
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
            scaleToFit() {
                this.$emit('scaleToFit')
            },
            updateZoomFromCombobox(evt) {
                this.zoomTo(evt.target.value.replace(/%/g, ''))
            },
            zoomTo(zoom) {
                this.$emit('zoomTo', zoom)
                this.showZoomComboBoxDropdown = false
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