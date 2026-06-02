#!/usr/bin/env node
/**
 * Project: CityCard
 * File: fix_useGameLogic.js
 * Description: 修复 PlayerModeOnline.vue 中的 cities 数组访问
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

import fs from 'fs';

const filepath = './src/composables/useGameLogic.js';

console.log('开始修复 useGameLogic.js...\n');

let content = fs.readFileSync(filepath, 'utf-8');
const originalContent = content;

// 1. 修复 centerIndex 引用
content = content.replace(/player\.centerIndex/g, 'player.centerCityName');
content = content.replace(/p\.centerIndex/g, 'p.centerCityName');

// 2. 修复 cities[cityIdx] 访问模式
content = content.replace(/player1\.cities\[card\.cityIdx\]/g, 'player1.cities[card.cityName]');
content = content.replace(/player2\.cities\[card\.cityIdx\]/g, 'player2.cities[card.cityName]');
content = content.replace(/attacker\.cities\[card\.cityIdx\]/g, 'attacker.cities[card.cityName]');
content = content.replace(/defender\.cities\[card\.cityIdx\]/g, 'defender.cities[card.cityName]');

// 3. 修复 cityIdx 属性名
content = content.replace(/cityIdx: card\.cityIdx/g, 'cityName: card.cityName');
content = content.replace(/cityIdx: c\.cityIdx/g, 'cityName: c.cityName');

// 4. 修复 setCityKnown 调用（应该传递城市名称而不是索引）
content = content.replace(/gameStore\.setCityKnown\(([^,]+),\s*city\.cityIdx,\s*([^)]+)\)/g,
  'gameStore.setCityKnown($1, city.name, $2)');

// 5. 修复 activatedCitySkills 的键访问（应该使用 cityName）
content = content.replace(/Object\.keys\(state(\d)\.activatedCitySkills\)\.forEach\(cityIdx => \{/g,
  'Object.keys(state$1.activatedCitySkills).forEach(cityName => {');
content = content.replace(/const skillData = state(\d)\.activatedCitySkills\[cityIdx\]/g,
  'const skillData = state$1.activatedCitySkills[cityName]');
content = content.replace(/const actualCity = player(\d)\.cities\[cityIdx\]/g,
  'const actualCity = player$1.cities[cityName]');
content = content.replace(/cityIdx=\$\{cityIdx\}/g, 'cityName=${cityName}');

// 6. 修复 deadCities 相关逻辑（需要存储城市名称而不是索引）
// 这部分比较复杂，需要手动处理

// 7. 修复 cities.indexOf 调用（对象没有 indexOf 方法）
content = content.replace(/player\.cities\.indexOf\(city\)/g,
  'Object.keys(player.cities).indexOf(city.name)');

// 8. 修复 city.cityIdx 引用
content = content.replace(/city\.cityIdx/g, 'city.cityName');
content = content.replace(/c\.cityIdx/g, 'c.cityName');

// 9. 修复 originalCity 访问
content = content.replace(/const originalCity = ([^.]+)\.cities\[city\.cityIdx\]/g,
  'const originalCity = $1.cities[city.cityName]');
content = content.replace(/const originalCity = ([^.]+)\.cities\[cityData\.cityIdx\]/g,
  'const originalCity = $1.cities[cityData.cityName]');

if (content !== originalContent) {
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log('✓ useGameLogic.js 已更新');

  // 统计修改
  const changes = [];
  const centerIndexCount = (originalContent.match(/\.centerIndex/g) || []).length;
  if (centerIndexCount) changes.push(`${centerIndexCount} centerIndex引用`);

  const cityIdxCount = (originalContent.match(/cityIdx/g) || []).length;
  if (cityIdxCount) changes.push(`${cityIdxCount} cityIdx引用`);

  if (changes.length > 0) {
    console.log(`  修复: ${changes.join(', ')}`);
  }
} else {
  console.log('- 无需修改');
}

console.log('\n✓ 完成！');
