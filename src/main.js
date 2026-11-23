import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { autoInitFirebase } from './composables/useFirebase'
import { enableAuthProxy, loadAuthProxyUrl } from './composables/useAuthProxy'

// 导入全局样式
import './assets/styles/variables.css'
import './assets/styles/base.css'
import './assets/styles/components.css'

// 在 Firebase 初始化前启用代理，确保中国大陆用户可以访问
const proxyUrl = loadAuthProxyUrl()
if (proxyUrl) {
  enableAuthProxy(proxyUrl)
}

// 先初始化 Firebase，再挂载 Vue 应用
// 避免组件 onMounted 中重复调用导致 deleteApp 破坏 auth listener
autoInitFirebase()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

