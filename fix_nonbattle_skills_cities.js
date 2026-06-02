/**
 * Project: CityCard
 * File: fix_nonbattle_skills_cities.js
 * Description: 修复 nonBattleSkills.js 中的城市访问方式, 从数组方法改为对象方法
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

const skillFile = path.join(__dirname, 'src/composables/skills/nonBattleSkills.js')
let content = fs.readFileSync(skillFile, 'utf8')

// 修复模式：
// 1. caster.cities.forEach -> Object.values(caster.cities).forEach
// 2. caster.cities.find -> Object.values(caster.cities).find
// 3. target.cities.forEach -> Object.values(target.cities).forEach
// 4. target.cities.find -> Object.values(target.cities).find
// 5. player.cities.forEach -> Object.values(player.cities).forEach
// 6. player.cities.find -> Object.values(player.cities).find

const replacements = [
  // forEach 方法
  [/caster\.cities\.forEach/g, "Object.values(caster.cities).forEach"],
  [/target\.cities\.forEach/g, "Object.values(target.cities).forEach"],
  [/player\.cities\.forEach/g, "Object.values(player.cities).forEach"],

  // find 方法
  [/caster\.cities\.find/g, "Object.values(caster.cities).find"],
  [/target\.cities\.find/g, "Object.values(target.cities).find"],
  [/player\.cities\.find/g, "Object.values(player.cities).find"],

  // filter 方法
  [/caster\.cities\.filter/g, "Object.values(caster.cities).filter"],
  [/target\.cities\.filter/g, "Object.values(target.cities).filter"],
  [/player\.cities\.filter/g, "Object.values(player.cities).filter"],

  // some 方法
  [/caster\.cities\.some/g, "Object.values(caster.cities).some"],
  [/target\.cities\.some/g, "Object.values(target.cities).some"],
  [/player\.cities\.some/g, "Object.values(player.cities).some"],

  // every 方法
  [/caster\.cities\.every/g, "Object.values(caster.cities).every"],
  [/target\.cities\.every/g, "Object.values(target.cities).every"],
  [/player\.cities\.every/g, "Object.values(player.cities).every"],
]

replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement)
})

fs.writeFileSync(skillFile, content, 'utf8')
console.log('✅ nonBattleSkills.js 已修复')
