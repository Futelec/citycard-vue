#!/usr/bin/env python3
"""
Project: CityCard
File: fix_non_battle_dual_log.py
Description:
修正 nonBattleSkills.js 中的双日志格式
1. 公开日志开头添加 ${caster.name}
2. 私密日志中 '你' -> '${caster.name}'

Copyright (C) 2026 Futelec. All rights reserved for game assets.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

[SPECIAL NOTICE] The GPLv3 license applies ONLY to the source code of
this file. All game assets (artwork, UI designs, sound, music, and lore)
are EXCLUDED from GPLv3 and are strictly proprietary (All Rights Reserved).

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
"""

import re

filepath = 'src/composables/skills/nonBattleSkills.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 备份
with open(filepath + '.before_fix3', 'w', encoding='utf-8') as f:
    f.write(content)

# 替换私密日志中的 '你'
# 1. '你转账' -> '${caster.name}转账'
content = re.sub(r"'你转账", r"'${caster.name}转账", content)
content = re.sub(r"`你转账", r"`${caster.name}转账", content)

# 2. '你使用了' -> '${caster.name}使用了'
content = re.sub(r"'你使用了", r"'${caster.name}使用了", content)
content = re.sub(r"`你使用了", r"`${caster.name}使用了", content)

# 3. '你对' -> '${caster.name}对'
content = re.sub(r"'你对 ", r"'${caster.name}对 ", content)
content = re.sub(r"`你对 ", r"`${caster.name}对 ", content)

# 修正公开日志 - 在特定模式的开头添加 ${caster.name}
# 模式1: `转账${amount}` -> `${caster.name}转账${amount}`
content = re.sub(
    r"addSkillUsageLog\(\s*gameStore,\s*caster\.name,\s*'转账给他人',\s*`转账",
    r"addSkillUsageLog(\n      gameStore,\n      caster.name,\n      '转账给他人',\n      `${caster.name}转账",
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修正 nonBattleSkills.js 中的双日志格式")
print("   - 私密日志：'你' -> '${caster.name}'")
print("   - 公开日志：添加了 ${caster.name}")
