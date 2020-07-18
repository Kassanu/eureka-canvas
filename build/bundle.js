import Vue from "vue"
import EurekaCanvas from "../src/components/EurekaCanvas.vue"

const components = {
    EurekaCanvas
}

Object.keys(components).forEach(name => {
    Vue.component(name, components[name])
})

export default components