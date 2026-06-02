/**
 * Project: CityCard
 * File: vite.config.js
 * Description: Vite 配置
 *
 * Copyright (C) 2026 Futelec. All rights reserved for game assets.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * [SPECIAL NOTICE] The GPLv3 license applies ONLY to the source code of
 * this file. All game assets (artwork, UI designs, sound, music, and lore)
 * are EXCLUDED from GPLv3 and are strictly proprietary (All Rights Reserved).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',              // 允许外部访问
    allowedHosts: ['.cpolar.top'] // 允许 cpolar 域名
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.js',
        '**/*.spec.js',
        '**/*.test.js'
      ]
    }
  }
})