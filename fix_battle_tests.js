/**
 * Project: CityCard
 * File: fix_battle_tests.js
 * Description: 修复 battleSkills.js 中的城市访问方式, 从数组索引改为对象键访问
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

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testFile = path.join(__dirname, 'src/tests/unit/battleSkills.test.js')
let content = fs.readFileSync(testFile, 'utf8')

// 修复模式：
// 1. caster.cities[0] -> caster.cities['北京'] (中心城市)
// 2. caster.cities[1] -> caster.cities['上海'] (第二个城市)
// 3. target.cities[0] -> target.cities['北京']
// 4. caster.cities.forEach -> Object.values(caster.cities).forEach
// 5. caster.streaks = { 1: 1 } -> caster.streaks = { '上海': 1 }

const replacements = [
  // 修复 forEach 调用
  [/caster\.cities\.forEach/g, "Object.values(caster.cities).forEach"],
  [/target\.cities\.forEach/g, "Object.values(target.cities).forEach"],

  // 修复数组索引访问 - caster
  [/caster\.cities\[0\]/g, "caster.cities['北京']"],
  [/caster\.cities\[1\]/g, "caster.cities['上海']"],
  [/caster\.cities\[2\]/g, "caster.cities['广州']"],

  // 修复数组索引访问 - target
  [/target\.cities\[0\]/g, "target.cities['北京']"],
  [/target\.cities\[1\]/g, "target.cities['上海']"],
  [/target\.cities\[2\]/g, "target.cities['广州']"],

  // 修复 streaks 对象的键
  [/caster\.streaks = \{ 1: 1 \}/g, "caster.streaks = { '上海': 1 }"],
  [/caster\.streaks = \{ 0: 1 \}/g, "caster.streaks = { '北京': 1 }"],

  // 修复 roster 数组（如果有的话）
  [/caster\.roster = \[0, 1\]/g, "caster.roster = ['北京', '上海']"],
  [/target\.roster = \[0, 1\]/g, "target.roster = ['北京', '上海']"],
]

replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement)
})

fs.writeFileSync(testFile, content, 'utf8')
console.log('✅ battleSkills.test.js 已修复')
